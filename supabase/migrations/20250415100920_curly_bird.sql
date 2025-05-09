/*
  # Update DB Functions to Ensure GPS Data is Returned

  1. Changes
     - Update the `get_shops_with_last_visit` function to include gps_location in the results
     - Update the `find_closest_shops` function to also include gps_location
     - This ensures map links will work properly by providing the necessary coordinate data
     
  2. Purpose
     - Fix the "undefined GPS location" issue in the shop listing
     - Ensure proper data is available for generating map links
     - Make address links clickable and functional
*/

-- Drop and recreate get_shops_with_last_visit function to include gps_location
DROP FUNCTION IF EXISTS get_shops_with_last_visit;

CREATE OR REPLACE FUNCTION get_shops_with_last_visit(
  user_id UUID,
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
  gps_location TEXT, -- Explicitly include gps_location
  last_visit_date TIMESTAMPTZ,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH closest_shops AS (
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
      s.gps_location::TEXT, -- Convert PostgreSQL point to text
      ST_Distance(
        s.geom_location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      ) / 1000 AS distance
    FROM 
      shops s
    WHERE 
      s.is_deleted = false
      AND s.geom_location IS NOT NULL
    ORDER BY 
      s.geom_location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    LIMIT limit_num
  ),
  latest_visits AS (
    SELECT DISTINCT ON (v.shop_id)
      v.shop_id,
      v.visit_time
    FROM 
      visits v
    WHERE 
      v.sales_officer_id = user_id
      AND v.is_deleted = false
    ORDER BY 
      v.shop_id, v.visit_time DESC
  )
  SELECT 
    cs.shop_id,
    cs.name,
    cs.address,
    cs.territory,
    cs.city,
    cs.state,
    cs.country,
    cs.owner_name,
    cs.phone_number,
    cs.gps_location,
    lv.visit_time as last_visit_date,
    cs.distance
  FROM 
    closest_shops cs
  LEFT JOIN
    latest_visits lv ON cs.shop_id = lv.shop_id
  ORDER BY 
    cs.distance;
END;
$$ LANGUAGE plpgsql STABLE;

-- Drop and recreate find_closest_shops function to include gps_location
DROP FUNCTION IF EXISTS find_closest_shops;

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
  gps_location TEXT, -- Explicitly include gps_location
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
    s.gps_location::TEXT, -- Convert PostgreSQL point to text
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
GRANT EXECUTE ON FUNCTION get_shops_with_last_visit TO authenticated;
GRANT EXECUTE ON FUNCTION find_closest_shops TO authenticated;