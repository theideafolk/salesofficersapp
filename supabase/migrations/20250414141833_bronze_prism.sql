/*
  # Fix PostGIS Point Format

  1. Changes
     - Fix the `create_postgis_point` function to return proper PostgreSQL point format
     - Add a more robust `format_point` function for handling different point formats
     - Fix the issue with invalid input syntax for type point
     
  2. Purpose
     - Ensure compatibility between PostGIS geometry and PostgreSQL point types
     - Fix the "invalid input syntax for type point" error when submitting visits
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_postgis_point;

-- Create a more robust point conversion function
CREATE OR REPLACE FUNCTION format_point(
  longitude FLOAT,
  latitude FLOAT,
  output_format TEXT DEFAULT 'pg_point'
)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Different output formats
  CASE output_format
    -- Standard PostgreSQL point format (lng,lat)
    WHEN 'pg_point' THEN
      result := '(' || longitude || ',' || latitude || ')';
    
    -- PostGIS WKT format
    WHEN 'wkt' THEN
      result := 'POINT(' || longitude || ' ' || latitude || ')';
    
    -- GeoJSON format
    WHEN 'geojson' THEN
      result := '{"type":"Point","coordinates":[' || longitude || ',' || latitude || ']}';
    
    -- Default to PostgreSQL point format
    ELSE
      result := '(' || longitude || ',' || latitude || ')';
  END CASE;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recreate the create_postgis_point function with correct output format
CREATE OR REPLACE FUNCTION create_postgis_point(
  longitude FLOAT,
  latitude FLOAT
)
RETURNS TEXT AS $$
BEGIN
  -- Return PostgreSQL point format (lng,lat) for compatibility with point columns
  RETURN format_point(longitude, latitude, 'pg_point');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION format_point TO authenticated;
GRANT EXECUTE ON FUNCTION create_postgis_point TO authenticated;