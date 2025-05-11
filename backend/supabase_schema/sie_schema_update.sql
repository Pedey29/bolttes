-- SIE Exam Prep App Schema Update
-- This script updates the schema to support chapter-based organization and removes user-created flashcards

-- First, delete existing data for a clean refresh
DELETE FROM quiz_attempts;
DELETE FROM questions;
DELETE FROM flashcards;
DELETE FROM concepts;
DELETE FROM topics;

-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT
);

-- Create chapter_topics table to link chapters and topics
CREATE TABLE IF NOT EXISTS chapter_topics (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    UNIQUE(chapter_id, topic_id)
);

-- Modify flashcards table to remove user-created functionality
-- First, drop existing table
DROP TABLE IF EXISTS flashcards CASCADE;

-- Recreate flashcards table without user_id
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Modify questions table to improve quiz quality
-- First, drop existing table
DROP TABLE IF EXISTS questions CASCADE;

-- Recreate questions table with improved structure
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_title ON topics(title);
CREATE INDEX IF NOT EXISTS idx_chapters_title ON chapters(title);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON flashcards(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_concepts_topic_id ON concepts(topic_id);
CREATE INDEX IF NOT EXISTS idx_chapter_topics_chapter_id ON chapter_topics(chapter_id);
