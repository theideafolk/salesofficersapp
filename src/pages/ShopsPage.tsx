// Shops page component for viewing nearby shops and marking visits
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { Search, Plus, MapPin, User, CheckCircle, AlertCircle, Menu, LogOut, Phone } from 'lucide-react';

// Cache keys
const SHOPS_CACHE_KEY = 'cached_nearby_shops';
const VISITS_CACHE_KEY = 'cached_recent_visits';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Shop type definition
interface Shop {
  shop_id: string;
  name: string;
  address: string;
  territory: string;
  city: string;
  state: string;
  owner_name?: string;
  phone_number?: string;
  contact_person?: string;
  distance?: number;
  last_visit_date?: string;
}

// Recent visit type definition
interface RecentVisit {
  shop_id: string;
  name: string;
  visit_time: string;
}

// Cache item interface
interface CacheItem<T> {
  timestamp: number;
  data: T;
  location?: { lat: number; lng: number };
}

const ShopsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check for success message in navigation state
  useEffect(() => {
    if (location.state && location.state.success) {
      setSuccessMessage(location.state.message || 'Operation completed successfully');
      
      // Clear the success message after 3 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please ensure location services are enabled.');
        },
        // Add options for faster location retrieval
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  }, []);
  
  // Load cached data immediately to show something while fetching fresh data
  useEffect(() => {
    loadCachedData();
  }, []);
  
  // Fetch nearby shops and recent visits when location is available
  useEffect(() => {
    if (userLocation && user) {
      fetchNearbyShops();
      fetchRecentVisits();
    }
  }, [userLocation, user]);
  
  // Load data from cache
  const loadCachedData = () => {
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
      
      // Load visits from cache
      const cachedVisitsJSON = localStorage.getItem(VISITS_CACHE_KEY);
      if (cachedVisitsJSON) {
        const cachedVisits: CacheItem<RecentVisit[]> = JSON.parse(cachedVisitsJSON);
        
        if (Date.now() - cachedVisits.timestamp < CACHE_EXPIRY) {
          setRecentVisits(cachedVisits.data);
        }
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      // Continue with normal data fetching if cache loading fails
    }
  };
  
  // Save data to cache
  const saveToCache = (key: string, data: any, userLoc?: { lat: number; lng: number }) => {
    try {
      const cacheItem: CacheItem<any> = {
        timestamp: Date.now(),
        data: data,
        location: userLoc
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (err) {
      console.error('Error saving to cache:', err);
      // Continue even if caching fails
    }
  };
  
  // Fetch nearby shops using PostGIS with optimized query
  const fetchNearbyShops = async () => {
    if (!userLocation) return;
    
    try {
      setError(null);
      
      // Check if we have valid cached data with similar location
      const cachedShopsJSON = localStorage.getItem(SHOPS_CACHE_KEY);
      if (cachedShopsJSON) {
        const cachedShops: CacheItem<Shop[]> = JSON.parse(cachedShopsJSON);
        
        // Check if cache is still valid and location is similar (within 100 meters)
        if (Date.now() - cachedShops.timestamp < CACHE_EXPIRY && 
            cachedShops.location && 
            calculateDistance(
              userLocation.lat, 
              userLocation.lng, 
              cachedShops.location.lat, 
              cachedShops.location.lng
            ) < 0.1) { // 0.1 km = 100 meters
          
          // Use cached data and refresh in background
          setNearbyShops(cachedShops.data);
          setLoading(false);
          
          // Fetch fresh data in background
          fetchFreshShopData();
          return;
        }
      }
      
      // No valid cache, fetch fresh data
      await fetchFreshShopData();
      
    } catch (err) {
      console.error('Error in shop fetching process:', err);
      setError('An error occurred while fetching nearby shops.');
      fallbackToRegularQuery();
    }
  };
  
  // Fetch fresh shop data from database
  const fetchFreshShopData = async () => {
    if (!userLocation || !user) return;
    
    try {
      setLoading(true);
      
      // Use a single RPC call to get shops with their last visit date
      // This combines two queries into one for better performance
      const { data: shops, error } = await supabase.rpc('get_shops_with_last_visit', {
        user_id: user.id,
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
        saveToCache(SHOPS_CACHE_KEY, formattedShops, userLocation);
      } else {
        setNearbyShops([]);
      }
      
    } catch (err) {
      console.error('Error fetching fresh shop data:', err);
      fallbackToRegularQuery();
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback method if the optimized queries fail
  const fallbackToRegularQuery = async () => {
    if (!userLocation || !user) return;
    
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
        saveToCache(SHOPS_CACHE_KEY, nearbyShops, userLocation);
      } else {
        setNearbyShops([]);
        setLoading(false);
      }
      
    } catch (err) {
      console.error('Error in fallback shop fetching:', err);
      setNearbyShops([]);
      setLoading(false);
    }
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };
  
  // Process shops to add last visit dates
  const processShops = async (shops: Shop[]) => {
    if (!user || !shops.length) {
      setNearbyShops([]);
      setLoading(false);
      return;
    }
    
    try {
      const shopIds = shops.map(shop => shop.shop_id);
      
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .select('shop_id, visit_time')
        .eq('sales_officer_id', user.id)
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
        saveToCache(SHOPS_CACHE_KEY, updatedShops, userLocation);
      } else {
        setNearbyShops(shops);
      }
    } catch (err) {
      console.error('Error processing shops:', err);
      setNearbyShops(shops);
    }
    
    setLoading(false);
  };
  
  // Fetch recent visits with optimized query
  const fetchRecentVisits = async () => {
    if (!user) return;
    
    try {
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
      await fetchFreshVisitsData();
      
    } catch (err) {
      console.error('Error handling visits cache:', err);
      // Proceed with fresh fetch on error
      await fetchFreshVisitsData();
    }
  };
  
  // Fetch fresh visits data
  const fetchFreshVisitsData = async () => {
    if (!user) return;
    
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
        .eq('sales_officer_id', user.id)
        .gte('visit_time', today.toISOString())
        .eq('is_deleted', false)
        .order('visit_time', { ascending: false });
        
      if (error) {
        console.error('Error fetching recent visits:', error);
        return;
      }
      
      if (data) {
        const visits = data.map(visit => ({
          shop_id: visit.shops.shop_id,
          name: visit.shops.name,
          visit_time: new Date(visit.visit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        setRecentVisits(visits);
        
        // Cache the visits data
        saveToCache(VISITS_CACHE_KEY, visits);
      }
    } catch (err) {
      console.error('Error fetching fresh visits data:', err);
    }
  };
  
  // Handle shop search with debouncing
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);
  
  // Memoize filtered shops to prevent unnecessary re-filtering
  const filteredShops = useMemo(() => {
    if (!searchTerm) return nearbyShops;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return nearbyShops.filter(shop => 
      shop.name.toLowerCase().includes(lowerSearchTerm) ||
      shop.address.toLowerCase().includes(lowerSearchTerm) ||
      (shop.owner_name && shop.owner_name.toLowerCase().includes(lowerSearchTerm)) ||
      (shop.phone_number && shop.phone_number.toLowerCase().includes(lowerSearchTerm))
    );
  }, [nearbyShops, searchTerm]);
  
  // Handle shop visit
  const handleVisitShop = useCallback((shopId: string) => {
    // Navigate to a new page or open a modal to record the visit
    navigate(`/shops/${shopId}/visit`);
  }, [navigate]);
  
  // Format date to display as "Apr 15"
  const formatLastVisitDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    
    return `${month} ${day}`;
  };
  
  // Navigate to new shop creation
  const handleAddNewShop = useCallback(() => {
    navigate('/shops/new');
  }, [navigate]);
  
  // Handle logout
  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  // Truncate text with ellipsis
  const truncateText = useCallback((text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logout */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm">
        <button 
          className="text-gray-800 focus:outline-none"
          aria-label="Menu"
        >
          <Menu size={24} />
        </button>
        
        <h1 className="text-xl font-bold">Visit Shop</h1>
        
        <button 
          onClick={handleLogout}
          className="text-gray-800 focus:outline-none"
          aria-label="Logout"
        >
          <LogOut size={24} />
        </button>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-4">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
            placeholder="Search shop by name or number"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        {/* New Shop Button */}
        <button
          onClick={handleAddNewShop}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center mb-6"
        >
          <Plus className="mr-2 h-5 w-5" />
          New Shop
        </button>
        
        {/* Pending Visits Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">VISITS PENDING</h2>
            <span className="text-gray-600 font-medium">{filteredShops.length} left</span>
          </div>
          
          {loading && nearbyShops.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredShops.length > 0 ? (
            <div className="space-y-4">
              {filteredShops.map((shop) => (
                <div key={shop.shop_id} className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div className="w-3/4">
                      <h3 className="text-lg font-bold">{shop.name}</h3>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{truncateText(shop.address, 30)}</span>
                      </div>
                      
                      {/* Owner and phone information displayed side by side */}
                      <div className="flex items-center text-gray-600 mt-1">
                        <User className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
                        <span>{shop.owner_name || "No owner"}</span>
                        
                        {/* Spacer */}
                        <span className="mx-2">•</span>
                        
                        <Phone className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
                        <span>{shop.phone_number || "No phone"}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mt-1">
                        <User className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
                        <span>Last visit: {formatLastVisitDate(shop.last_visit_date)}</span>
                      </div>
                      {shop.distance !== undefined && (
                        <div className="text-gray-600 mt-1">
                          <span>Distance: {shop.distance.toFixed(2)} km</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleVisitShop(shop.shop_id)}
                      className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-8 rounded-lg text-base"
                    >
                      Visit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No shops found nearby. Try adding a new shop.
            </div>
          )}
        </div>
        
        {/* Recently Visited Section */}
        {recentVisits.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">RECENTLY VISITED</h2>
            <div className="space-y-4">
              {recentVisits.map((visit, index) => (
                <div key={`${visit.shop_id}-${index}`} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium">{visit.name}</span>
                  </div>
                  <span className="text-gray-600">{visit.visit_time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ShopsPage;