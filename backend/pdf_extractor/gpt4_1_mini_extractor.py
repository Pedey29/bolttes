"""
Enhanced SIE Exam Content Generator using GPT-4.1-mini

This script extracts content from SIE exam study materials and uses OpenAI's GPT-4.1-mini-2025-04-14 model
to generate high-quality topics, concepts, flashcards, and quiz questions for the SIE Exam Prep app.

Features:
- Extracts text from PDF study materials
- Uses GPT-4.1-mini-2025-04-14 API to generate well-structured content
- Creates proper multiple-choice questions with distractors
- Organizes topics according to SIE exam outline
- Seeds generated content to Supabase database

Requirements:
- OpenAI API key
- Supabase credentials
- SIE exam study PDF
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
print(f"Using OpenAI API key: {OPENAI_API_KEY[:8]}...")
# Create client with the latest OpenAI library
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Validate environment variables
if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY]):
    print("Error: Missing required environment variables.")
    print("Please set SUPABASE_URL, SUPABASE_SERVICE_KEY, and OPENAI_API_KEY in your .env file.")
    sys.exit(1)

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"PDF_PATH: {PDF_PATH}")
print(f"OPENAI_API_KEY configured: {'Yes' if OPENAI_API_KEY else 'No'}")

# SIE exam main topics based on FINRA outline
SIE_MAIN_TOPICS = [
    "Knowledge of Capital Markets",
    "Understanding Products and their Risks",
    "Understanding Trading, Customer Accounts and Prohibited Activities",
    "Overview of Regulatory Framework"
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

def get_topics_from_openai(text_chunks):
    """Generate SIE exam topics using GPT-4.1-mini-2025-04-14."""
    print("Generating topics using GPT-4.1-mini-2025-04-14...")
    
    # First, create a summary of the document
    summary_prompt = f"""
    You are an expert in the Securities Industry Essentials (SIE) exam. 
    Analyze the following text from SIE exam study materials and identify the main topics covered.
    
    Your task is to:
    1. Identify the main topics that align with the SIE exam outline
    2. For each topic, provide a clear, concise title and description
    
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
        
        # Now generate structured topics based on the summary and SIE outline
        topics_prompt = f"""
        Based on the SIE exam outline, generate 10-15 main topics that would be covered in the SIE exam.
        
        The SIE exam covers these main areas:
        1. Knowledge of Capital Markets
        2. Understanding Products and their Risks
        3. Understanding Trading, Customer Accounts and Prohibited Activities
        4. Overview of Regulatory Framework
        
        For each topic, provide:
        1. A clear, concise title
        2. A brief description (1-2 sentences)
        
        Format the response as a JSON array of objects with 'title' and 'description' fields.
        
        Document summary:
        {summary}
        """
        
        response = client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": "You are an expert in financial securities and the SIE exam."},
                {"role": "user", "content": topics_prompt}
            ],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures the model might return
        if isinstance(result, dict) and "topics" in result:
            return result["topics"]
        elif isinstance(result, list):
            return result
        else:
            print("Unexpected JSON structure from GPT-4.1-mini-2025-04-14. Using default topics.")
            return [{"title": topic, "description": f"Learn about {topic} for the SIE exam."} for topic in SIE_MAIN_TOPICS]
        
    except Exception as e:
        print(f"Error generating topics with GPT-4.1-mini-2025-04-14: {str(e)}")
        # Fallback to basic topics if OpenAI fails
        return [{"title": topic, "description": f"Learn about {topic} for the SIE exam."} for topic in SIE_MAIN_TOPICS]

