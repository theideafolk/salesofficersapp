/*
  # Add foreign key constraint to sales_officers table

  1. Changes
     - Add foreign key constraint from sales_officers.sales_officers_id to auth.users.id
     - This ensures referential integrity between sales officers and auth users
     - Prevents orphaned sales_officers records if auth users are deleted

  2. Security
     - No changes to RLS policies
*/

-- First, check if the foreign key constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_officers_id_auth_users_fkey'
    AND table_name = 'sales_officers'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE public.sales_officers
    ADD CONSTRAINT sales_officers_id_auth_users_fkey
    FOREIGN KEY (sales_officers_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE; -- When auth user is deleted, delete the sales officer record too
  END IF;
END $$;