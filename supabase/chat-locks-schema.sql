-- Add chat_locks table to store locked chats with PINs
CREATE TABLE IF NOT EXISTS chat_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    -- Hashed PIN for security
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);
-- Enable RLS
ALTER TABLE chat_locks ENABLE ROW LEVEL SECURITY;
-- Users can only manage their own chat locks
CREATE POLICY "Users can manage their own chat locks" ON chat_locks FOR ALL USING (auth.uid() = user_id);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_locks_user_match ON chat_locks(user_id, match_id);
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_locks_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to auto-update updated_at
CREATE TRIGGER chat_locks_updated_at BEFORE
UPDATE ON chat_locks FOR EACH ROW EXECUTE FUNCTION update_chat_locks_updated_at();