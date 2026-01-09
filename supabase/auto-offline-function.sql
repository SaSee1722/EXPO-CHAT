-- ============================================
-- AUTO-OFFLINE FUNCTION
-- ============================================
-- This function automatically marks users as offline if they haven't 
-- updated their last_seen_at in the last 30 seconds
CREATE OR REPLACE FUNCTION auto_mark_users_offline() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE profiles
SET is_online = false
WHERE is_online = true
    AND last_seen_at < NOW() - INTERVAL '30 seconds';
END;
$$;
-- ============================================
-- SCHEDULE THE FUNCTION (Using pg_cron extension)
-- ============================================
-- Note: This requires the pg_cron extension to be enabled in Supabase
-- You can enable it in: Database > Extensions > pg_cron
-- Run every 15 seconds to keep online status accurate
-- SELECT cron.schedule(
--   'auto-offline-users',
--   '*/15 * * * * *',  -- Every 15 seconds
--   'SELECT auto_mark_users_offline();'
-- );
-- ============================================
-- ALTERNATIVE: Client-side polling
-- ============================================
-- If pg_cron is not available, you can call this function
-- periodically from your app or use a Supabase Edge Function