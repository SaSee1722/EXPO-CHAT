-- ============================================
-- GOSSIP APP - COMPLETE DATABASE SETUP
-- ============================================
-- This SQL file contains all tables, functions, triggers, and policies
-- needed for the Gossip dating app
-- ============================================
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Stores user profile information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (
        age >= 18
        AND age <= 100
    ),
    bio TEXT,
    location TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    looking_for TEXT CHECK (looking_for IN ('male', 'female', 'everyone')),
    photos TEXT [] DEFAULT '{}',
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR
SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR
INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR
UPDATE USING (auth.uid() = id);
-- ============================================
-- 2. SWIPES TABLE
-- ============================================
-- Tracks user swipes (like/pass)
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    swiped_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    liked BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_id)
);
-- Enable Row Level Security
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
-- Policies for swipes
CREATE POLICY "Users can view their own swipes" ON swipes FOR
SELECT USING (
        auth.uid() = swiper_id
        OR auth.uid() = swiped_id
    );
CREATE POLICY "Users can insert their own swipes" ON swipes FOR
INSERT WITH CHECK (auth.uid() = swiper_id);
-- ============================================
-- 3. MATCHES TABLE
-- ============================================
-- Stores mutual matches between users
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);
-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- Policies for matches
CREATE POLICY "Users can view their own matches" ON matches FOR
SELECT USING (
        auth.uid() = user1_id
        OR auth.uid() = user2_id
    );
-- ============================================
-- 4. MESSAGES TABLE
-- ============================================
-- Stores chat messages between matched users
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    type TEXT DEFAULT 'text' CHECK (
        type IN (
            'text',
            'image',
            'video',
            'audio',
            'file',
            'sticker'
        )
    ),
    media_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    reactions JSONB DEFAULT '{}'::JSONB,
    reply_to UUID REFERENCES messages(id) ON DELETE
    SET NULL,
        reply_to_message JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Policies for messages
CREATE POLICY "Users can view messages in their matches" ON messages FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM matches
            WHERE matches.id = messages.match_id
                AND (
                    matches.user1_id = auth.uid()
                    OR matches.user2_id = auth.uid()
                )
        )
    );
CREATE POLICY "Users can insert messages in their matches" ON messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM matches
            WHERE matches.id = match_id
                AND (
                    matches.user1_id = auth.uid()
                    OR matches.user2_id = auth.uid()
                )
        )
    );
CREATE POLICY "Users can update their own messages" ON messages FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM matches
            WHERE matches.id = messages.match_id
                AND (
                    matches.user1_id = auth.uid()
                    OR matches.user2_id = auth.uid()
                )
        )
    );
-- ============================================
-- 5. CALLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
    status TEXT DEFAULT 'calling' CHECK (
        status IN (
            'calling',
            'active',
            'ended',
            'missed',
            'rejected'
        )
    ),
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- Policies for calls
DROP POLICY IF EXISTS "Users can participate in calls" ON calls;
CREATE POLICY "Users can participate in calls" ON calls FOR ALL USING (
    auth.uid() = caller_id
    OR auth.uid() = receiver_id
);
-- Enable Realtime for the calls table (Critical for call signaling)
ALTER TABLE calls REPLICA IDENTITY FULL;
-- Safely add to publication only if not already present
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'calls'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE calls;
END IF;
END $$;
-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
-- ============================================
-- 6. FUNCTIONS
-- ============================================
-- Function to get discover profiles (users to swipe on)
CREATE OR REPLACE FUNCTION get_discover_profiles(user_id UUID, limit_count INTEGER DEFAULT 10) RETURNS TABLE (
        id UUID,
        display_name TEXT,
        age INTEGER,
        bio TEXT,
        location TEXT,
        photos TEXT []
    ) AS $$ BEGIN RETURN QUERY
SELECT p.id,
    p.display_name,
    p.age,
    p.bio,
    p.location,
    p.photos
FROM profiles p
WHERE p.id != user_id
    AND p.id NOT IN (
        SELECT swiped_id
        FROM swipes
        WHERE swiper_id = user_id
    )
ORDER BY p.created_at DESC
LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to create a match when both users like each other
CREATE OR REPLACE FUNCTION create_match_if_mutual() RETURNS TRIGGER AS $$
DECLARE mutual_like BOOLEAN;
match_user1 UUID;
match_user2 UUID;
BEGIN -- Only proceed if this is a like
IF NEW.liked = TRUE THEN -- Check if the other user also liked
SELECT EXISTS (
        SELECT 1
        FROM swipes
        WHERE swiper_id = NEW.swiped_id
            AND swiped_id = NEW.swiper_id
            AND liked = TRUE
    ) INTO mutual_like;
-- If mutual like, create a match
IF mutual_like THEN -- Ensure user1_id < user2_id for the UNIQUE constraint
IF NEW.swiper_id < NEW.swiped_id THEN match_user1 := NEW.swiper_id;
match_user2 := NEW.swiped_id;
ELSE match_user1 := NEW.swiped_id;
match_user2 := NEW.swiper_id;
END IF;
-- Insert the match (ON CONFLICT DO NOTHING to handle race conditions)
INSERT INTO matches (user1_id, user2_id)
VALUES (match_user1, match_user2) ON CONFLICT (user1_id, user2_id) DO NOTHING;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- 7. TRIGGERS
-- ============================================
-- Trigger to create matches automatically
DROP TRIGGER IF EXISTS create_match_on_mutual_like ON swipes;
CREATE TRIGGER create_match_on_mutual_like
AFTER
INSERT ON swipes FOR EACH ROW EXECUTE FUNCTION create_match_if_mutual();
-- Trigger to update profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- 8. STORAGE BUCKETS (Run these in Supabase Dashboard)
-- ============================================
-- You need to create these buckets in the Supabase Dashboard:
-- 1. Bucket name: "profile-photos" (public)
-- 2. Bucket name: "chat-media" (private)
-- Storage policies for profile-photos bucket
-- CREATE POLICY "Public Access"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'profile-photos');
-- CREATE POLICY "Authenticated users can upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can update their own photos"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete their own photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Create storage buckets in Supabase Dashboard:
--    - profile-photos (public)
--    - chat-media (private)
-- 3. Restart your app to use the new database
-- ============================================