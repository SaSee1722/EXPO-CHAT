-- Fix CORS for chat-media bucket to allow iOS image loading
-- Run this in your Supabase SQL Editor
-- Update the bucket to allow CORS
UPDATE storage.buckets
SET public = true,
    file_size_limit = 52428800,
    -- 50MB
    allowed_mime_types = ARRAY ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'audio/x-m4a', 'audio/mpeg', 'application/pdf']
WHERE name = 'chat-media';
-- Verify the update
SELECT name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'chat-media';