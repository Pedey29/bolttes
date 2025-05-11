-- Create a table to track user progress through chapters in guided learning mode
CREATE TABLE IF NOT EXISTS user_chapter_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  current_topic_index INTEGER DEFAULT 0,
  current_step TEXT DEFAULT 'concept', -- 'concept', 'flashcard', 'quiz'
  completed BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure we don't have duplicate entries for the same user and chapter
  UNIQUE(user_id, chapter_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS user_chapter_progress_user_id_idx ON user_chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS user_chapter_progress_chapter_id_idx ON user_chapter_progress(chapter_id);

-- Add an order column to chapter_topics table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chapter_topics' AND column_name = 'order'
  ) THEN
    ALTER TABLE chapter_topics ADD COLUMN "order" INTEGER DEFAULT 0;
  END IF;
END
$$;
