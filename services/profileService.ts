import { getSupabaseClient } from '@/template';
import { Profile } from '@/types';
import { Platform } from 'react-native';

const supabase = getSupabaseClient();

export const profileService = {
  async getMyProfile(userId: string) {
    console.log('[ProfileService] Fetching profile for:', userId);

    // Retry logic for flaky simulator networks
    let lastError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // If it's a "No row found" error, don't retry, it's a valid empty state
          if (error.code === 'PGRST116') return { data: null, error };
          throw error;
        }

        console.log('[ProfileService] Success on attempt:', i + 1);
        return { data, error: null };
      } catch (err: any) {
        lastError = err;
        console.warn(`[ProfileService] Attempt ${i + 1} failed:`, err.message);
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    return { data: null, error: lastError };
  },

  async createProfile(profile: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    return { data, error };
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  async getDiscoverProfiles(userId: string) {
    if (!userId) {
      console.log('[DiscoverDebug] No userId provided');
      return { data: [], error: null };
    }

    console.log('[DiscoverDebug] Fetching discover profiles for user:', userId);

    // Try to fetch swipes, but don't fail if the table doesn't exist or there's an RLS issue
    let swipedList: string[] = [];
    try {
      const { data: swipedIds, error: swipeError } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', userId);

      if (swipeError) {
        // Use warn instead of error for network failure to avoid dev-time popups on flaky connections
        const logMethod = swipeError.message?.includes('Network') ? console.warn : console.error;
        logMethod('[DiscoverDebug] Swipe fetch issue:', swipeError.message);
        // Continue with empty swipe list
      } else if (swipedIds) {
        swipedList = swipedIds.map(s => s.swiped_id).filter(id => !!id);
        console.log('[DiscoverDebug] Found', swipedList.length, 'previous swipes');
      }
    } catch (err) {
      console.error('[DiscoverDebug] Exception fetching swipes:', err);
      // Continue with empty swipe list
    }

    // Build exclude list
    const excludeIds = [userId, ...swipedList].filter(id => !!id && typeof id === 'string');
    console.log('[DiscoverDebug] Excluding', excludeIds.length, 'profiles');

    // Fetch profiles
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true);

      // Only add the NOT IN filter if we have IDs to exclude beyond just the user
      if (excludeIds.length > 1) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      } else if (excludeIds.length === 1) {
        // Just exclude the current user
        query = query.neq('id', userId);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        const logMethod = error.message?.includes('Network') ? console.warn : console.error;
        logMethod('[DiscoverDebug] Profile fetch issue:', error.message);
        return { data: [], error };
      }

      console.log('[DiscoverDebug] Successfully fetched', data?.length || 0, 'profiles');
      return { data, error: null };
    } catch (err) {
      console.error('[DiscoverDebug] Exception fetching profiles:', err);
      return { data: [], error: err };
    }
  },

  async swipeProfile(userId: string, swipedUserId: string, direction: 'left' | 'right' | 'super') {
    const { data, error } = await supabase
      .from('swipes')
      .insert({
        swiper_id: userId,
        swiped_id: swipedUserId,
        liked: direction === 'right' || direction === 'super',
      })
      .select()
      .single();

    return { data, error };
  },

  // UNIVERSAL UPLOAD: Works on both Web and Mobile
  async uploadPhoto(userId: string, uri: string) {
    try {
      console.log(`[PhotoUpload] Starting upload:`, uri.substring(0, 100));

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase configuration missing');

      // Import FileSystem dynamically
      const FileSystem = require('expo-file-system/legacy');

      // 1. Read file as base64 (works reliably on iOS)
      console.log('[PhotoUpload] Reading file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[PhotoUpload] Base64 length:', base64.length);

      if (!base64 || base64.length === 0) {
        throw new Error('Failed to read file data');
      }

      // 2. Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('[PhotoUpload] Binary data size:', bytes.length, 'bytes');

      if (bytes.length === 0) {
        throw new Error('Binary data is empty after conversion');
      }

      // Check file size (max 200KB for profile photos to avoid timeout)
      const maxSize = 200 * 1024; // 200KB
      if (bytes.length > maxSize) {
        throw new Error(`Image too large: ${(bytes.length / 1024).toFixed(0)}KB. Please use a smaller image (max 200KB).`);
      }

      // 3. Generate filename
      const fileName = `${userId}/${Date.now()}.jpg`;

      console.log('[PhotoUpload] Uploading to Supabase Storage...');
      console.log('[PhotoUpload] FileName:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // 4. Get and return Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      console.log('[PhotoUpload] ✅ Success! Public URL:', publicUrl);
      return { data: publicUrl, error: null };

    } catch (error) {
      console.error('[PhotoUpload] ❌ Error:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown upload error') };
    }
  },
};
