"""
Enhanced SIE Exam Content Generator with Improved Quality and Organization

This script extracts content from SIE exam study materials and uses OpenAI's GPT-4.1-mini-2025-04-14 model
to generate high-quality, well-structured content for the SIE Exam Prep app.

Improvements:
- Organizes content into logical chapters for easier navigation
- Generates detailed, specific explanations for concepts (no generic placeholders)
- Creates concrete, relevant examples for each concept
- Produces high-quality flashcards with clear terms and definitions
- Generates challenging multiple-choice questions that test understanding
"""

import os
import sys
import json
import time
import re
from tqdm import tqdm
import requests
import random
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
PDF_PATH = os.getenv('PDF_PATH', '../../Envelope_-_SIE_Full_Study_Notes_11160351.pdf')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize OpenAI client
print(f"Using OpenAI API key: {OPENAI_API_KEY[:8]}..." if OPENAI_API_KEY else "No OpenAI API key found")
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Validate environment variables
if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY]):
    print("Error: Missing required environment variables.")
    print("Please set SUPABASE_URL, SUPABASE_SERVICE_KEY, and OPENAI_API_KEY in your .env file.")
    sys.exit(1)

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"PDF_PATH: {PDF_PATH}")
print(f"OPENAI_API_KEY configured: {'Yes' if OPENAI_API_KEY else 'No'}")

# SIE exam chapters based on FINRA outline - organized for better UX
SIE_CHAPTERS = [
    {
        "title": "Chapter 1: Capital Markets Overview",
        "description": "Introduction to financial markets, their structure, and function",
        "topics": ["Market Structure", "Economic Factors", "Securities Markets", "Offering Process"]
    },
    {
        "title": "Chapter 2: Securities Products",
        "description": "Understanding different types of securities and their characteristics",
        "topics": ["Equity Securities", "Debt Securities", "Options", "Investment Companies", "Direct Participation Programs"]
    },
    {
        "title": "Chapter 3: Trading and Settlement",
        "description": "How securities are traded, cleared, and settled",
        "topics": ["Trading Mechanisms", "Trade Settlement", "Corporate Actions", "Margin Requirements"]
    },
    {
        "title": "Chapter 4: Customer Accounts",
        "description": "Types of accounts and their characteristics",
        "topics": ["Account Types", "Account Documentation", "Tax Considerations", "SIPC Protection"]
    },
    {
        "title": "Chapter 5: Regulatory Framework",
        "description": "Securities laws, regulations, and regulatory organizations",
        "topics": ["Securities Acts", "Self-Regulatory Organizations", "Registration Requirements", "Continuing Education"]
    },
    {
        "title": "Chapter 6: Business Conduct",
        "description": "Ethical standards and prohibited activities",
        "topics": ["Communications with the Public", "Conflicts of Interest", "Prohibited Activities", "Anti-Money Laundering"]
    }
]

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        print(f"Extracting text from {len(reader.pages)} pages...")
        for i, page in enumerate(tqdm(reader.pages, desc="Extracting PDF")):
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        sys.exit(1)

def chunk_text(text, chunk_size=4000, overlap=200):
    """Split text into overlapping chunks for processing."""
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        if end < text_length:
            # Find the last period or newline to make a clean break
            last_period = text.rfind('.', start, end)
            last_newline = text.rfind('\n', start, end)
            break_point = max(last_period, last_newline)
            if break_point > start + chunk_size // 2:  # Ensure chunk isn't too small
                end = break_point + 1
        
        chunks.append(text[start:end])
        start = end - overlap if end < text_length else text_length
    
    return chunks

def seed_supabase(table, rows):
    """Seed data to Supabase table."""
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

