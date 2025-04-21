/*
  # Insert Initial Scheme Records

  1. Changes
     - Insert 4 initial records into the schemes table
     - 3 product-level schemes and 1 order-level scheme
     - Set appropriate scheme texts and minimum price values
     
  2. Purpose
     - Populate the schemes table with initial data
     - Provide examples of different scheme types
*/

-- Insert scheme records
INSERT INTO public.schemes (scheme_text, scheme_scope, scheme_min_price, is_active)
VALUES 
  -- Record 1: Simple product scheme
  ('Buy ''X'' get ''Y''', 'product', NULL, true),
  
  -- Record 2: Product scheme with OR condition
  ('Buy ''X'' get ''Y'' or product_id', 'product', NULL, true),
  
  -- Record 3: Product scheme with AND condition
  ('Buy ''X'' get ''Y'' and product_id', 'product', NULL, true),
  
  -- Record 4: Order-level scheme with minimum price
  ('Buy a minimum stock of Rs ''X'' (Ex GST) Get 1 Traveler Bag Free worth Rs 600/-', 'order', 2500, true);