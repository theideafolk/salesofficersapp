/*
  # Create find_closest_shops function

  1. New Functions
     - `find_closest_shops` - A stored function to find the closest shops to a given location
     
  2. Purpose
     - Provides efficient querying of shops based on proximity
     - Returns shop details along with distance information
     - Limits results to specified number of shops
*/

-- Create function to find closest shops
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
    ST_Distance(
      s.gps_location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance -- Convert to kilometers
  FROM 
    shops s
  WHERE 
    s.is_deleted = false
  ORDER BY 
    s.gps_location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT limit_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION find_closest_shops TO authenticated;