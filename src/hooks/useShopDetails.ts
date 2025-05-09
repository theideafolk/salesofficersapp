import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Shop {
  shop_id: string;
  name: string;
  address?: string;
  territory?: string;
  city?: string;
  state?: string;
  country?: string;
  owner_name?: string;
  phone_number?: string;
  last_visit?: string;
  last_visit_date?: string;
  distance?: number;
}

export const useShopDetails = (shopId: string | null) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopDetails = async () => {
      if (!shopId) {
        setShop(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const { data, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('shop_id', shopId)
          .single();
          
        if (shopError) {
          throw new Error(`Error fetching shop details: ${shopError.message}`);
        }
        
        if (data) {
          setShop({
            shop_id: data.shop_id,
            name: data.name,
            address: data.address,
            territory: data.territory,
            city: data.city,
            state: data.state,
            country: data.country,
            owner_name: data.owner_name,
            phone_number: data.phone_number,
            last_visit: 'Recent' // This is just a placeholder
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchShopDetails();
  }, [shopId]);

  return { shop, loading, error, setShop };
};

export default useShopDetails;