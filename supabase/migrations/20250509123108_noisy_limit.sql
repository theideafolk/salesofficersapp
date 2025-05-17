/*
  # Add Function for Most Ordered Products

  1. New Functions
     - `get_most_ordered_products_for_shop` - Returns the most ordered products for a specific shop
     
  2. Purpose
     - Improve the order placement experience by showing the most commonly ordered products
     - Make it easier for sales officers to find frequently ordered products
*/

-- Create function to get most ordered products for a shop
CREATE OR REPLACE FUNCTION get_most_ordered_products_for_shop(
  shop_id_param UUID,
  limit_num INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  name TEXT,
  quantity INTEGER,
  frequency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.product_id,
    p.name,
    SUM(o.quantity)::INTEGER as quantity,
    COUNT(DISTINCT o.order_id)::INTEGER as frequency
  FROM 
    orders o
  INNER JOIN 
    visits v ON o.visit_id = v.visit_id
  INNER JOIN 
    products p ON o.product_id = p.product_id
  WHERE 
    v.shop_id = shop_id_param
    AND o.is_deleted = false
    AND p.is_active = true
  GROUP BY 
    p.product_id, p.name
  ORDER BY 
    frequency DESC, quantity DESC
  LIMIT limit_num;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_most_ordered_products_for_shop TO authenticated;