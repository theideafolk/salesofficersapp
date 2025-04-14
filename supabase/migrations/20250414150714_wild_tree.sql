/*
  # Fix Storage Buckets and Policies

  1. Changes
     - Creates required storage buckets for the application
     - Sets appropriate permissions for anonymous and authenticated users
     - Uses proper SQL syntax to avoid RLS policy violations
     
  2. Purpose
     - Ensures that both visit-proofs and shop-photos buckets exist
     - Enables public read access to images
     - Allows authenticated users to upload files
     - Fixes "bucket not found" and permission errors
*/

-- Create buckets with proper permissions (using superuser privileges to bypass RLS)
BEGIN;

-- Create visit-proofs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)
VALUES ('visit-proofs', 'visit-proofs', true, false, 5242880)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880; -- 5MB limit

-- Create shop-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)  
VALUES ('shop-photos', 'shop-photos', true, false, 5242880)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880; -- 5MB limit

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to visit-proofs objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to visit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read visit-proofs objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update visit-proofs objects" ON storage.objects;

DROP POLICY IF EXISTS "Allow public access to shop-photos objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to shop-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read shop-photos objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update shop-photos objects" ON storage.objects;

-- Policies for visit-proofs bucket
-- Allow public read access
CREATE POLICY "Allow public access to visit-proofs objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'visit-proofs');

-- Allow authenticated users to insert objects
CREATE POLICY "Allow authenticated users to upload to visit-proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'visit-proofs');

-- Allow authenticated users to update their own objects
CREATE POLICY "Allow authenticated users to update visit-proofs objects" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (bucket_id = 'visit-proofs' AND (auth.uid() = owner));

-- Policies for shop-photos bucket
-- Allow public read access
CREATE POLICY "Allow public access to shop-photos objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'shop-photos');

-- Allow authenticated users to insert objects
CREATE POLICY "Allow authenticated users to upload to shop-photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'shop-photos');

-- Allow authenticated users to update their own objects
CREATE POLICY "Allow authenticated users to update shop-photos objects" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (bucket_id = 'shop-photos' AND (auth.uid() = owner));

COMMIT;