def generate_chapters_and_topics(text_chunks):
    """Generate SIE exam chapters and topics with improved organization."""
    print("Generating chapters and topics with improved organization...")
    
    # First, create a summary of the document
    summary_prompt = f"""
    You are an expert in the Securities Industry Essentials (SIE) exam. 
    Analyze the following text from SIE exam study materials and identify the main topics covered.
    
    Your task is to:
    1. Identify the main topics that align with the SIE exam outline
    2. For each topic, provide a clear, concise title and detailed description
    3. Group topics into logical chapters for easier navigation
    
    Text from study materials:
    {text_chunks[0][:2000]}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                {"role": "user", "content": summary_prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        summary = response.choices[0].message.content
        
        # Now generate structured chapters and topics based on the summary and SIE outline
        chapters_prompt = f"""
        Based on the SIE exam outline, generate 6 logical chapters that cover the SIE exam content.
        Each chapter should contain 4-5 related topics.
        
        For each chapter, provide:
        1. A clear, descriptive title (e.g., "Chapter 1: Capital Markets Overview")
        2. A concise description of what the chapter covers
        3. 4-5 topics that belong in this chapter
        
        For each topic, provide:
        1. A clear, specific title
        2. A detailed description (2-3 sentences) explaining the importance of this topic for the SIE exam
        
        Format the response as a JSON array of chapter objects, each with:
        - "title": chapter title
        - "description": chapter description
        - "topics": array of topic objects, each with "title" and "description"
        
        Document summary:
        {summary}
        
        Ensure all content is specific, detailed, and avoids generic placeholders.
        """
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                {"role": "user", "content": chapters_prompt}
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures the model might return
        if isinstance(result, dict) and "chapters" in result:
            return result["chapters"]
        elif isinstance(result, list):
            return result
        else:
            print("Unexpected JSON structure from GPT-4.1-mini. Using default chapters.")
            return SIE_CHAPTERS
        
    except Exception as e:
        print(f"Error generating chapters and topics: {str(e)}")
        # Fallback to basic chapters if OpenAI fails
        return SIE_CHAPTERS

def generate_concepts_for_topic(topic, text_chunks):
    """Generate detailed concepts for a specific topic with improved quality."""
    print(f"Generating detailed concepts for topic: {topic['title']}...")
    
    # Combine chunks for better context
    combined_text = "\n".join(text_chunks[:3])  # Use first 3 chunks for context
    
    concepts_prompt = f"""
    You are an expert in the Securities Industry Essentials (SIE) exam.
    
    Generate 5-7 key concepts related to the topic: "{topic['title']}"
    
    For each concept, provide:
    1. A clear, specific title that identifies the concept precisely
    2. A detailed explanation (4-6 sentences) that thoroughly explains the concept
    3. A concrete, relevant example that illustrates the concept in a real-world financial context
    
    IMPORTANT: 
    - Avoid generic explanations like "Basic explanation of X for the SIE exam"
    - Provide specific, detailed content that demonstrates deep understanding
    - Include relevant terminology, definitions, and regulations where appropriate
    - Make sure examples are concrete and illustrate practical applications
    
    Format the response as a JSON array of objects with 'title', 'explanation', and 'example' fields.
    
    Use this study material as a reference:
    {combined_text[:4000]}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                {"role": "user", "content": concepts_prompt}
            ],
            temperature=0.3,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures the model might return
        if isinstance(result, dict) and "concepts" in result:
            concepts = result["concepts"]
        elif isinstance(result, list):
            concepts = result
        else:
            print(f"Unexpected JSON structure from GPT-4.1-mini for topic {topic['title']}. Using fallback concept.")
            concepts = [{
                'title': f"Understanding {topic['title']}",
                'explanation': f"This concept covers the fundamental principles of {topic['title']} as tested on the SIE exam. It includes key definitions, regulatory requirements, and market practices that candidates must understand to successfully answer exam questions.",
                'example': f"For example, when dealing with {topic['title']}, a registered representative must consider factors such as suitability, disclosure requirements, and potential conflicts of interest."
            }]
        
        # Add topic_id to each concept
        for concept in concepts:
            concept['topic_id'] = topic.get('id', 1)  # Default to 1 if no ID yet
            
        return concepts
        
    except Exception as e:
        print(f"Error generating concepts: {str(e)}")
        # Return a more detailed fallback concept
        return [{
            'topic_id': topic.get('id', 1),
            'title': f"Understanding {topic['title']}",
            'explanation': f"This concept covers the fundamental principles of {topic['title']} as tested on the SIE exam. It includes key definitions, regulatory requirements, and market practices that candidates must understand to successfully answer exam questions.",
            'example': f"For example, when dealing with {topic['title']}, a registered representative must consider factors such as suitability, disclosure requirements, and potential conflicts of interest."
        }]

