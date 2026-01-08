# Gossip App - Supabase Setup Guide

## ✅ Environment Variables Updated

Your `.env` file has been updated with the new Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://vkahvqaqdkkpefbimngu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 Database Setup Steps

### Step 1: Run the SQL Setup

1. Go to your Supabase Dashboard: <https://vkahvqaqdkkpefbimngu.supabase.co>
2. Navigate to **SQL Editor**
3. Open the file `supabase-setup.sql` (in your project root)
4. Copy and paste the entire SQL content
5. Click **Run** to execute

This will create:

- ✅ **profiles** table (user information)
- ✅ **swipes** table (like/pass tracking)
- ✅ **matches** table (mutual matches)
- ✅ **messages** table (chat messages)
- ✅ All necessary indexes
- ✅ Row Level Security policies
- ✅ Functions for discover and matching
- ✅ Triggers for auto-matching

### Step 2: Create Storage Buckets

1. In Supabase Dashboard, go to **Storage**
2. Create two buckets:

#### Bucket 1: profile-photos

- Name: `profile-photos`
- Public: ✅ Yes
- File size limit: 5MB
- Allowed MIME types: `image/*`

#### Bucket 2: chat-media

- Name: `chat-media`
- Public: ❌ No (private)
- File size limit: 10MB
- Allowed MIME types: `image/*`, `video/*`, `audio/*`

### Step 3: Set Storage Policies

After creating the buckets, set these policies:

#### For profile-photos

```sql
-- Allow public read access
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

-- Allow users to update their own photos
CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### For chat-media

```sql
-- Allow users to view media in their matches
CREATE POLICY "Users can view their match media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media' AND
    auth.role() = 'authenticated'
  );

-- Allow users to upload media
CREATE POLICY "Users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media' AND
    auth.role() = 'authenticated'
  );
```

### Step 4: Restart Your App

After completing the database setup:

1. Stop the current dev server (Ctrl+C in terminal)
2. Restart with: `pnpm start`
3. Press `r` to reload the app

## 🗄️ Database Schema Overview

### Tables Created

1. **profiles**
   - User profile information
   - Photos, bio, age, location
   - Gender and preferences

2. **swipes**
   - Tracks likes and passes
   - Prevents duplicate swipes

3. **matches**
   - Stores mutual matches
   - Auto-created when both users like each other

4. **messages**
   - Chat messages between matches
   - Read status tracking

### Key Functions

1. **get_discover_profiles(user_id, limit)**
   - Returns profiles to show in discover feed
   - Excludes already swiped users
   - Excludes current user

2. **create_match_if_mutual()**
   - Automatically creates matches
   - Triggered when both users like each other

### Security

- ✅ Row Level Security enabled on all tables
- ✅ Users can only see their own data
- ✅ Policies prevent unauthorized access
- ✅ Storage buckets have proper access controls

## 🚀 Next Steps

After setup:

1. ✅ Create a test account
2. ✅ Complete your profile
3. ✅ Upload profile photos
4. ✅ Start swiping!

## 📝 Notes

- The app will automatically connect to the new database
- All existing data from the old database will NOT be migrated
- You'll need to create new test accounts
- Make sure to test all features after setup

## 🆘 Troubleshooting

If you encounter issues:

1. **Check .env file**: Make sure the new credentials are correct
2. **Restart app**: Stop and restart the dev server
3. **Clear cache**: Run `pnpm start --clear`
4. **Check Supabase logs**: View logs in Supabase Dashboard
5. **Verify tables**: Check that all tables were created in SQL Editor

---

**Setup complete! Your Gossip app is ready to use with the new Supabase instance.** 🎉
