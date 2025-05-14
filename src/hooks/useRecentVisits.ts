// Hook for fetching and managing recent shop visits
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Recent visit type definition
export interface RecentVisit {
  shop_id: string;
  name: string;
  visit_time: string;
}

// Cache item interface
interface CacheItem<T> {
  timestamp: number;
  data: T;
}

// Cache keys
const VISITS_CACHE_KEY = 'cached_recent_visits';

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * Custom hook for fetching and managing recent shop visits
 * @param userId User ID for fetching visit data
 * @returns Array of recent visits
 */
export const useRecentVisits = (userId: string | undefined) => {
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  // Load data from cache
  const loadCachedData = useCallback(() => {
    try {
      // Load visits from cache
      const cachedVisitsJSON = localStorage.getItem(VISITS_CACHE_KEY);
      if (cachedVisitsJSON) {
        const cachedVisits: CacheItem<RecentVisit[]> = JSON.parse(cachedVisitsJSON);
        
        if (Date.now() - cachedVisits.timestamp < CACHE_EXPIRY) {
          setRecentVisits(cachedVisits.data);
        }
      }
    } catch (err) {
      console.error('Error loading cached visits data:', err);
      // Continue with normal data fetching if cache loading fails
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback((data: RecentVisit[]) => {
    try {
      const cacheItem: CacheItem<RecentVisit[]> = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(VISITS_CACHE_KEY, JSON.stringify(cacheItem));
    } catch (err) {
      console.error('Error saving visits to cache:', err);
      // Continue even if caching fails
    }
  }, []);

  // Fetch fresh visits data
  const fetchFreshVisitsData = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('visits')
        .select(`
          visit_id,
          visit_time,
          shops (
            shop_id,
            name
          )
        `)
        .eq('sales_officer_id', userId)
        .gte('visit_time', today.toISOString())
        .eq('is_deleted', false)
        .order('visit_time', { ascending: false });
        
      if (error) {
        console.error('Error fetching recent visits:', error);
        return;
      }
      
      if (data) {
        // Create a Map to deduplicate shops and keep only the latest visit for each
        const uniqueShops = new Map<string, RecentVisit>();
        
        // Process each visit and only keep the most recent one per shop
        data.forEach(visit => {
          const shopId = visit.shops.shop_id;
          
          // Format the visit data
          const formattedVisit: RecentVisit = {
            shop_id: shopId,
            name: visit.shops.name,
            visit_time: new Date(visit.visit_time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          };
          
          // Since data is already ordered by visit_time (descending),
          // the first occurrence of each shop_id will be the most recent visit
          if (!uniqueShops.has(shopId)) {
            uniqueShops.set(shopId, formattedVisit);
          }
        });
        
        // Convert the Map values to array
        const deduplicatedVisits = Array.from(uniqueShops.values());
        
        setRecentVisits(deduplicatedVisits);
        
        // Cache the visits data
        saveToCache(deduplicatedVisits);
      }
    } catch (err) {
      console.error('Error fetching fresh visits data:', err);
    }
  }, [userId, saveToCache]);

  // Main effect to manage data fetching and caching
  useEffect(() => {
    // Load cached data first
    loadCachedData();

    if (userId) {
      // Check cache first
      const cachedVisitsJSON = localStorage.getItem(VISITS_CACHE_KEY);
      if (cachedVisitsJSON) {
        const cachedVisits: CacheItem<RecentVisit[]> = JSON.parse(cachedVisitsJSON);
        
        // Use cache if it's not expired
        if (Date.now() - cachedVisits.timestamp < CACHE_EXPIRY) {
          setRecentVisits(cachedVisits.data);
          
          // Fetch updated data in background
          fetchFreshVisitsData();
          return;
        }
      }
      
      // No valid cache, fetch fresh data
      fetchFreshVisitsData();
    }
  }, [userId, loadCachedData, fetchFreshVisitsData]);

  return recentVisits;
};