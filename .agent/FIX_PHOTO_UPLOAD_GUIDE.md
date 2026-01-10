# Fix Photo Upload Error - Step by Step Guide

## Problem

Error: `"new row violates row-level security policy"` when uploading photos.

## Root Cause

The RLS (Row Level Security) policies are blocking photo uploads to the `profiles` table and/or the `profile-photos` storage bucket.

---

## Solution: Fix in 2 Places

### **Part 1: Fix Database Table Policies (profiles table)**

1. **Go to Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. **Copy and paste this SQL:**

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- Create new permissive policies
CREATE POLICY "Users can view profiles"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated 
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

1. Click **Run** (or press Cmd+Enter)
2. You should see: "Success. No rows returned"

---

### **Part 2: Fix Storage Bucket Policies (profile-photos bucket)**

1. **Go to** → **Storage** (left sidebar)
2. Click on **profile-photos** bucket
3. Click **Policies** tab
4. You should see 0 policies (or restrictive ones)

#### **Add Policy #1: Allow SELECT (View Photos)**

1. Click **New Policy**
2. Choose **For full customization**
3. Fill in:
   - **Policy name:** `Anyone can view photos`
   - **Allowed operation:** Check **SELECT**
   - **Policy definition:**

     ```sql
     bucket_id = 'profile-photos'
     ```

4. Click **Review** → **Save policy**

#### **Add Policy #2: Allow INSERT (Upload Photos)**

1. Click **New Policy** again
2. Choose **For full customization**
3. Fill in:
   - **Policy name:** `Users can upload their own photos`
   - **Allowed operation:** Check **INSERT**
   - **Policy definition:**

     ```sql
     bucket_id = 'profile-photos'
     ```

4. Click **Review** → **Save policy**

#### **Add Policy #3: Allow UPDATE (Update Photos)**

1. Click **New Policy** again
2. Choose **For full customization**
3. Fill in:
   - **Policy name:** `Users can update their own photos`
   - **Allowed operation:** Check **UPDATE**
   - **Policy definition:**

     ```sql
     bucket_id = 'profile-photos'
     ```

4. Click **Review** → **Save policy**

#### **Add Policy #4: Allow DELETE (Delete Photos)**

1. Click **New Policy** again
2. Choose **For full customization**
3. Fill in:
   - **Policy name:** `Users can delete their own photos`
   - **Allowed operation:** Check **DELETE**
   - **Policy definition:**

     ```sql
     bucket_id = 'profile-photos'
     ```

4. Click **Review** → **Save policy**

---

## Verification

After applying both parts:

1. **Go back to your app**
2. **Try uploading a photo again**
3. **It should work!** ✅

---

## Quick Test

If you want to test quickly, you can temporarily make the bucket public:

1. Go to **Storage** → **profile-photos**
2. Click **Settings** tab
3. Toggle **Public bucket** to ON
4. Try upload again

**⚠️ Note:** This makes ALL photos publicly accessible. For production, use the policies above instead.

---

## Troubleshooting

### Still getting 403 error?

- Make sure you ran the SQL in Part 1
- Make sure you added ALL 4 storage policies in Part 2
- Check that you're logged in (auth.uid() must exist)
- Try logging out and back in

### Can't find profile-photos bucket?

- The bucket name might be different
- Check Storage → Files to see your bucket name
- Update the SQL queries with the correct bucket name

---

## Summary

You need to fix policies in **2 places**:

1. ✅ **Database table** (`profiles`) - via SQL Editor
2. ✅ **Storage bucket** (`profile-photos`) - via Storage Policies

Both must allow authenticated users to upload/update their own data!
