/*
  # Update Sales Officers table

  1. Changes
     - Change `dob` column type from TEXT to DATE in `sales_officers` table
     - This change improves data validation and allows for proper date handling

  2. Security
     - No changes to RLS policies
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales_officers'
    AND column_name = 'dob'
    AND data_type = 'text'
  ) THEN
    -- First, ensure the column allows NULL values temporarily to avoid conversion errors
    ALTER TABLE public.sales_officers ALTER COLUMN dob DROP NOT NULL;
    
    -- Update any potentially invalid dates (replace with NULL)
    UPDATE public.sales_officers 
    SET dob = NULL 
    WHERE dob IS NOT NULL AND dob !~ '^\d{4}-\d{2}-\d{2}$';
    
    -- Then convert the column from TEXT to DATE
    ALTER TABLE public.sales_officers 
    ALTER COLUMN dob TYPE DATE USING (
      CASE 
        WHEN dob ~ '^\d{4}-\d{2}-\d{2}$' THEN dob::DATE
        ELSE NULL
      END
    );
    
    -- Set the column back to NOT NULL if required (comment out if nullable is acceptable)
    -- ALTER TABLE public.sales_officers ALTER COLUMN dob SET NOT NULL;
  END IF;
END $$;