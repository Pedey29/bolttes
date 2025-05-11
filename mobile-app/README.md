# SIE Exam Prep App - Mobile App

This folder contains the React Native (Expo) mobile app for the SIE Exam Prep platform.

## Features

- **User Authentication**: Sign up, login, and profile management
- **Gamification**: XP points and streak tracking for consistent study habits
- **Flashcards**: Create, review, and customize flashcards for SIE exam topics
- **Quizzes**: Multiple-choice questions with explanations and scoring
- **Learning Concepts**: Structured breakdown of SIE exam topics and concepts

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile-app
npm install
# or
yarn install
```

### 2. Configure Supabase

1. Open `utils/supabase.js` and update with your Supabase credentials:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

### 3. Start the Development Server

```bash
npm start
# or
yarn start
```

This will start the Expo development server. You can run the app on:
- iOS Simulator
- Android Emulator
- Physical device using the Expo Go app

## Project Structure

- `screens/`: Main app screens (Login, Dashboard, Flashcards, Quiz, Concepts)
- `components/`: Reusable UI components
- `utils/`: Utility functions and Supabase client
- `assets/`: Images, fonts, and other static assets

## Building for Production

To create a standalone app for distribution:

```bash
# For Android
expo build:android

# For iOS
expo build:ios
```

## Troubleshooting

- If you encounter issues with Supabase authentication, ensure your project has the correct auth settings enabled.
- For styling issues, check the device compatibility in the Expo documentation.
