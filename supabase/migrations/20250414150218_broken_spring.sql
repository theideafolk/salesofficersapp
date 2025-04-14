/*
  # Create Storage Buckets for Shop Photos and Visit Proofs

  1. Changes
     - Create two storage buckets: 'visit-proofs' and 'shop-photos'
     - Set up appropriate storage policies for authenticated and public access
     - Ensure buckets are publicly readable but only authenticated users can upload
     
  2. Purpose
     - Enable storing shop photos and visit proof images
     - Ensure proper access control for uploaded files
*/

-- Create visit-proofs bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('visit-proofs', 'visit-proofs', true, false)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Ensure bucket is public

-- Create shop-photos bucket if it doesn't exist
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