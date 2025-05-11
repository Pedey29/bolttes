-- Create a table to track user progress through all chapters in guided learning mode
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter_index INTEGER DEFAULT 0,
  current_topic_index INTEGER DEFAULT 0,
  current_step TEXT DEFAULT 'concept', -- 'concept', 'flashcard', 'quiz'
  completed BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure we don't have duplicate entries for the same user
  UNIQUE(user_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS user_learning_progress_user_id_idx ON user_learning_progress(user_id);

-- Add an order column to chapters table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chapters' AND column_name = 'order'
  ) THEN
    ALTER TABLE chapters ADD COLUMN "order" INTEGER DEFAULT 0;
  END IF;
END
$$;
