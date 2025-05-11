"""
Script to extract SIE topics, concepts, flashcards, and questions from the PDF and seed Supabase.
- Uses PyPDF2 and basic parsing for initial version.
- Later, enhance with NLP for better extraction.
- Requires SUPABASE_URL and SUPABASE_SERVICE_KEY as env vars.
"""
import re
import os
import sys
import json
import requests
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PDF_PATH = os.getenv('PDF_PATH', '../../Envelope_-_SIE_Full_Study_Notes_11160351.pdf')

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"PDF_PATH: {PDF_PATH}")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment.")
    sys.exit(1)

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def seed_supabase(table, rows):
    if not rows:
        print(f"No data to seed for table {table}")
        return None
        
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    print(f"Seeding {len(rows)} items to {url}")
    
    try:
        # For bulk inserts, we'll do them in batches of 20
        batch_size = 20
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            print(f"Sending batch {i//batch_size + 1}/{(len(rows)+batch_size-1)//batch_size}")
            resp = requests.post(url, headers=headers, json=batch)
            
            if resp.status_code >= 400:
                print(f"Error response: {resp.status_code}")
                print(f"Response body: {resp.text}")
                resp.raise_for_status()
                
        return True
    except Exception as e:
        print(f"Error seeding {table}: {str(e)}")
        return None

def parse_text_to_topics(text):
    # Look for section headers that are likely to be topics
    topic_pattern = r'(?:Chapter|Section)\s+\d+[.:]\s+(.*?)(?=\n|$)'
    topic_matches = re.finditer(topic_pattern, text)
    
    topics = []
    for match in topic_matches:
        topic_title = match.group(1).strip()
        if topic_title and len(topic_title) > 5:  # Avoid short/invalid matches
            topics.append({
                'title': topic_title,
                'description': f"Learn about {topic_title} for the SIE exam."
            })
    
    # If regex didn't find enough topics, extract major headers
    if len(topics) < 5:
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line and line.isupper() and len(line) > 10 and len(line) < 100:
                # Likely a section header in all caps
                topics.append({
                    'title': line.title(),  # Convert to title case
                    'description': f"Learn about {line.title()} for the SIE exam."
                })
    
    # Remove duplicates based on title
    unique_topics = []
    seen_titles = set()
    for topic in topics:
        if topic['title'] not in seen_titles:
            seen_titles.add(topic['title'])
            unique_topics.append(topic)
    
    return unique_topics[:15]  # Limit to 15 topics

def parse_text_to_concepts(text):
    concepts = []
    
    # Split text into paragraphs
    paragraphs = text.split('\n\n')
    
    # Extract concepts from paragraphs
    for i, para in enumerate(paragraphs):
        if len(para.strip()) > 100 and len(para.strip()) < 1000:
            # Find potential concept titles (shorter, bold/header-like text)
            lines = para.split('\n')
            if len(lines) > 1:
                potential_title = lines[0].strip()
                if 5 < len(potential_title) < 100 and not potential_title.endswith('.'):
                    explanation = '\n'.join(lines[1:]).strip()
                    if len(explanation) > 50:
                        # Assign to topic 1 initially, will be updated later
                        concepts.append({
                            'topic_id': 1,  
                            'title': potential_title,
                            'explanation': explanation,
                            'example': extract_example(text, potential_title)
                        })
    
    return concepts[:50]  # Limit to 50 concepts

def extract_example(text, concept_title):
    # Look for examples related to the concept
    example_pattern = r'(?:Example|For example|For instance)[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)'
    examples = re.findall(example_pattern, text, re.DOTALL)
    
    if examples:
        # Return the first example that's not too long
        for example in examples:
            if 20 < len(example.strip()) < 500:
                return example.strip()
    
    return None  # No suitable example found

def parse_text_to_flashcards(text):
    flashcards = []
    
    # Look for definition-style content
    definition_pattern = r'([A-Z][^.?!:]{5,100}?)(?::|–|-)([^.?!]{10,500}?\.)'
    definitions = re.findall(definition_pattern, text)
    
    for term, definition in definitions:
        term = term.strip()
        definition = definition.strip()
        if term and definition and len(term) < 100 and len(definition) > 20:
            flashcards.append({
                'user_id': None,  # System flashcard, not user-created
                'topic_id': 1,    # Will be updated later
                'question': f"Define: {term}",
                'answer': definition
            })
    
    # Look for question-answer patterns
    qa_pattern = r'(?:Q:|Question:)\s*(.*?)\s*(?:A:|Answer:)\s*(.*?)(?=\n\n|\n[QA]:|$)'
    qa_pairs = re.findall(qa_pattern, text, re.DOTALL)
    
    for question, answer in qa_pairs:
        question = question.strip()
        answer = answer.strip()
        if question and answer and len(question) > 10 and len(answer) > 5:
            flashcards.append({
                'user_id': None,  # System flashcard, not user-created
                'topic_id': 1,    # Will be updated later
                'question': question,
                'answer': answer
            })
    
    return flashcards[:100]  # Limit to 100 flashcards

