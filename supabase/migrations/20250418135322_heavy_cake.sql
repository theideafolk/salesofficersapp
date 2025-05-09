/*
  # Create Schemes Table

  1. New Tables
     - `schemes` - Stores product and order schemes/offers information
       - `scheme_id` (integer, primary key, auto-increment)
       - `scheme_text` (text, required) - Description of the scheme
       - `scheme_min_price` (numeric(10,2), nullable) - Minimum price for the scheme to apply
       - `scheme_scope` (text, required) - Scope of the scheme ('product' or 'order')
       - `created_at` (timestamp with time zone) - Creation timestamp
       - `is_active` (boolean) - Whether the scheme is active

  2. Security
     - Enable RLS on `schemes` table
     - Add policy for authenticated users to read active schemes
     - Add policy for admins to create schemes
     - Add policy for admins to update schemes
     
  3. Indexes
     - Add index on scheme_scope for better query performance
     - Add index on is_active for filtering active schemes quickly
*/

-- Create the schemes table
CREATE TABLE IF NOT EXISTS public.schemes (
  scheme_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scheme_text text NOT NULL,
  scheme_min_price numeric(10,2),
  scheme_scope text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Add check constraint to limit scheme_scope values
  CONSTRAINT schemes_scheme_scope_check CHECK (scheme_scope IN ('product', 'order'))
);

-- Create indexes for better query performance
CREATE INDEX idx_schemes_scope ON public.schemes(scheme_scope);
CREATE INDEX idx_schemes_active ON public.schemes(is_active);

-- Enable Row Level Security
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Policy to allow all authenticated users to read active schemes
CREATE POLICY "All authenticated users can read active schemes"
  ON public.schemes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy to allow only admins to create schemes
CREATE POLICY "Only admins can create schemes"
  ON public.schemes
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'is_admin') = 'true');

-- Policy to allow only admins to update schemes
CREATE POLICY "Only admins can update schemes"
  ON public.schemes
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'is_admin') = 'true');