-- Create a table to track user progress across all study materials
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'flashcard', 'quiz', 'concept'
  content_id UUID NOT NULL,
  mastered BOOLEAN DEFAULT FALSE,
  last_studied TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure we don't have duplicate entries for the same content
  UNIQUE(user_id, content_type, content_id)
);

-- Add an index for faster queries
CREATE INDEX IF NOT EXISTS study_progress_user_id_idx ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS study_progress_topic_id_idx ON study_progress(topic_id);

-- Add a new column to profiles table to track overall progress
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS overall_progress JSONB DEFAULT '{"flashcards": 0, "quizzes": 0, "concepts": 0, "total": 0}'::JSONB;
