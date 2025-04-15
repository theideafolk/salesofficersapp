/*
  # Simplify work_hours table for timer persistence

  1. Changes
     - Make sure both `is_break_active` and `total_break_minutes` columns exist
     - These columns will help track break status and total break time
     
  2. Purpose
     - Allow accurate tracking of working hours even when app is terminated
     - Support calculation of total work time with breaks accounted for
*/

-- Make sure total_break_minutes column exists and has default 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_hours' AND column_name = 'total_break_minutes'
  ) THEN
    -- Column exists, make sure it has default 0
    ALTER TABLE public.work_hours 
    ALTER COLUMN total_break_minutes SET DEFAULT 0;
  ELSE
    -- Column doesn't exist, add it
    ALTER TABLE public.work_hours 
    ADD COLUMN total_break_minutes INTEGER DEFAULT 0;
  END IF;
END
$$;

-- Make sure is_break_active column exists and has default false
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_hours' AND column_name = 'is_break_active'
  ) THEN
    -- Column exists, make sure it has default false
    ALTER TABLE public.work_hours 
    ALTER COLUMN is_break_active SET DEFAULT false;
  ELSE
    -- Column doesn't exist, add it
    ALTER TABLE public.work_hours 
    ADD COLUMN is_break_active BOOLEAN DEFAULT false;
  END IF;
END
$$;