import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  free_qty?: number;
  free_product_name?: string;
  scheme_id?: number;
  scheme_text?: string;
  unit_of_measure?: string;
}

export interface Order {
  order_id: string;
  date: string;
  amount: number;
  status: 'placed';
  items?: OrderItem[];
}

export const useShopOrders = (shopId: string | null) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!shopId) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch orders and detailed item information for this shop
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            order_id,
            amount,
            quantity,
            product_id,
            free_qty,
            free_product_id,
            scheme_id,
            created_at,
            main_product:products!orders_product_id_fkey(name, unit_of_measure),
            free_product:products!orders_free_product_id_fkey(name),
            schemes(scheme_text),
            visits!inner(
              visit_id,
              shop_id
            )
          `)
          .eq('visits.shop_id', shopId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });
          
        if (orderError) {
          throw new Error(`Error fetching shop orders: ${orderError.message}`);
        }
        
        if (orderData) {
          // Group by order_id only
          const ordersMap = new Map<string, Order>();

          orderData.forEach(item => {
            const orderId = item.order_id;
            
            // Create or update order in the map
            if (!ordersMap.has(orderId)) {
              ordersMap.set(orderId, {
                order_id: orderId,
                date: item.created_at, // Store the created_at timestamp
                amount: 0, // Will accumulate below
                status: 'placed', // All orders have 'placed' status now
                items: []
              });
            }
            
            const order = ordersMap.get(orderId)!;
            
            // Update date if this item has a more recent timestamp
            if (new Date(item.created_at) > new Date(order.date)) {
              order.date = item.created_at;
            }
            
            // Add to total amount
            order.amount += Number(item.amount);
            
            // Add item details
            order.items!.push({
              product_id: item.product_id,
              product_name: item.main_product.name,
              quantity: item.quantity,
              amount: Number(item.amount),
              unit_price: Number(item.amount) / item.quantity,
              free_qty: item.free_qty || 0,
              free_product_name: item.free_product_id ? item.free_product.name : undefined,
              scheme_id: item.scheme_id,
              scheme_text: item.scheme_id ? item.schemes?.scheme_text : undefined,
              unit_of_measure: item.main_product.unit_of_measure
            });
          });
          
          // Convert map to array and sort by date (newest first)
          const ordersArray = Array.from(ordersMap.values())
            .sort((a, b) => {
              // Sort by created_at timestamp
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
          
          setOrders(ordersArray);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [shopId]);

  return { orders, loading, error };
};

export default useShopOrders;