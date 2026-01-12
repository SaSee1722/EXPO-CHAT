-- ============================================
-- CHAT MEDIA BUCKET SETUP (TELEGRAM-STYLE)
-- ============================================
-- 1. Create the chat-media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO
UPDATE
SET public = true;
-- 2. Clear out any old policies
DROP POLICY IF EXISTS "Chat Media Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Authenticated Upload" ON storage.objects;
-- 3. Create new policies
-- Allow anyone to view media (Public)
CREATE POLICY "Chat Media Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'chat-media');
-- Allow authenticated users to upload
CREATE POLICY "Chat Media Authenticated Upload" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
    );
-- ============================================
-- SETUP COMPLETE!
-- ============================================