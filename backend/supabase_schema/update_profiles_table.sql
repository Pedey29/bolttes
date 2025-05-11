-- Add new columns to the profiles table for the Profile page
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS exam_date DATE,
ADD COLUMN IF NOT EXISTS study_goal INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add a comment to explain the purpose of the migration
COMMENT ON TABLE profiles IS 'User profiles with extended fields for SIE Exam Prep app';
