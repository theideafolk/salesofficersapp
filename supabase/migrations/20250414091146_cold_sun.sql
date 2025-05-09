/*
  # Add Combined Query Function for Shops with Last Visit Date

  1. New Functions
     - `get_shops_with_last_visit` - A stored function to get shops with their last visit date in a single query
     
  2. Purpose
     - Improve performance by combining shop and visit queries into a single database call
     - Reduce client-side processing
     - Make the shops list load faster
*/

-- Create a function to get shops with their last visit date in a single query
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_shops_with_last_visit TO authenticated;