-- ============================================
-- REMOVE CHAT-MEDIA BUCKET
-- ============================================
-- Run this in your Supabase SQL Editor to remove the chat-media bucket
-- This bucket was used for image/video/file sharing which has been removed
-- 1. Drop any policies associated with chat-media bucket
DROP POLICY IF EXISTS "Public Chat Media Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Chat Media Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat media" ON storage.objects;
-- 2. Delete all files in the chat-media bucket (optional, but recommended for cleanup)
DELETE FROM storage.objects
WHERE bucket_id = 'chat-media';
-- 3. Delete the chat-media bucket
DELETE FROM storage.buckets
WHERE id = 'chat-media';
-- ============================================
-- CLEANUP COMPLETE!
-- ============================================
-- The chat-media bucket and all its policies have been removed.