/*
  # Add break status and total work hours to work_hours table

  1. Changes
     - Add `is_break_active` column to track if sales officer is currently on break
     - Add `total_work_hours` column to store the total work hours when day ends
     - These changes help better track work time and improve break management
     
  2. Purpose
     - Improve break handling if user logs out while on break
     - Store accurate work duration for reporting and analysis
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