// Hook for fetching daily statistics
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

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
    totalShops: 25, // Default target value
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
          
        // Get orders for today and calculate total sales
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
          
        if (!visitsError && !ordersError) {
          // Calculate total sales amount
          const totalSales = orders ? orders.reduce((sum, order) => sum + Number(order.amount), 0) : 0;
          
          setDailyStats({
            ...dailyStats,
            visitedShops: visits ? visits.length : 0,
            orders: orders ? orders.length : 0,
            sales: totalSales
          });
        }
      }
    };

    fetchDailyStats();
  }, [user]);

  return dailyStats;
};