def get_concepts_for_topic(topic, text_chunks):
    """Generate concepts for a specific topic using GPT-4.1-mini-2025-04-14."""
    print(f"Generating concepts for topic: {topic['title']}...")
    
    # Combine chunks for better context
    combined_text = "\n".join(text_chunks[:3])  # Use first 3 chunks for context
    
    concepts_prompt = f"""
    You are an expert in the Securities Industry Essentials (SIE) exam.
    
    Generate 5-8 key concepts related to the topic: "{topic['title']}"
    
    For each concept, provide:
    1. A clear, concise title
    2. A detailed explanation (3-5 sentences)
    3. An example that illustrates the concept (if applicable)
    
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
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures the model might return
        if isinstance(result, dict) and "concepts" in result:
            concepts = result["concepts"]
        elif isinstance(result, list):
            concepts = result
        else:
            print(f"Unexpected JSON structure from GPT-4.1-mini-2025-04-14 for topic {topic['title']}. Using fallback concept.")
            concepts = [{
                'title': f"Basic {topic['title']}",
                'explanation': f"Basic explanation of {topic['title']} for the SIE exam.",
                'example': f"Example of {topic['title']} in practice."
            }]
        
        # Add topic_id to each concept
        for concept in concepts:
            concept['topic_id'] = topic.get('id', 1)  # Default to 1 if no ID yet
            
        return concepts
        
    except Exception as e:
        print(f"Error generating concepts with GPT-4.1-mini-2025-04-14: {str(e)}")
        # Return a simple fallback concept
        return [{
            'topic_id': topic.get('id', 1),
            'title': f"Basic {topic['title']}",
            'explanation': f"Basic explanation of {topic['title']} for the SIE exam.",
            'example': f"Example of {topic['title']} in practice."
        }]

def generate_flashcards(topics, concepts, text_chunks):
    """Generate flashcards for SIE exam topics using GPT-4.1-mini-2025-04-14."""
    print("Generating flashcards using GPT-4.1-mini-2025-04-14...")
    
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
        
        For each flashcard, provide:
        1. A clear term/question for the front of the card
        2. A concise, accurate definition/answer for the back of the card
        
        Make sure the flashcards cover key terms, concepts, and regulations that are important for the SIE exam.
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
                print(f"Unexpected JSON structure from GPT-4.1-mini-2025-04-14 for flashcards on topic {topic['title']}. Skipping.")
                continue
            
            # Add topic_id to each flashcard
            for flashcard in flashcards:
                flashcard['topic_id'] = topic.get('id', 1)
                
            all_flashcards.extend(flashcards)
            
            # Avoid rate limiting
            time.sleep(1)
            
        except Exception as e:
            print(f"Error generating flashcards with GPT-4.1-mini-2025-04-14 for topic {topic['title']}: {str(e)}")
    
    return all_flashcards

def generate_quiz_questions(topics, concepts, text_chunks):
    """Generate quiz questions for SIE exam topics using GPT-4.1-mini-2025-04-14."""
    print("Generating quiz questions using GPT-4.1-mini-2025-04-14...")
    
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
        
        Generate 5-7 high-quality multiple-choice questions for the topic: "{topic['title']}"
        
        For each question:
        1. Write a clear, concise question stem
        2. Provide exactly 4 options (A, B, C, D)
        3. Indicate which option is correct (0-based index: 0=A, 1=B, 2=C, 3=D)
        4. Include a brief explanation of why the correct answer is right
        
        Guidelines:
        - Questions should test understanding, not just memorization
        - Distractors (wrong answers) should be plausible
        - Avoid "all/none of the above" options
        - Make sure questions are relevant to the SIE exam
        
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
                max_tokens=2500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Handle different JSON structures the model might return
            if isinstance(result, dict) and "questions" in result:
                questions = result["questions"]
            elif isinstance(result, list):
                questions = result
            else:
                print(f"Unexpected JSON structure from GPT-4.1-mini-2025-04-14 for questions on topic {topic['title']}. Skipping.")
                continue
            
            # Add topic_id to each question
            for question in questions:
                question['topic_id'] = topic.get('id', 1)
                
            all_questions.extend(questions)
            
            # Avoid rate limiting
            time.sleep(1)
            
        except Exception as e:
            print(f"Error generating questions with GPT-4.1-mini-2025-04-14 for topic {topic['title']}: {str(e)}")
    
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

def main():
    """Main function to extract content and seed database."""
    print("Starting enhanced SIE exam content extraction and generation with GPT-4.1-mini-2025-04-14...")
    
    # Extract text from PDF
    text = extract_text_from_pdf(PDF_PATH)
    
    # Chunk the text for processing
    text_chunks = chunk_text(text)
    print(f"Split text into {len(text_chunks)} chunks for processing")
    
    # Generate topics
    topics = get_topics_from_openai(text_chunks)
    print(f"Generated {len(topics)} topics")
    
    # Seed topics to Supabase
    if seed_supabase('topics', topics):
        # Get the actual topic IDs from Supabase
        topics = update_topic_ids(topics, SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Generate concepts for each topic
    all_concepts = []
    for topic in topics:
        concepts = get_concepts_for_topic(topic, text_chunks)
        all_concepts.extend(concepts)
        # Avoid rate limiting
        time.sleep(1)
    
    print(f"Generated {len(all_concepts)} concepts")
    
    # Seed concepts to Supabase
    seed_supabase('concepts', all_concepts)
    
    # Generate flashcards
    flashcards = generate_flashcards(topics, all_concepts, text_chunks)
    print(f"Generated {len(flashcards)} flashcards")
    
    # Seed flashcards to Supabase
    seed_supabase('flashcards', flashcards)
    
    # Generate quiz questions
    questions = generate_quiz_questions(topics, all_concepts, text_chunks)
    print(f"Generated {len(questions)} quiz questions")
    
    # Seed questions to Supabase
    seed_supabase('questions', questions)
    
    print("Content generation and seeding complete!")

if __name__ == "__main__":
    main()
