/*
  # Create work_hours table for tracking sales officer activity

  1. New Tables
     - `work_hours`
       - `work_id` (uuid, primary key)
       - `sales_officer_id` (uuid, foreign key)
       - `date` (date)
       - `start_time` (timestamptz)
       - `end_time` (timestamptz, nullable)
       - `break_start_time` (timestamptz, nullable)
       - `break_end_time` (timestamptz, nullable)
       - `total_break_minutes` (integer, default 0)
       - `created_at` (timestamptz)
       
  2. Indexes
     - Index on `sales_officer_id` for faster queries
     - Index on `date` for date-based lookups
     - Unique constraint on `sales_officer_id` and `date` to ensure one entry per day
     
  3. Security
     - Enable RLS on `work_hours` table
     - Add policies for authenticated users to create, read, and update their own work hours
*/

-- Create work_hours table
CREATE TABLE IF NOT EXISTS public.work_hours (
  work_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_officer_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_break_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint to ensure one entry per officer per day
  CONSTRAINT work_hours_officer_date_unique UNIQUE (sales_officer_id, date),
  
  -- Foreign key to sales_officers table
  CONSTRAINT work_hours_sales_officer_id_fkey FOREIGN KEY (sales_officer_id) 
    REFERENCES public.sales_officers(sales_officers_id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_hours_sales_officer_id ON public.work_hours(sales_officer_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_date ON public.work_hours(date);

-- Enable row level security
ALTER TABLE public.work_hours ENABLE ROW LEVEL SECURITY;

-- Policy for sales officers to insert their own work hours
CREATE POLICY "Sales officers can create their own work hours"
  ON public.work_hours
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid())::text = (sales_officer_id)::text);

-- Policy for sales officers to view their own work hours
CREATE POLICY "Sales officers can view their own work hours"
  ON public.work_hours
  FOR SELECT
  TO public
  USING ((auth.uid())::text = (sales_officer_id)::text);

-- Policy for sales officers to update their own work hours
CREATE POLICY "Sales officers can update their own work hours"
  ON public.work_hours
  FOR UPDATE
  TO public
  USING ((auth.uid())::text = (sales_officer_id)::text)
  WITH CHECK ((auth.uid())::text = (sales_officer_id)::text);