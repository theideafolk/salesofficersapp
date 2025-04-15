/*
  # Add owner_name and phone_number columns to shops table

  1. Changes
     - Add `owner_name` column (TEXT, default NULL) to the `shops` table
     - Add `phone_number` column (TEXT, default NULL) to the `shops` table
     - These columns will store the shop owner's name and phone number
     
  2. Purpose
     - Store shop owner contact information directly in the shops table
     - Simplify data access without needing separate metadata parsing
*/

-- Add owner_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'owner_name'
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
    WHERE table_name = 'shops' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.shops
    ADD COLUMN phone_number TEXT DEFAULT NULL;
  END IF;
END
$$;