# SIE Exam Prep App - Backend

This folder contains the backend components for the SIE Exam Prep App:

1. **PDF Extractor**: Scripts to extract content from the SIE exam study notes PDF and seed Supabase.
2. **Supabase Schema**: SQL files for setting up the database schema.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in.
2. Create a new project.
3. Note your Supabase URL and anon key (for the mobile app) and service key (for the backend scripts).

### 2. Set Up the Database Schema

1. In your Supabase project, go to the SQL Editor.
2. Copy the contents of `supabase_schema/sie_schema.sql`.
3. Run the SQL to create all necessary tables.

### 3. Extract and Seed Content

1. Install the required Python packages:
   ```
   cd backend/pdf_extractor
   pip install -r requirements.txt
   ```

2. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

3. Edit the `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   PDF_PATH=../../Envelope_-_SIE_Full_Study_Notes_11160351.pdf
   ```

4. Run the extraction and seeding script:
   ```
   python extract_and_seed.py
   ```

5. Verify the data in your Supabase tables.

## Troubleshooting

- If the PDF extraction doesn't yield good results, you may need to adjust the regex patterns in the extraction script.
- If you encounter errors connecting to Supabase, double-check your credentials and ensure your IP is allowed in Supabase's policies.
