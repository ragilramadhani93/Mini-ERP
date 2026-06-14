-- Add avatar_url column to users table
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
