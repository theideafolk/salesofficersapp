/*
  # Fix find_closest_shops function

  1. Changes
     - Modified `find_closest_shops` function to work without PostGIS geography type
     - Uses standard PostgreSQL point distance calculation instead
     - Ensures compatibility with free Supabase instances
     
  2. Purpose
     - Fixes the error: "type geography does not exist"
     - Provides a reliable way to find nearby shops without advanced PostGIS features
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS find_closest_shops;

-- Create a modified version that doesn't use geography type
CREATE OR REPLACE FUNCTION find_closest_shops(
  lat FLOAT,
  lng FLOAT,
  limit_num INTEGER DEFAULT 5
)
RETURNS TABLE (
  shop_id UUID,
  name TEXT,
  address TEXT,
  territory TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.shop_id,
    s.name,
    s.address,
    s.territory,
    s.city,
    s.state,
    s.country,
    -- Calculate approximate distance using the Euclidean distance formula
    -- This is a simple approximation that works for short distances
    SQRT(
      POWER((s.gps_location[0] - lng), 2) + 
      POWER((s.gps_location[1] - lat), 2)
    ) * 111.32 AS distance -- Convert to approximate kilometers (111.32 km per degree at equator)
  FROM 
    shops s
  WHERE 
    s.is_deleted = false
  ORDER BY 
    s.gps_location <-> point(lng, lat)
  LIMIT limit_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION find_closest_shops TO authenticated;