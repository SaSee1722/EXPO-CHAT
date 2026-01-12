-- ============================================
-- COMPLETE STORAGE CLEANUP
-- ============================================
-- Run this in your Supabase SQL Editor to remove ALL unused storage buckets
-- This will remove both voice-messages and chat-media buckets
-- ============================================
-- 1. REMOVE VOICE-MESSAGES BUCKET
-- ============================================
-- Drop voice message policies
DROP POLICY IF EXISTS "Public Voice Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Voice Upload" ON storage.objects;
-- Delete all voice message files
DELETE FROM storage.objects
WHERE bucket_id = 'voice-messages';
-- Delete the voice-messages bucket
DELETE FROM storage.buckets
WHERE id = 'voice-messages';
-- ============================================
-- 2. REMOVE CHAT-MEDIA BUCKET
-- ============================================
-- Drop chat media policies
DROP POLICY IF EXISTS "Public Chat Media Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Chat Media Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat media" ON storage.objects;
-- Delete all chat media files
DELETE FROM storage.objects
WHERE bucket_id = 'chat-media';
-- Delete the chat-media bucket
DELETE FROM storage.buckets
WHERE id = 'chat-media';
-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, you should only have the profile-photos bucket
-- Run this query to verify:
-- SELECT id, name, public FROM storage.buckets;
-- ============================================
-- CLEANUP COMPLETE!
-- ============================================
-- Your app now only supports:
-- ✅ Text messages
-- ✅ Emojis & Stickers
-- ✅ Voice & Video calls
-- ✅ Profile photos