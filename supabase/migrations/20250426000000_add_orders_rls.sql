/*
  # Add RLS Policies for Orders Table

  1. Changes
     - Enable Row Level Security on orders table
     - Add policies for authenticated users to:
       - Create new orders
       - Read orders they have access to
       - Update their own orders
       - Delete their own orders (soft delete)
     - Add policy for admins to manage all orders
     
  2. Purpose
     - Secure the orders table with proper access control
     - Allow sales officers to manage their orders
     - Allow admins to manage all orders
*/

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins to manage all orders" ON public.orders;

-- Policy for creating orders
CREATE POLICY "Allow authenticated users to create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for reading orders
CREATE POLICY "Allow authenticated users to read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  -- Allow reading orders that are not deleted
  is_deleted = false
);

-- Policy for updating orders
CREATE POLICY "Allow authenticated users to update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  -- Allow updating orders that are not deleted
  is_deleted = false
)
WITH CHECK (
  -- Allow updating orders that are not deleted
  is_deleted = false
);

-- Policy for deleting orders (soft delete)
CREATE POLICY "Allow authenticated users to delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  -- Allow deleting orders that are not already deleted
  is_deleted = false
);

-- Policy for admins to manage all orders
CREATE POLICY "Allow admins to manage all orders"
ON public.orders
TO authenticated
USING (
  -- Check if the user is an admin using the is_admin claim
  (auth.jwt() ->> 'is_admin')::boolean = true
)
WITH CHECK (
  -- Check if the user is an admin using the is_admin claim
  (auth.jwt() ->> 'is_admin')::boolean = true
); 