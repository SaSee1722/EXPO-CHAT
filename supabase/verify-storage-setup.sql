-- ============================================
-- VERIFY STORAGE SETUP
-- ============================================
-- Run this in your Supabase SQL Editor to verify storage configuration
-- This will help diagnose profile photo upload issues
-- 1. Check if profile-photos bucket exists
SELECT id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id = 'profile-photos';
-- Expected: 1 row showing the profile-photos bucket with public = true
-- 2. Check all storage policies for profile-photos bucket
SELECT policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%rofile%'
    OR policyname LIKE '%Public%'
    OR policyname LIKE '%Authenticated%';
-- Expected: Should show policies for profile-photos bucket
-- 3. List all storage buckets (to see what exists)
SELECT id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY created_at DESC;
-- Expected: Should show profile-photos and possibly other buckets
-- 4. Check for any files in profile-photos bucket
SELECT COUNT(*) as file_count,
    SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects
WHERE bucket_id = 'profile-photos';
-- Expected: Shows number of files and total size
-- ============================================
-- DIAGNOSTIC COMPLETE
-- ============================================
-- If profile-photos bucket doesn't exist, run supabase-setup.sql
-- If policies are missing or incorrectly named, run the fix script