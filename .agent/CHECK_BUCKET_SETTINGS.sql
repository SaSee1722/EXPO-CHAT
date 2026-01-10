// Test if profile - photos bucket is accessible // Run this in Supabase SQL Editor -- Check if bucket exists
SELECT *
FROM storage.buckets
WHERE name = 'profile-photos';
-- Check bucket settings
SELECT name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'profile-photos';
-- If bucket doesn't exist, create it:
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'profile-photos',
        'profile-photos',
        true,
        5242880,
        -- 5MB
        ARRAY ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    ) ON CONFLICT (id) DO
UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];