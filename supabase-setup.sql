-- =============================================
-- SUPABASE DATABASE SETUP FOR GAME ANALYTICS
-- =============================================
-- Run this SQL in Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
-- =============================================

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  status TEXT NOT NULL CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  notes TEXT,
  date_purchased DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS games_user_id_idx ON games(user_id);

-- Create index on date_purchased for year-based filtering
CREATE INDEX IF NOT EXISTS games_date_purchased_idx ON games(date_purchased);

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own games
CREATE POLICY "Users can view their own games"
  ON games
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own games
CREATE POLICY "Users can insert their own games"
  ON games
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own games
CREATE POLICY "Users can update their own games"
  ON games
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own games
CREATE POLICY "Users can delete their own games"
  ON games
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Next steps:
-- 1. Enable Google OAuth in Authentication > Providers
-- 2. Add your app URL to Authentication > URL Configuration
-- 3. Copy your project URL and anon key to .env.local
-- =============================================
