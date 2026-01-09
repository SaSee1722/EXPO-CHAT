-- Add is_public column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
-- Update get_discover_profiles function to respect visibility
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
    AND p.is_public = TRUE -- Only show public profiles
    AND p.id NOT IN (
        SELECT swiped_id
        FROM swipes
        WHERE swiper_id = user_id
    )
    AND p.id NOT IN (
        SELECT blocked_id
        FROM blocks
        WHERE blocker_id = user_id
    )
    AND p.id NOT IN (
        SELECT blocker_id
        FROM blocks
        WHERE blocked_id = user_id
    )
ORDER BY p.created_at DESC
LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;