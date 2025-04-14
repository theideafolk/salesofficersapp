/*
  # Fix Shop Table Permissions with Compatible Functions

  1. Changes
     - Add owner_name and phone_number columns to shops table
     - Add created_by column to track which user created each shop
     - Fix RLS policies to use proper Supabase auth functions
     - Allow authenticated users to create and manage their own shops
     
  2. Security
     - Fix RLS policies to allow shop creation by regular users
     - Ensure users can only update shops they created
     - Use functions available in the database context
*/

-- Add owner_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'shops' 
    AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE public.shops
    ADD COLUMN owner_name TEXT DEFAULT NULL;
  END IF;
END
$$;

-- Add phone_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'shops' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.shops
    ADD COLUMN phone_number TEXT DEFAULT NULL;
  END IF;
END
$$;

-- Add created_by column to track ownership if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'shops' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.shops
    ADD COLUMN created_by UUID DEFAULT auth.uid();
    
    -- Create an index on the created_by column for better query performance
    CREATE INDEX idx_shops_created_by ON public.shops(created_by);
  END IF;
END
$$;

-- Drop and recreate policies properly without using IF NOT EXISTS
DO $$
BEGIN
  -- Drop the existing restrictive INSERT policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shops' 
    AND policyname = 'Only admins can create shops'
  ) THEN
    DROP POLICY "Only admins can create shops" ON public.shops;
  END IF;
  
  -- Drop the old restrictive UPDATE policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shops' 
    AND policyname = 'Only admins can update shops'
  ) THEN
    DROP POLICY "Only admins can update shops" ON public.shops;
  END IF;
  
  -- Drop the SELECT policy if it exists to recreate it
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shops' 
    AND policyname = 'All authenticated users can read shops'
  ) THEN
    DROP POLICY "All authenticated users can read shops" ON public.shops;
  END IF;
END
$$;

-- Create a new INSERT policy that allows all authenticated users to create shops
CREATE POLICY "All authenticated users can create shops" ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a new UPDATE policy that allows users to update their own shops
CREATE POLICY "Users can update their own shops" ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
  );

-- Allow admins to update any shop
CREATE POLICY "Admins can update any shop" ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if the user is in the admin role
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'is_admin' = 'true'
    )
  );

-- Create SELECT policy for reading shops
CREATE POLICY "All authenticated users can read shops" ON public.shops
  FOR SELECT
  TO authenticated
  USING (
    -- Show non-deleted shops to all authenticated users
    (is_deleted = false)
  );