import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types/products';

interface TopProduct {
  product_id: string;
  name: string;
  quantity: number;
  frequency: number;
}

export const useShopTopProducts = (shopId: string | undefined) => {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsWithDetails, setProductsWithDetails] = useState<Product[]>([]);

  useEffect(() => {
    const fetchTopProducts = async () => {
      if (!shopId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Call our custom function to get top ordered products
        const { data, error: functionError } = await supabase.rpc(
          'get_most_ordered_products_for_shop',
          { shop_id_param: shopId, limit_num: 5 }
        );
        
        if (functionError) throw functionError;
        
        if (data && data.length > 0) {
          setTopProducts(data);
          
          // Fetch complete product details for these top products
          const productIds = data.map(item => item.product_id);
          
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select(`
              *,
              schemes(scheme_text, scheme_scope)
            `)
            .in('product_id', productIds)
            .eq('is_active', true);
          
          if (productsError) throw productsError;
          
          if (productsData) {
            // Process products to add offer product names where applicable
            const enhancedProducts: Product[] = await Promise.all(
              productsData.map(async (product) => {
                // If product has an offer item, fetch its name
                if (product.product_item_offer_id) {
                  const { data: offerProduct } = await supabase
                    .from('products')
                    .select('name')
                    .eq('product_id', product.product_item_offer_id)
                    .single();
                  
                  return {
                    ...product,
                    offer_product_name: offerProduct?.name
                  };
                }
                
                return product;
              })
            );
            
            setProductsWithDetails(enhancedProducts);
          }
        } else {
          setTopProducts([]);
          setProductsWithDetails([]);
        }
      } catch (err) {
        console.error('Error fetching top products:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, [shopId]);

  return { topProducts, productsWithDetails, loading, error };
};

export default useShopTopProducts;