def parse_text_to_questions(text):
    questions = []
    
    # Look for multiple-choice questions
    mcq_pattern = r'(?:^\d+\.|^[QM]:|Question:)\s*(.*?)\s*(?:Options:|Choices:|A\)|\(A\)|A\.)'
    mcq_matches = re.finditer(mcq_pattern, text, re.MULTILINE | re.DOTALL)
    
    for match in mcq_matches:
        question_text = match.group(1).strip()
        if len(question_text) > 20:
            # Extract the options
            question_pos = match.start()
            next_200_chars = text[question_pos:question_pos + 1000]
            
            options = []
            option_pattern = r'(?:[A-D]\)|[A-D]\.|[A-D]:)\s*(.*?)(?=\n[A-D]\)|\n[A-D]\.|\n[A-D]:|\n\n|$)'
            option_matches = re.findall(option_pattern, next_200_chars)
            
            if len(option_matches) >= 3:  # At least 3 options for a valid MCQ
                options = [opt.strip() for opt in option_matches[:4]]  # Limit to 4 options
                
                # Try to find the correct answer
                correct_option = 0  # Default to A
                answer_pattern = r'(?:Answer:|Correct:)\s*([A-D])'
                answer_match = re.search(answer_pattern, next_200_chars)
                if answer_match:
                    correct_letter = answer_match.group(1)
                    correct_option = ord(correct_letter) - ord('A')
                
                # Extract explanation if available
                explanation = None
                explanation_pattern = r'(?:Explanation:|Rationale:)\s*(.*?)(?=\n\n|$)'
                explanation_match = re.search(explanation_pattern, next_200_chars, re.DOTALL)
                if explanation_match:
                    explanation = explanation_match.group(1).strip()
                
                questions.append({
                    'topic_id': 1,  # Will be updated later
                    'question': question_text,
                    'options': options,
                    'correct_option': correct_option,
                    'explanation': explanation
                })
    
    # If we didn't find enough MCQs, create some from the content
    if len(questions) < 20:
        # Find important statements that could be turned into questions
        statement_pattern = r'([A-Z][^.?!]{20,200}?\.)'
        statements = re.findall(statement_pattern, text)
        
        for statement in statements[:30]:  # Limit to 30 potential questions
            # Convert statement to question
            question_text = f"Which of the following statements is true about the SIE exam?"
            
            # Create options (1 correct, 3 modified to be incorrect)
            correct_statement = statement.strip()
            
            # Create incorrect options by modifying the correct statement
            incorrect1 = re.sub(r'\b(is|are|was|were|will|should|must|can|may)\b', 
                              lambda m: {'is': 'is not', 'are': 'are not', 'was': 'was not', 
                                        'were': 'were not', 'will': 'will not', 'should': 'should not',
                                        'must': 'must not', 'can': 'cannot', 'may': 'may not'}.get(m.group(1), m.group(1)), 
                              correct_statement)
            
            incorrect2 = "The SIE exam does not cover " + re.sub(r'^The SIE exam covers ', '', correct_statement, flags=re.IGNORECASE)
            
            incorrect3 = "It is false that " + correct_statement.lower()
            
            options = [correct_statement, incorrect1, incorrect2, incorrect3]
            
            questions.append({
                'topic_id': 1,  # Will be updated later
                'question': question_text,
                'options': options,
                'correct_option': 0,  # The first option is correct
                'explanation': f"The correct statement is: {correct_statement}"
            })
    
    return questions[:50]  # Limit to 50 questions

def main():
    print("Extracting text from PDF...")
    text = extract_text_from_pdf(PDF_PATH)

    topics = parse_text_to_topics(text)
    if topics:
        print(f"Seeding {len(topics)} topics...")
        seed_supabase('topics', topics)

    concepts = parse_text_to_concepts(text)
    if concepts:
        print(f"Seeding {len(concepts)} concepts...")
        seed_supabase('concepts', concepts)

    flashcards = parse_text_to_flashcards(text)
    if flashcards:
        print(f"Seeding {len(flashcards)} flashcards...")
        seed_supabase('flashcards', flashcards)

    questions = parse_text_to_questions(text)
    if questions:
        print(f"Seeding {len(questions)} questions...")
        seed_supabase('questions', questions)

    print("Seeding complete. Check Supabase for seeded data.")

if __name__ == "__main__":
    main()
