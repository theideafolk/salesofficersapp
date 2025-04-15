/*
  # Update find_closest_shops function to include owner details

  1. Changes
     - Update the `find_closest_shops` function to explicitly include owner_name and phone_number fields
     - This ensures these fields are properly returned in the query results
     
  2. Purpose
     - Fix missing owner information in the shop list display
     - Ensure all relevant shop fields are returned from the database
*/

-- Drop the previous version of the function
DROP FUNCTION IF EXISTS find_closest_shops;

-- Create an updated version that explicitly includes owner_name and phone_number
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
  owner_name TEXT,
  phone_number TEXT,
  distance FLOAT
) AS $$
BEGIN
  -- Use proper PostGIS distance calculation with all needed fields
  RETURN QUERY
  SELECT 
    s.shop_id,
    s.name,
    s.address,
    s.territory,
    s.city,
    s.state,
    s.country,
    s.owner_name,
    s.phone_number,
    -- ST_Distance calculates the true distance between geometries in meters
    -- Here we divide by 1000 to convert to kilometers
    ST_Distance(
      s.geom_location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance
  FROM 
    shops s
  WHERE 
    s.is_deleted = false
    -- Only include shops with valid geometry
    AND s.geom_location IS NOT NULL
  ORDER BY 
    -- Use <-> distance operator for index-assisted nearest-neighbor search
    s.geom_location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT limit_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION find_closest_shops TO authenticated;