-- Supabase schema for SIE Exam Prep App

-- Users table (Supabase Auth will handle most fields, this is for profile/xp/streak extras)
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    xp integer default 0,
    streak integer default 0,
    last_active date,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Topics (e.g., "Understanding Products and Their Risks")
create table if not exists topics (
    id serial primary key,
    title text not null,
    description text
);

-- Concepts (subsections of topics)
create table if not exists concepts (
    id serial primary key,
    topic_id integer references topics(id) on delete cascade,
    title text not null,
    explanation text,
    example text
);

-- Flashcards (user-created or system)
create table if not exists flashcards (
    id serial primary key,
    user_id uuid references profiles(id) on delete cascade,
    topic_id integer references topics(id),
    concept_id integer references concepts(id),
    question text not null,
    answer text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Questions (multiple-choice, for quizzes)
create table if not exists questions (
    id serial primary key,
    topic_id integer references topics(id),
    concept_id integer references concepts(id),
    question text not null,
    options jsonb not null,
    correct_option integer not null,
    explanation text
);

-- Quiz attempts (track user quiz history)
create table if not exists quiz_attempts (
    id serial primary key,
    user_id uuid references profiles(id) on delete cascade,
    question_id integer references questions(id) on delete cascade,
    selected_option integer,
    correct boolean,
    attempted_at timestamp with time zone default timezone('utc'::text, now())
);

-- XP events (track how XP is earned)
create table if not exists xp_events (
    id serial primary key,
    user_id uuid references profiles(id) on delete cascade,
    event_type text not null,
    amount integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Streaks (track streak history)
create table if not exists streaks (
    id serial primary key,
    user_id uuid references profiles(id) on delete cascade,
    date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
