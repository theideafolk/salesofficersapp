/*
  # Add break status and total work hours columns to work_hours table

  1. Changes
     - Add `is_break_active` column to track if a user is currently on break
     - Add `total_work_hours` column to store the total working time
     
  2. Purpose
     - Enable tracking of break status even if a user logs out
     - Store total work hours for reporting and analytics
*/

-- Add is_break_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_hours' AND column_name = 'is_break_active'
  ) THEN
    ALTER TABLE public.work_hours 
    ADD COLUMN is_break_active BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- Add total_work_hours column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_hours' AND column_name = 'total_work_hours'
  ) THEN
    ALTER TABLE public.work_hours 
    ADD COLUMN total_work_hours INTERVAL;
  END IF;
END
$$;