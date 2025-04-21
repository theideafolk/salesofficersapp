/*
  # Drop Product Offer Columns
  
  1. Changes
     - Drop columns related to offers from the products table:
       - offer_type
       - offer_min_quantity
       - free_gift_product_id
       - offer_description
       - scheme_id
     - Drop the foreign key constraints first

  2. Purpose
     - Clean up the products table schema
     - Remove redundant columns after moving offer data to the schemes table
*/

-- Drop foreign key constraints first
DO $$
BEGIN
  -- Drop the foreign key for free_gift_product_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_free_gift_product_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
    DROP CONSTRAINT products_free_gift_product_id_fkey;
  END IF;

  -- Drop the foreign key for scheme_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_scheme_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
    DROP CONSTRAINT products_scheme_id_fkey;
  END IF;
END
$$;

-- Drop the index on scheme_id if it exists
DROP INDEX IF EXISTS idx_products_scheme_id;

-- Drop the index on offer_type if it exists
DROP INDEX IF EXISTS idx_products_offer_type;

-- Drop columns from the products table
ALTER TABLE public.products
DROP COLUMN IF EXISTS offer_type,
DROP COLUMN IF EXISTS offer_min_quantity,
DROP COLUMN IF EXISTS free_gift_product_id,
DROP COLUMN IF EXISTS offer_description,
DROP COLUMN IF EXISTS scheme_id;