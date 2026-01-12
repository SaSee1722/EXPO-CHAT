-- ============================================
-- FIX PROFILE PHOTOS STORAGE POLICIES
-- ============================================
-- Run this in your Supabase SQL Editor to fix storage policy issues
-- This will resolve "Network request failed" errors when uploading profile photos
-- 1. Ensure the profile-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT (id) DO
UPDATE
SET public = true;
-- 2. Drop all old/conflicting policies
DROP POLICY IF EXISTS "Profile Photos Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Profile Photos Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Profile Photos Owner Edit" ON storage.objects;
DROP POLICY IF EXISTS "Profile Photos Owner Delete" ON storage.objects;
-- Also drop old generic policy names if they exist (these can cause conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Edit" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
-- 3. Create new bucket-specific policies with clear names
-- Allow anyone to view/download profile photos
CREATE POLICY "Profile Photos Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'profile-photos');
-- Allow authenticated users to upload profile photos
CREATE POLICY "Profile Photos Authenticated Upload" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'profile-photos'
        AND auth.role() = 'authenticated'
    );
-- Allow users to update their own photos
CREATE POLICY "Profile Photos Owner Edit" ON storage.objects FOR
UPDATE USING (
        bucket_id = 'profile-photos'
        AND auth.uid()::text = (storage.foldername(name)) [1]
    );
-- Allow users to delete their own photos
CREATE POLICY "Profile Photos Owner Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name)) [1]
);
-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify the setup:
-- Check bucket exists
SELECT id,
    name,
    public
FROM storage.buckets
WHERE id = 'profile-photos';
-- Expected: 1 row with public = true
-- Check policies
SELECT policyname,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE 'Profile Photos%';
-- Expected: 4 rows (Public Access, Authenticated Upload, Owner Edit, Owner Delete)
-- ============================================
-- POLICY FIX COMPLETE!
-- ============================================
-- You should now be able to upload profile photos without errors