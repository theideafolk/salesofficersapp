/*
  # Fix Storage Buckets and Ensure They Exist

  1. Changes
     - Create storage buckets using explicit SQL statements
     - Add policies for public access and authenticated uploads
     - Set 5MB file size limit for uploads
     - Make buckets publicly readable
     
  2. Purpose
     - Fix "bucket not found" errors during photo uploads
     - Ensure proper security configuration for storage
     - Allow authenticated users to upload files
     - Allow public access to view uploaded files
*/

-- Create buckets with proper permissions
BEGIN;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public access to visit-proofs objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to visit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read visit-proofs objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update visit-proofs objects" ON storage.objects;

DROP POLICY IF EXISTS "Allow public access to shop-photos objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to shop-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read shop-photos objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update shop-photos objects" ON storage.objects;

-- Make sure buckets exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)
VALUES ('visit-proofs', 'visit-proofs', true, false, 5242880)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880; -- 5MB limit

INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)  
VALUES ('shop-photos', 'shop-photos', true, false, 5242880)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880; -- 5MB limit

-- Create policies for visit-proofs bucket
CREATE POLICY "Allow public access to visit-proofs objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'visit-proofs');

CREATE POLICY "Allow authenticated users to upload to visit-proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'visit-proofs');

CREATE POLICY "Allow authenticated users to update visit-proofs objects" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (bucket_id = 'visit-proofs' AND (auth.uid() = owner OR auth.uid() IS NOT NULL));

-- Create policies for shop-photos bucket
CREATE POLICY "Allow public access to shop-photos objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'shop-photos');

CREATE POLICY "Allow authenticated users to upload to shop-photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'shop-photos');

CREATE POLICY "Allow authenticated users to update shop-photos objects" 
ON storage.objects FOR UPDATE
TO authenticated 
USING (bucket_id = 'shop-photos' AND (auth.uid() = owner OR auth.uid() IS NOT NULL));

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated, anon, service_role;
GRANT ALL ON storage.objects TO authenticated, anon, service_role;

COMMIT;