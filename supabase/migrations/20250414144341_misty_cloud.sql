/*
  # Create Storage Buckets for Images

  1. New Features
     - Create 'visit-proofs' bucket for storing visit photos
     - Create 'shop-photos' bucket for storing shop photos
     - Set public access policies for the buckets
     
  2. Purpose
     - Ensure proper storage structure for image uploads
     - Define security policies for accessing the stored images
     - Fix the issue where image uploads fail due to missing buckets
*/

-- Function to create a bucket if it doesn't exist
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists(bucket_name TEXT, public_access BOOLEAN DEFAULT FALSE)
RETURNS VOID AS $$
BEGIN
  -- Check if the bucket already exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = bucket_name
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, public_access);
    
    -- Set up a policy to allow all authenticated users to read objects
    EXECUTE format('
      CREATE POLICY "Allow authenticated users to read %s objects" 
      ON storage.objects 
      FOR SELECT 
      TO authenticated 
      USING (bucket_id = %L);
    ', bucket_name, bucket_name);
    
    -- Set up a policy to allow authenticated users to upload objects
    EXECUTE format('
      CREATE POLICY "Allow authenticated users to upload to %s" 
      ON storage.objects 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (bucket_id = %L);
    ', bucket_name, bucket_name);
    
    -- If the bucket should be publicly accessible, add a policy for anonymous access
    IF public_access THEN
      EXECUTE format('
        CREATE POLICY "Allow public access to %s objects" 
        ON storage.objects 
        FOR SELECT 
        TO anon 
        USING (bucket_id = %L);
      ', bucket_name, bucket_name);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the visit-proofs bucket for storing visit photos
SELECT create_bucket_if_not_exists('visit-proofs', TRUE);

-- Create the shop-photos bucket for storing shop photos
SELECT create_bucket_if_not_exists('shop-photos', TRUE);

-- Drop the helper function after use
DROP FUNCTION create_bucket_if_not_exists;