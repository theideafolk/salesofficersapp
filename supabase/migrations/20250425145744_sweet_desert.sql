/*
  # Update Orders Table Structure

  1. Changes
     - Remove `scheme_choice` column (if it exists)
     - Add `free_qty` column to store quantity of free items
     - Add `free_product_id` column to store ID of free product
     - Add `scheme_id` column to store ID of the applied scheme
     - Change primary key to composite key (order_id, product_id)
     - Add foreign key constraints for scheme_id and free_product_id

  2. Purpose
     - Store details about free items and applied schemes
     - Persist user's scheme choice implicitly (free_qty for BOGO, free_product_id for product offer)
     - Allow multiple products per order by using a composite primary key
     - Track which scheme was applied to each order item
*/

-- First, check if scheme_choice column exists before trying to drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'scheme_choice'
  ) THEN
    -- Drop the scheme_choice column if it exists
    ALTER TABLE public.orders DROP COLUMN scheme_choice;
  END IF;
END
$$;

-- Add free_qty column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'free_qty'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN free_qty INTEGER DEFAULT 0;
  END IF;
END
$$;

-- Add free_product_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'free_product_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN free_product_id UUID;
  END IF;
END
$$;

-- Add scheme_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'scheme_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN scheme_id INTEGER;
  END IF;
END
$$;

-- Check if we need to modify the primary key
DO $$
DECLARE
  pk_constraint TEXT;
BEGIN
  -- Get the current primary key constraint name
  SELECT constraint_name INTO pk_constraint
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND constraint_type = 'PRIMARY KEY';

  -- If the primary key exists and is not a composite key
  IF pk_constraint IS NOT NULL THEN
    -- Remove the existing primary key constraint
    EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || pk_constraint;
    
    -- Add the new composite primary key
    ALTER TABLE public.orders ADD CONSTRAINT orders_composite_pkey PRIMARY KEY (order_id, product_id);
  END IF;
  
  -- If there's no primary key at all, add the composite one
  IF pk_constraint IS NULL THEN
    -- Check if order_id is already a unique constraint
    SELECT constraint_name INTO pk_constraint
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND constraint_name = 'orders_pkey';
    
    IF pk_constraint IS NOT NULL THEN
      -- Drop the existing unique constraint
      EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT orders_pkey';
    END IF;
    
    -- Add the composite primary key
    ALTER TABLE public.orders ADD CONSTRAINT orders_composite_pkey PRIMARY KEY (order_id, product_id);
  END IF;
END
$$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Check for free_product_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_free_product_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_free_product_id_fkey
    FOREIGN KEY (free_product_id)
    REFERENCES public.products(product_id)
    ON DELETE SET NULL;
  END IF;

  -- Check for scheme_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_scheme_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_scheme_id_fkey
    FOREIGN KEY (scheme_id)
    REFERENCES public.schemes(scheme_id)
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_free_product_id ON public.orders(free_product_id);
CREATE INDEX IF NOT EXISTS idx_orders_scheme_id ON public.orders(scheme_id);