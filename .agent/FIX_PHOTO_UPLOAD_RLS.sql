-- Fix Photo Upload RLS Policies for Profiles Table
-- Run this in Supabase SQL Editor
-- First, check current policies on profiles table
-- You can view them in: Authentication > Policies > profiles table
-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
-- Create new policies that allow photo uploads
-- 1. Allow users to view all profiles (for matching/discovery)
CREATE POLICY "Users can view profiles" ON profiles FOR
SELECT TO authenticated USING (true);
-- 2. Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles FOR
INSERT TO authenticated WITH CHECK (id = auth.uid());
-- 3. Allow users to update their own profile (including photos array)
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- Also ensure the profile-photos storage bucket has correct policies
-- Go to: Storage > profile-photos > Policies
-- You should have these storage policies:
-- 1. SELECT: Allow authenticated users to view photos
-- 2. INSERT: Allow authenticated users to upload their own photos
-- 3. UPDATE: Allow authenticated users to update their own photos
-- 4. DELETE: Allow authenticated users to delete their own photos
-- If storage policies are missing, add them via the Supabase Dashboard:
-- Storage > profile-photos > Policies > New Policy
-- For INSERT policy on storage:
-- Policy name: "Users can upload their own photos"
-- Allowed operation: INSERT
-- Policy definition: bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- For SELECT policy on storage:
-- Policy name: "Anyone can view photos"  
-- Allowed operation: SELECT
-- Policy definition: bucket_id = 'profile-photos'
-- For UPDATE policy on storage:
-- Policy name: "Users can update their own photos"
-- Allowed operation: UPDATE
-- Policy definition: bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- For DELETE policy on storage:
-- Policy name: "Users can delete their own photos"
-- Allowed operation: DELETE
-- Policy definition: bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]