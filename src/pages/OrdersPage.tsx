// Orders page component for viewing and managing orders
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Plus, CheckCircle, MapPin } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import { useNearbyShops } from '../hooks/useNearbyShops';
import { formatLastVisitDate } from '../utils/shopHelpers';

// Types
interface Shop {
  shop_id: string;
  name: string;
  last_visit?: string;
  distance?: number;
  address?: string;
  last_visit_date?: string;
}

interface Order {
  order_id: string;
  date: string;
  amount: number;
  status: 'placed' | 'delivered' | 'cancelled';
}

interface VisitedShop {
  visit_id: string;
  shop_id: string;
  shop_name: string;
  visit_time: string;
}

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState<'visited' | 'nearby'>('visited');
  const [searchTerm, setSearchTerm] = useState('');
  const [visitedShops, setVisitedShops] = useState<VisitedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
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
        },
        // Add options for faster location retrieval
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);
  
  // Use the useNearbyShops hook to get nearby shops
  const { shops: nearbyShops, loading: nearbyShopsLoading } = useNearbyShops(userLocation, user?.id, searchTerm);
  
  // Fetch visited shops
  useEffect(() => {
    const fetchVisitedShops = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch today's visits with shop information
        const { data, error } = await supabase
          .from('visits')
          .select(`
            visit_id,
            visit_time,
            shop_id,
            shops (
              name
            )
          `)
          .eq('sales_officer_id', user.id)
          .gte('visit_time', today.toISOString())
          .eq('is_deleted', false)
          .order('visit_time', { ascending: false });
          
        if (error) {
          console.error('Error fetching visited shops:', error);
          return;
        }
        
        if (data) {
          // Format the visits data
          const formattedVisits = data.map(visit => ({
            visit_id: visit.visit_id,
            shop_id: visit.shop_id,
            shop_name: visit.shops.name,
            visit_time: new Date(visit.visit_time).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          }));
          
          setVisitedShops(formattedVisits);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisitedShops();
  }, [user]);
  
  // Handle shop selection
  const handleSelectShop = async (shopId: string, shopName: string) => {
    // Set the selected shop
    setSelectedShop({
      shop_id: shopId,
      name: shopName,
      last_visit: 'Recent'
    });
    
    try {
      setLoading(true);
      
      // Fetch orders for this shop
      const { data, error } = await supabase
        .from('orders')
        .select(`
          order_id,
          amount,
          created_at,
          visits!inner(
            visit_id,
            shop_id
          )
        `)
        .eq('visits.shop_id', shopId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching shop orders:', error);
        return;
      }
      
      if (data) {
        // Group orders by date and sum amounts
        const ordersByDate = data.reduce((acc, order) => {
          const date = new Date(order.created_at).toLocaleDateString();
          
          if (!acc[date]) {
            acc[date] = {
              date,
              amount: 0,
              status: 'delivered' as const,
              order_id: order.order_id
            };
          }
          
          acc[date].amount += Number(order.amount);
          
          return acc;
        }, {} as Record<string, Order>);
        
        // Convert to array and sort by date (newest first)
        const ordersArray = Object.values(ordersByDate).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        // Mark the most recent order as "placed" instead of "delivered"
        if (ordersArray.length > 0) {
          ordersArray[0].status = 'placed';
        }
        
        setShopOrders(ordersArray);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle creating a new order
  const handleCreateOrder = () => {
    if (!selectedShop) return;
    
    // Find the visit for this shop
    const shopVisit = visitedShops.find(visit => visit.shop_id === selectedShop.shop_id);
    
    if (shopVisit) {
      // Navigate to place order page with shop and visit info
      navigate(`/shops/${selectedShop.shop_id}/order`, {
        state: {
          visitId: shopVisit.visit_id,
          shopName: selectedShop.name
        }
      });
    } else {
      // If no visit found, redirect to shop visit page first
      navigate(`/shops/${selectedShop.shop_id}/visit`);
    }
  };
  
  // Handle view order details
  const handleViewOrder = (orderId: string) => {
    // In a real app, this would navigate to an order details page
    console.log('View order:', orderId);
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter shops based on search term
  const filteredVisitedShops = searchTerm 
    ? visitedShops.filter(shop => 
        shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : visitedShops;
    
  // Handle back button
  const handleBack = () => {
    if (selectedShop) {
      // Go back to shop list
      setSelectedShop(null);
    } else {
      // Go back to previous page
      navigate(-1);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };
  
  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center py-4 px-4 bg-white shadow-sm">
        <button 
          onClick={handleBack}
          className="text-gray-800 focus:outline-none mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
        
        <h1 className="text-xl font-bold">
          {selectedShop ? 'Past Orders' : 'Select a Shop'}
        </h1>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-4">
        {/* Show different content based on whether a shop is selected */}
        {selectedShop ? (
          <>
            {/* Shop name heading */}
            <h2 className="text-3xl font-bold mb-6">{selectedShop.name}</h2>
            
            {/* Create New Order button */}
            <button
              onClick={handleCreateOrder}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center text-lg mb-8"
            >
              <Plus size={24} className="mr-2" />
              CREATE NEW ORDER
            </button>
            
            {/* Recent Orders section */}
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-4">Recent Orders for This Shop</h3>
              
              {shopOrders.length > 0 ? (
                <div className="space-y-4">
                  {shopOrders.map((order) => (
                    <div key={order.order_id} className="border rounded-lg overflow-hidden">
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          <p className="text-xl font-bold">{formatDisplayDate(order.date)}</p>
                          <div className="flex items-center mt-1">
                            <div className={`w-3 h-3 rounded-full ${
                              order.status === 'placed' ? 'bg-green-500' : 
                              order.status === 'delivered' ? 'bg-blue-500' : 'bg-red-500'
                            } mr-2`}></div>
                            <span className="text-gray-700">
                              Order {order.status === 'placed' ? 'Placed' : 
                                    order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-bold">{formatCurrency(order.amount)}</span>
                          <button 
                            onClick={() => handleViewOrder(order.order_id)}
                            className="text-blue-500 font-medium mt-1"
                          >
                            VIEW
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No orders found for this shop.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Shop selection tabs */}
            <div className="flex rounded-full bg-gray-100 p-1 mb-6">
              <button
                className={`flex-1 py-2 rounded-full ${
                  activeTab === 'visited' ? 'bg-blue-500 text-white' : 'text-gray-700'
                }`}
                onClick={() => setActiveTab('visited')}
              >
                Visited Shops
              </button>
              <button
                className={`flex-1 py-2 rounded-full ${
                  activeTab === 'nearby' ? 'bg-blue-500 text-white' : 'text-gray-700'
                }`}
                onClick={() => setActiveTab('nearby')}
              >
                Nearby Shops
              </button>
            </div>
            
            {/* Search bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-lg block w-full pl-10 p-2.5"
                placeholder="Search by shop name"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            
            {/* Shop list heading */}
            <h2 className="text-2xl font-bold mb-4">
              {activeTab === 'visited' ? 'Shops Visited Today' : 'Shops Near You'}
            </h2>
            
            {/* Shop list */}
            {activeTab === 'visited' ? (
              // Visited shops view
              loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredVisitedShops.length > 0 ? (
                <div className="space-y-6">
                  {filteredVisitedShops.map((shop) => (
                    <div key={shop.visit_id} className="border-b pb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold">{shop.shop_name}</h3>
                          <p className="text-gray-600">Visited at {shop.visit_time}</p>
                        </div>
                        <button
                          onClick={() => handleSelectShop(shop.shop_id, shop.shop_name)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg"
                        >
                          Place Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No shops visited today. Visit a shop to place orders.
                </div>
              )
            ) : (
              // Nearby shops view
              nearbyShopsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : nearbyShops.length > 0 ? (
                <div className="space-y-6">
                  {nearbyShops.map((shop) => (
                    <div key={shop.shop_id} className="border-b pb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold">{shop.name}</h3>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{shop.distance?.toFixed(1)} km away</span>
                          </div>
                          {shop.last_visit_date && (
                            <div className="text-gray-600 mt-1">
                              Last visit: {formatLastVisitDate(shop.last_visit_date)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSelectShop(shop.shop_id, shop.name)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg"
                        >
                          Place Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No shops found nearby. Try adding new shops or check your location settings.
                </div>
              )
            )}
          </>
        )}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default OrdersPage;