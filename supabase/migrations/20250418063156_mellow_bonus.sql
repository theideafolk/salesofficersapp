/*
  # Add Product Offer Fields

  1. Changes
     - Add `offer_type` column to the `products` table to store the type of offer (bogo, free_gift, etc.)
     - Add `offer_min_quantity` column to specify minimum purchase quantity to activate the offer
     - Add `free_gift_product_id` column to store the product ID of the free gift
     - Add `offer_description` column to store a human-readable description of the offer

  2. Purpose
     - Support "Buy X Get One Free" and "Free Gift" offers
     - Allow for flexible offer configuration
     - Enhance the shopping experience by clearly displaying offer details
*/

-- Add offer_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'offer_type'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN offer_type TEXT DEFAULT NULL;
  END IF;
END
$$;

-- Add offer_min_quantity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'offer_min_quantity'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN offer_min_quantity INTEGER DEFAULT NULL;
  END IF;
END
$$;

-- Add free_gift_product_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'free_gift_product_id'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN free_gift_product_id UUID DEFAULT NULL,
    ADD CONSTRAINT products_free_gift_product_id_fkey
      FOREIGN KEY (free_gift_product_id)
      REFERENCES products(product_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Add offer_description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'offer_description'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN offer_description TEXT DEFAULT NULL;
  END IF;
END
$$;

-- Create an index on offer_type for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'products'
    AND indexname = 'idx_products_offer_type'
  ) THEN
    CREATE INDEX idx_products_offer_type ON public.products(offer_type);
  END IF;
END
$$;