def generate_flashcards(topics, concepts, text_chunks):
    """Generate high-quality flashcards for SIE exam topics."""
    print("Generating improved flashcards...")
    
    all_flashcards = []
    
    # Generate flashcards for each topic
    for topic in topics:
        topic_concepts = [c for c in concepts if c.get('topic_id') == topic.get('id', 1)]
        
        # If we have concepts for this topic, use them for context
        context = "\n".join([f"{c['title']}: {c['explanation']}" for c in topic_concepts[:3]])
        
        # If we don't have enough context, use the text chunks
        if len(context) < 500:
            context = text_chunks[0][:3000]
        
        flashcards_prompt = f"""
        You are an expert in creating effective flashcards for the Securities Industry Essentials (SIE) exam.
        
        Generate 8-10 high-quality flashcards for the topic: "{topic['title']}"
        
        For each flashcard:
        1. Front: Create a clear, specific term or question
        2. Back: Provide a concise but comprehensive definition or answer
        
        IMPORTANT:
        - Ensure each flashcard covers a specific, testable concept
        - Definitions should be precise and complete
        - Avoid vague or generic content
        - Include important terminology, formulas, and regulations
        - Make sure the content is accurate and relevant to the SIE exam
        
        Format the response as a JSON array of objects with 'front' and 'back' fields.
        
        Topic description: {topic['description']}
        
        Related concepts:
        {context}
        """
        
        try:
            response = client.chat.completions.create(
                model="gpt-4.1-mini-2025-04-14",
                messages=[
                    {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                    {"role": "user", "content": flashcards_prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Handle different JSON structures the model might return
            if isinstance(result, dict) and "flashcards" in result:
                flashcards = result["flashcards"]
            elif isinstance(result, list):
                flashcards = result
            else:
                print(f"Unexpected JSON structure for flashcards on topic {topic['title']}. Skipping.")
                continue
            
            # Add topic_id to each flashcard
            for flashcard in flashcards:
                flashcard['topic_id'] = topic.get('id', 1)
                
            all_flashcards.extend(flashcards)
            
            # Avoid rate limiting
            time.sleep(1)
            
        except Exception as e:
            print(f"Error generating flashcards for topic {topic['title']}: {str(e)}")
    
    return all_flashcards

def generate_quiz_questions(topics, concepts, text_chunks):
    """Generate high-quality quiz questions for SIE exam topics."""
    print("Generating improved quiz questions...")
    
    all_questions = []
    
    # Generate questions for each topic
    for topic in topics:
        topic_concepts = [c for c in concepts if c.get('topic_id') == topic.get('id', 1)]
        
        # If we have concepts for this topic, use them for context
        context = "\n".join([f"{c['title']}: {c['explanation']}" for c in topic_concepts[:3]])
        
        # If we don't have enough context, use the text chunks
        if len(context) < 500:
            context = text_chunks[0][:3000]
        
        questions_prompt = f"""
        You are an expert in creating effective multiple-choice questions for the Securities Industry Essentials (SIE) exam.
        
        Generate 5-7 challenging multiple-choice questions for the topic: "{topic['title']}"
        
        For each question:
        1. Write a clear, specific question stem that tests understanding (not just memorization)
        2. Provide exactly 4 options (A, B, C, D)
        3. Indicate which option is correct (0-based index: 0=A, 1=B, 2=C, 3=D)
        4. Include a detailed explanation of why the correct answer is right and why the others are wrong
        
        IMPORTANT:
        - Questions should test understanding and application, not just recall
        - Distractors (wrong answers) should be plausible and based on common misconceptions
        - Avoid "all/none of the above" options
        - Ensure questions reflect the actual difficulty level of the SIE exam
        - Cover different cognitive levels (knowledge, application, analysis)
        
        Format the response as a JSON array of objects with 'question', 'options' (array), 'correct_option' (number 0-3), and 'explanation' fields.
        
        Topic description: {topic['description']}
        
        Related concepts:
        {context}
        """
        
        try:
            response = client.chat.completions.create(
                model="gpt-4.1-mini-2025-04-14",
                messages=[
                    {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                    {"role": "user", "content": questions_prompt}
                ],
                temperature=0.3,
                max_tokens=2500
                # Removed response_format to allow more flexible responses
            )
            
            # Safely parse the JSON response
            try:
                content = response.choices[0].message.content
                # Clean up the content in case it has markdown or extra text
                if '```json' in content:
                    content = content.split('```json')[1].split('```')[0].strip()
                elif '```' in content:
                    content = content.split('```')[1].split('```')[0].strip()
                
                result = json.loads(content)
                
                # Handle different JSON structures the model might return
                if isinstance(result, dict) and "questions" in result:
                    questions = result["questions"]
                elif isinstance(result, list):
                    questions = result
                else:
                    print(f"Unexpected JSON structure for questions on topic {topic['title']}.")
                    print(f"Raw content: {content[:100]}...")
                    # Try to extract any questions array from the result
                    questions = []
                    for key, value in result.items():
                        if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict) and 'question' in value[0]:
                            questions = value
                            break
                    
                    if not questions:
                        print("Could not find questions in response. Skipping.")
                        continue
            except json.JSONDecodeError as je:
                print(f"JSON decode error for topic {topic['title']}: {str(je)}")
                print(f"Raw content: {response.choices[0].message.content[:100]}...")
                continue
            
            # Add topic_id to each question
            for question in questions:
                question['topic_id'] = topic.get('id', 1)
                
            all_questions.extend(questions)
            
            # Avoid rate limiting
            time.sleep(1)
            
        except Exception as e:
            print(f"Error generating questions for topic {topic['title']}: {str(e)}")
    
    return all_questions

def update_topic_ids(topics, supabase_url, service_key):
    """Get the actual topic IDs from Supabase after seeding."""
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}'
    }
    
    url = f"{supabase_url}/rest/v1/topics?select=id,title"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        db_topics = response.json()
        
        # Create a mapping of title to ID
        title_to_id = {topic['title']: topic['id'] for topic in db_topics}
        
        # Update our topics with the correct IDs
        for topic in topics:
            if topic['title'] in title_to_id:
                topic['id'] = title_to_id[topic['title']]
                
        return topics
        
    except Exception as e:
        print(f"Error fetching topic IDs: {str(e)}")
        return topics

def update_chapter_structure(chapters, topics):
    """Update the chapter structure with the actual topic IDs."""
    # Create a mapping of topic title to topic object
    topic_map = {topic['title']: topic for topic in topics}
    
    # Update each chapter with the actual topic objects
    for chapter in chapters:
        chapter_topics = []
        for topic_title in chapter.get('topics', []):
            if isinstance(topic_title, str) and topic_title in topic_map:
                chapter_topics.append(topic_map[topic_title])
            elif isinstance(topic_title, dict) and topic_title.get('title') in topic_map:
                chapter_topics.append(topic_map[topic_title['title']])
        
        chapter['topics'] = chapter_topics
        
    return chapters

def seed_chapters(chapters):
    """Seed chapters to Supabase."""
    # Prepare chapters for seeding (remove topics array which will be handled separately)
    chapters_to_seed = []
    for chapter in chapters:
        chapter_copy = chapter.copy()
        if 'topics' in chapter_copy:
            del chapter_copy['topics']
        chapters_to_seed.append(chapter_copy)
    
    return seed_supabase('chapters', chapters_to_seed)

def seed_chapter_topics(chapters, topics):
    """Seed chapter-topic relationships to Supabase."""
    chapter_topics = []
    
    # Get chapter IDs from Supabase
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    
    url = f"{SUPABASE_URL}/rest/v1/chapters?select=id,title"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        db_chapters = response.json()
        
        # Create a mapping of title to ID
        chapter_title_to_id = {chapter['title']: chapter['id'] for chapter in db_chapters}
        
        # Create chapter-topic relationships
        for chapter in chapters:
            if chapter['title'] in chapter_title_to_id:
                chapter_id = chapter_title_to_id[chapter['title']]
                for topic in chapter.get('topics', []):
                    if isinstance(topic, dict) and 'id' in topic:
                        chapter_topics.append({
                            'chapter_id': chapter_id,
                            'topic_id': topic['id']
                        })
        
        return seed_supabase('chapter_topics', chapter_topics)
        
    except Exception as e:
        print(f"Error seeding chapter-topic relationships: {str(e)}")
        return None

def main():
    """Main function to extract content and seed database with improved organization and quality."""
    print("Starting enhanced SIE exam content extraction with improved quality and organization...")
    
    # Extract text from PDF
    text = extract_text_from_pdf(PDF_PATH)
    
    # Chunk the text for processing
    text_chunks = chunk_text(text)
    print(f"Split text into {len(text_chunks)} chunks for processing")
    
    # Generate chapters and topics with improved organization
    chapters = generate_chapters_and_topics(text_chunks)
    print(f"Generated {len(chapters)} chapters")
    
    # Extract topics from chapters
    topics = []
    for chapter in chapters:
        if isinstance(chapter.get('topics'), list):
            for topic in chapter['topics']:
                if isinstance(topic, dict):
                    topics.append(topic)
                elif isinstance(topic, str):
                    topics.append({"title": topic, "description": f"Learn about {topic} for the SIE exam."})
    
    print(f"Extracted {len(topics)} topics from chapters")
    
    # Seed topics to Supabase
    if seed_supabase('topics', topics):
        # Get the actual topic IDs from Supabase
        topics = update_topic_ids(topics, SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Update chapter structure with actual topic IDs
    chapters = update_chapter_structure(chapters, topics)
    
    # Seed chapters to Supabase
    seed_chapters(chapters)
    
    # Seed chapter-topic relationships
    seed_chapter_topics(chapters, topics)
    
    # Generate detailed concepts for each topic
    all_concepts = []
    for topic in topics:
        concepts = generate_concepts_for_topic(topic, text_chunks)
        all_concepts.extend(concepts)
        # Avoid rate limiting
        time.sleep(1)
    
    print(f"Generated {len(all_concepts)} detailed concepts")
    
    # Seed concepts to Supabase
    seed_supabase('concepts', all_concepts)
    
    # Generate high-quality flashcards
    flashcards = generate_flashcards(topics, all_concepts, text_chunks)
    print(f"Generated {len(flashcards)} high-quality flashcards")
    
    # Seed flashcards to Supabase
    seed_supabase('flashcards', flashcards)
    
    # Generate challenging quiz questions
    questions = generate_quiz_questions(topics, all_concepts, text_chunks)
    print(f"Generated {len(questions)} challenging quiz questions")
    
    # Seed questions to Supabase
    seed_supabase('questions', questions)
    
    print("Content generation and seeding complete with improved quality and organization!")

if __name__ == "__main__":
    main()
