/*
  # Fix Storage Buckets and Add RLS Policies

  1. Changes
     - Create storage buckets with proper SQL statements
     - Add necessary storage bucket policies
     - Update existing buckets if they exist to ensure public access
     - Enable multiple policies for the same operation
     
  2. Purpose
     - Fix issue with photos not being saved to storage
     - Ensure proper security policies are in place
     - Allow authenticated users to upload and access photos
*/

-- Create visit-proofs bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('visit-proofs', 'visit-proofs', true, false)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Ensure bucket is public

-- Create shop-photos bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection)  
VALUES ('shop-photos', 'shop-photos', true, false)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Ensure bucket is public

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to visit-proofs objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to visit-proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read visit-proofs objects" ON storage.objects;

DROP POLICY IF EXISTS "Allow public access to shop-photos objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to shop-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read shop-photos objects" ON storage.objects;

-- Create policies for visit-proofs
CREATE POLICY "Allow public access to visit-proofs objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'visit-proofs');

CREATE POLICY "Allow authenticated users to upload to visit-proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'visit-proofs');

CREATE POLICY "Allow authenticated users to read visit-proofs objects" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'visit-proofs');

-- Create policies for shop-photos
CREATE POLICY "Allow public access to shop-photos objects" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'shop-photos');

CREATE POLICY "Allow authenticated users to upload to shop-photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'shop-photos');

CREATE POLICY "Allow authenticated users to read shop-photos objects" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'shop-photos');