/*
  # Create stored function for sales officer creation

  1. New Functions
     - `create_sales_officer` - A stored function that ensures the proper creation of sales officers
     
  2. Purpose
     - Provides a direct way to insert sales officers with proper error handling
     - Ensures database integrity
     - Handles nullable fields correctly
*/

-- Create a function to insert a sales officer
CREATE OR REPLACE FUNCTION create_sales_officer(
  officer_id UUID,
  officer_name TEXT,
  officer_employee_id TEXT,
  officer_dob DATE,
  officer_id_type TEXT,
  officer_id_no TEXT,
  officer_phone_number TEXT,
  officer_address TEXT
) RETURNS VOID AS $$
BEGIN
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
    NULLIF(officer_employee_id, ''),
    officer_dob,
    NULLIF(officer_id_type, ''),
    NULLIF(officer_id_no, ''),
    officer_phone_number,
    officer_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION create_sales_officer TO authenticated;