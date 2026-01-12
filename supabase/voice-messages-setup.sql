-- ============================================
-- NEW VOICE MESSAGES BUCKET SETUP
-- ============================================
-- Run this in your Supabase SQL Editor to set up the new voice-messages bucket
-- 1. Create the voice-messages bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true) ON CONFLICT (id) DO
UPDATE
SET public = true;
-- 2. Clear out any old policies that might conflict
DROP POLICY IF EXISTS "Voice Messages Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Voice Messages Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Voice Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Voice Upload" ON storage.objects;
-- 3. Create new strictly named policies
-- Allow anyone to view/play voice messages (Public)
CREATE POLICY "Voice Messages Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'voice-messages');
-- Allow authenticated users to upload their recordings
CREATE POLICY "Voice Messages Authenticated Upload" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'voice-messages'
        AND auth.role() = 'authenticated'
    );
-- Note: We don't typically allow UPDATE/DELETE on chat media for history integrity,
-- but if needed, we can add owner-based policies later.
-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You can now upload audio files to the 'voice-messages' bucket.