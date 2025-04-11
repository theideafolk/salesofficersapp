/*
  # Add missing sales officer data and fix permissions

  This migration:
  1. Adds a more direct function to create sales officers
  2. Ensures proper permissions are set
  3. Adds debugging logs for tracking insertion issues
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.create_sales_officer;

-- Create an improved version of the function with better error handling
CREATE OR REPLACE FUNCTION public.create_sales_officer(
  officer_id UUID,
  officer_name TEXT,
  officer_employee_id TEXT,
  officer_dob DATE,
  officer_id_type TEXT,
  officer_id_no TEXT,
  officer_phone_number TEXT,
  officer_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Insert the sales officer data
  INSERT INTO public.sales_officers (
    sales_officers_id,
    name,
    employee_id,
    dob,
    id_type,
    id_no,
    phone_number,
    address
  ) VALUES (
    officer_id,
    officer_name,
    COALESCE(NULLIF(officer_employee_id, ''), 'EMP' || officer_phone_number),
    officer_dob,
    COALESCE(NULLIF(officer_id_type, ''), 'Aadhaar Card'),
    COALESCE(NULLIF(officer_id_no, ''), 'PENDING'),
    officer_phone_number,
    officer_address
  );
  
  success := FOUND;
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE WARNING 'Error in create_sales_officer: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION public.create_sales_officer TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_officer TO anon;

-- Manually fix any auth users without sales_officer entries
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN (
    SELECT 
      id, 
      raw_user_meta_data->>'name' as name,
      raw_user_meta_data->>'phone' as phone
    FROM auth.users
    WHERE id NOT IN (SELECT sales_officers_id FROM public.sales_officers)
  ) LOOP
    -- Skip if no phone number
    IF auth_user.phone IS NOT NULL THEN
      INSERT INTO public.sales_officers (
        sales_officers_id,
        name,
        employee_id,
        id_type,
        id_no, 
        phone_number,
        address,
        is_active
      ) VALUES (
        auth_user.id,
        COALESCE(auth_user.name, 'User ' || substring(auth_user.phone from 4)),
        'EMP' || substring(auth_user.phone from 4),
        'Aadhaar Card',
        'PENDING',
        substring(auth_user.phone from 4),
        'Default Address',
        TRUE
      )
      ON CONFLICT (sales_officers_id) DO NOTHING;
    END IF;
  END LOOP;
END
$$;