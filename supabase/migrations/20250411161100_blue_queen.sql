/*
  # Enable PostGIS and optimize shop locations

  1. Changes
     - Enable PostGIS extension for proper geospatial functionality
     - Add a new column `geom_location` with proper PostGIS geometry type
     - Convert existing point data to PostGIS geometry
     - Create spatial index for fast geospatial queries
     - Update find_closest_shops function to use proper PostGIS functions

  2. Purpose
     - Enable accurate distance calculations and spatial queries
     - Optimize performance of location-based shop search
     - Fix the "type geography does not exist" error
*/

-- Enable PostGIS extension (this is available on all Supabase plans, including free tier)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a new geometry column to shops table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shops' AND column_name = 'geom_location'
  ) THEN
    -- Add geometry column
    ALTER TABLE shops ADD COLUMN geom_location geometry(Point, 4326);
    
    -- Convert existing point data to geometry
    -- This assumes gps_location is stored as PostgreSQL point type
    UPDATE shops 
    SET geom_location = ST_SetSRID(ST_MakePoint(
      -- Extract X (longitude) and Y (latitude) from point
      gps_location[0], 
      gps_location[1]
    ), 4326)
    WHERE gps_location IS NOT NULL;
    
    -- Create a spatial index on the geometry column for better performance
    CREATE INDEX idx_shops_geom ON shops USING GIST(geom_location);
  END IF;
END
$$;

-- Drop the previous version of the function
DROP FUNCTION IF EXISTS find_closest_shops;

-- Create a new function using proper PostGIS functions for accurate distance calculation
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
  -- Use proper PostGIS distance calculation
  RETURN QUERY
  SELECT 
    s.shop_id,
    s.name,
    s.address,
    s.territory,
    s.city,
    s.state,
    s.country,
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

-- Add a trigger to automatically update the geometry column when point data changes
CREATE OR REPLACE FUNCTION update_shop_geometry()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the geometry whenever the point coordinates change
  NEW.geom_location := ST_SetSRID(ST_MakePoint(
    NEW.gps_location[0],
    NEW.gps_location[1]
  ), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_shop_geometry'
  ) THEN
    CREATE TRIGGER trigger_update_shop_geometry
    BEFORE INSERT OR UPDATE OF gps_location ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_geometry();
  END IF;
END
$$;