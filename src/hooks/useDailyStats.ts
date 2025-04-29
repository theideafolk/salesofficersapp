// Hook for fetching daily statistics
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Target number of shops to visit per day
const TARGET_SHOPS_PER_DAY = 25;

interface DailyStats {
  visitedShops: number;
  totalShops: number;
  orders: number;
  sales: number;
}

/**
 * Custom hook for fetching daily statistics
 * @param user The authenticated user object
 * @returns Daily statistics object
 */
export const useDailyStats = (user: User | null) => {
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    visitedShops: 0,
    totalShops: TARGET_SHOPS_PER_DAY, // Default target value
    orders: 0,
    sales: 0
  });

  useEffect(() => {
    const fetchDailyStats = async () => {
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get visits for today
        const { data: visits, error: visitsError } = await supabase
          .from('visits')
          .select('visit_id')
          .eq('sales_officer_id', user.id)
          .gte('visit_time', today.toISOString())
          .is('is_deleted', false);
          
        // Get orders for today with DISTINCT order_ids
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            order_id,
            amount,
            visits!inner(
              visit_id,
              sales_officer_id,
              visit_time
            )
          `)
          .eq('visits.sales_officer_id', user.id)
          .gte('visits.visit_time', today.toISOString())
          .is('is_deleted', false);
          
        if (!visitsError && !ordersError && orders) {
          // Get unique order IDs (since we're storing one row per product in the order)
          const uniqueOrderIds = new Set(orders.map(item => item.order_id));
          const orderCount = uniqueOrderIds.size;
          
          // Calculate total sales amount
          const totalSales = orders.reduce((sum, order) => sum + Number(order.amount), 0);
          
          setDailyStats({
            ...dailyStats,
            visitedShops: visits ? visits.length : 0,
            orders: orderCount, // Use the count of unique order IDs
            sales: totalSales
          });
        }
      }
    };

    fetchDailyStats();
  }, [user]);

  return dailyStats;
};