-- ============================================
-- ADD LAST_SEEN_AT COLUMN TO PROFILES
-- ============================================
-- This adds the missing last_seen_at column that's needed for online status tracking
-- Add the column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
-- Set all current users to offline with current timestamp
UPDATE profiles
SET is_online = false,
    last_seen_at = NOW();
-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
-- Done! Now the online status tracking will work correctly