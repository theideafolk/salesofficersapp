/*
  # Add Scheme-Related Columns to Products Table

  1. Changes
     - Add product_scheme_buy_qty column to track the quantity to buy for scheme eligibility
     - Add product_scheme_get_qty column to track the quantity given for free in the scheme
     - Add product_item_offer_id column as a foreign key to products table for bundled offers
     - Add product_scheme_id column as a foreign key to schemes table
     - Create indexes for improved query performance
     
  2. Purpose
     - Enable tracking of product-specific buy/get quantities for schemes
     - Support relationships between products and schemes
     - Enable bundled product offers where buying one product gives another product
*/

-- Add scheme-related columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_scheme_buy_qty integer,
ADD COLUMN IF NOT EXISTS product_scheme_get_qty integer,
ADD COLUMN IF NOT EXISTS product_item_offer_id uuid,
ADD COLUMN IF NOT EXISTS product_scheme_id integer;

-- Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key for product_item_offer_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_product_item_offer_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_product_item_offer_id_fkey
    FOREIGN KEY (product_item_offer_id)
    REFERENCES public.products(product_id)
    ON DELETE SET NULL;
  END IF;

  -- Add foreign key for product_scheme_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_product_scheme_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_product_scheme_id_fkey
    FOREIGN KEY (product_scheme_id)
    REFERENCES public.schemes(scheme_id)
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_scheme_id ON public.products(product_scheme_id);
CREATE INDEX IF NOT EXISTS idx_products_item_offer_id ON public.products(product_item_offer_id);