/*
  # Create helper function for PostGIS point creation

  1. Changes
     - Add a helper function to create PostGIS points from latitude/longitude
     - This simplifies the creation of PostGIS points from client applications
     
  2. Purpose
     - Makes it easy to create properly formatted PostGIS points
     - Ensures consistent SRID (4326 - WGS84) for all points
     - Adds a layer of abstraction for spatial operations
*/

-- Create a helper function for creating PostGIS points
CREATE OR REPLACE FUNCTION create_postgis_point(
  longitude FLOAT,
  latitude FLOAT
)
RETURNS TEXT AS $$
DECLARE
  point_string TEXT;
BEGIN
  -- Use ST_AsText to convert geometry to human-readable format
  SELECT ST_AsText(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) INTO point_string;
  RETURN point_string;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_postgis_point TO authenticated;