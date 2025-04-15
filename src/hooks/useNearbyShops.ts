// Hook for fetching and managing nearby shops
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Shop type definition from the original ShopsPage
export interface Shop {
  shop_id: string;
  name: string;
  address: string;
  territory: string;
  city: string;
  state: string;
  country: string;
  owner_name?: string;
  phone_number?: string;
  contact_person?: string;
  distance?: number;
  last_visit_date?: string;
  gps_location?: string; // The string should be in format "(lng,lat)"
}

// Cache item interface
interface CacheItem<T> {
  timestamp: number;
  data: T;
  location?: { lat: number; lng: number };
}

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

// Cache keys
const SHOPS_CACHE_KEY = 'cached_nearby_shops';

/**
 * Custom hook for fetching and managing nearby shops
 * @param userLocation User's current location
 * @param userId User ID for fetching shop data
 * @param searchTerm Search term for filtering shops
 * @returns Object containing nearby shops, loading state, and error
 */
export const useNearbyShops = (
  userLocation: { lat: number; lng: number } | null, 
  userId: string | undefined,
  searchTerm: string
) => {
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached data immediately to show something while fetching fresh data
  const loadCachedData = useCallback(() => {
    try {
      // Load shops from cache
      const cachedShopsJSON = localStorage.getItem(SHOPS_CACHE_KEY);
      if (cachedShopsJSON) {
        const cachedShops: CacheItem<Shop[]> = JSON.parse(cachedShopsJSON);
        
        // Check if cache is still valid (not expired)
        if (Date.now() - cachedShops.timestamp < CACHE_EXPIRY) {
          setNearbyShops(cachedShops.data);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      // Continue with normal data fetching if cache loading fails
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback((data: any, userLoc?: { lat: number; lng: number }) => {
    try {
      const cacheItem: CacheItem<any> = {
        timestamp: Date.now(),
        data: data,
        location: userLoc
      };
      localStorage.setItem(SHOPS_CACHE_KEY, JSON.stringify(cacheItem));
    } catch (err) {
      console.error('Error saving to cache:', err);
      // Continue even if caching fails
    }
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI/180);
    const dLon = (lon2 - lon1) * (Math.PI/180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }, []);

  // Fetch fresh shop data from database
  const fetchFreshShopData = useCallback(async () => {
    if (!userLocation || !userId) return;
    
    try {
      setLoading(true);
      
      // Use a single RPC call to get shops with their last visit date
      // This combines two queries into one for better performance
      const { data: shops, error } = await supabase.rpc('get_shops_with_last_visit', {
        user_id: userId,
        lat: userLocation.lat,
        lng: userLocation.lng,
        limit_num: 5
      });
      
      if (error) {
        console.error('Error fetching shops with optimized query:', error);
        
        // Try the standard query as fallback
        const { data: standardShops, error: standardError } = await supabase.rpc('find_closest_shops', {
          lat: userLocation.lat,
          lng: userLocation.lng,
          limit_num: 5
        });
        
        if (standardError) {
          throw new Error(`Failed to fetch shops: ${standardError.message}`);
        }
        
        if (standardShops && standardShops.length > 0) {
          await processShops(standardShops);
        } else {
          setNearbyShops([]);
          setLoading(false);
        }
        
        return;
      }
      
      if (shops && shops.length > 0) {
        // Format shops data if needed
        const formattedShops = shops.map(shop => ({
          ...shop,
          // Convert any string dates to Date objects if needed
          last_visit_date: shop.last_visit_date || null
        }));
        
        setNearbyShops(formattedShops);
        
        // Cache the results with the current location
        saveToCache(formattedShops, userLocation);
      } else {
        setNearbyShops([]);
      }
      
    } catch (err) {
      console.error('Error fetching fresh shop data:', err);
      fallbackToRegularQuery();
    } finally {
      setLoading(false);
    }
  }, [userLocation, userId, saveToCache]);

  // Process shops to add last visit dates
  const processShops = useCallback(async (shops: Shop[]) => {
    if (!userId || !shops.length) {
      setNearbyShops([]);
      setLoading(false);
      return;
    }
    
    try {
      const shopIds = shops.map(shop => shop.shop_id);
      
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .select('shop_id, visit_time')
        .eq('sales_officer_id', userId)
        .in('shop_id', shopIds)
        .eq('is_deleted', false)
        .order('visit_time', { ascending: false });
        
      if (!visitError && visitData) {
        // Create a map of shop_id to latest visit date
        const lastVisitMap = visitData.reduce((map, visit) => {
          if (!map[visit.shop_id]) {
            map[visit.shop_id] = visit.visit_time;
          }
          return map;
        }, {} as Record<string, string>);
        
        // Update shops with last visit date
        const updatedShops = shops.map(shop => ({
          ...shop,
          last_visit_date: lastVisitMap[shop.shop_id] || null
        }));
        
        setNearbyShops(updatedShops);
        
        // Cache the processed shops
        if (userLocation) {
          saveToCache(updatedShops, userLocation);
        }
      } else {
        setNearbyShops(shops);
      }
    } catch (err) {
      console.error('Error processing shops:', err);
      setNearbyShops(shops);
    }
    
    setLoading(false);
  }, [userId, saveToCache, userLocation]);

  // Fallback method if the optimized queries fail
  const fallbackToRegularQuery = useCallback(async () => {
    if (!userLocation || !userId) return;
    
    try {
      setLoading(true);
      console.log('Falling back to regular shop query');
      
      // Query with limit for better performance
      const { data: allShops, error: fetchError } = await supabase
        .from('shops')
        .select('*')
        .eq('is_deleted', false)
        .limit(10);
        
      if (fetchError) {
        console.error('Error fetching all shops:', fetchError);
        setNearbyShops([]);
        setLoading(false);
        return;
      }
      
      if (allShops && allShops.length > 0) {
        // Apply basic distance calculation on client side
        const shopsWithDistance = allShops.map(shop => {
          // Extract coordinates from point string "(lng,lat)"
          let lng = 0;
          let lat = 0;
          
          try {
            if (shop.gps_location) {
              const coordString = shop.gps_location.toString().replace('(', '').replace(')', '');
              const [longitude, latitude] = coordString.split(',').map(parseFloat);
              lng = longitude;
              lat = latitude;
            }
          } catch (e) {
            console.error('Error parsing coordinates:', e);
          }
          
          // Calculate approximate distance (very rough estimate)
          const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            lat, 
            lng
          );
          
          return {
            ...shop,
            distance
          };
        });
        
        // Sort by calculated distance
        shopsWithDistance.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
        
        // Limit to 5 closest
        const closestShops = shopsWithDistance.slice(0, 5);
        
        await processShops(closestShops);
        
        // Cache results
        saveToCache(nearbyShops, userLocation);
      } else {
        setNearbyShops([]);
        setLoading(false);
      }
      
    } catch (err) {
      console.error('Error in fallback shop fetching:', err);
      setNearbyShops([]);
      setLoading(false);
    }
  }, [userLocation, userId, calculateDistance, processShops, saveToCache, nearbyShops]);

  // Fetch nearby shops when location and user ID are available
  useEffect(() => {
    // Load cached data first
    loadCachedData();

    // Fetch fresh data if location and user ID are available
    if (userLocation && userId) {
      // Check if we have valid cached data with similar location
      const cachedShopsJSON = localStorage.getItem(SHOPS_CACHE_KEY);
      if (cachedShopsJSON) {
        const cachedShops: CacheItem<Shop[]> = JSON.parse(cachedShopsJSON);
        
        // Check if cache is still valid and location is similar (within 100 meters)
        if (
          Date.now() - cachedShops.timestamp < CACHE_EXPIRY && 
          cachedShops.location && 
          calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            cachedShops.location.lat, 
            cachedShops.location.lng
          ) < 0.1 // 0.1 km = 100 meters
        ) { 
          // Use cached data and refresh in background
          setNearbyShops(cachedShops.data);
          setLoading(false);
          
          // Fetch fresh data in background
          fetchFreshShopData();
          return;
        }
      }
      
      // No valid cache, fetch fresh data
      fetchFreshShopData().catch(err => {
        console.error('Error fetching shop data:', err);
        setError('An error occurred while fetching shops.');
      });
    }
  }, [userLocation, userId, loadCachedData, calculateDistance, fetchFreshShopData]);

  // Filter shops based on search term
  const filteredShops = searchTerm 
    ? nearbyShops.filter(shop => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          shop.name.toLowerCase().includes(lowerSearchTerm) ||
          shop.address.toLowerCase().includes(lowerSearchTerm) ||
          (shop.owner_name && shop.owner_name.toLowerCase().includes(lowerSearchTerm)) ||
          (shop.phone_number && shop.phone_number.toLowerCase().includes(lowerSearchTerm))
        );
      })
    : nearbyShops;

  return { 
    shops: filteredShops, 
    loading, 
    error 
  };
};