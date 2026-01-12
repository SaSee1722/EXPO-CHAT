-- ============================================
-- REMOVE VOICE MESSAGES BUCKET
-- ============================================
-- Run this in your Supabase SQL Editor to remove the voice-messages bucket
-- and all its associated policies
-- 1. Drop the voice messages policies
DROP POLICY IF EXISTS "Public Voice Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Voice Upload" ON storage.objects;
-- 2. Delete all files in the voice-messages bucket (optional, but recommended for cleanup)
DELETE FROM storage.objects
WHERE bucket_id = 'voice-messages';
-- 3. Delete the voice-messages bucket
DELETE FROM storage.buckets
WHERE id = 'voice-messages';
-- ============================================
-- CLEANUP COMPLETE!
-- ============================================
-- The voice-messages bucket and all its policies have been removed.