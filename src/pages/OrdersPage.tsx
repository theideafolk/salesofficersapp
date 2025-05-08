// Orders page component for viewing and managing orders
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Plus, CheckCircle, MapPin, Gift, X, History, AlertCircle } from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import { useNearbyShops, Shop as NearbyShop } from '../hooks/useNearbyShops';
import ShopSelector from '../components/orders/ShopSelector';
import ShopHeader from '../components/orders/ShopHeader';
import ShopOrdersList from '../components/orders/ShopOrdersList';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import useShopOrders, { Order } from '../hooks/useShopOrders';
import useShopDetails, { Shop } from '../hooks/useShopDetails';
import { formatLastVisitDate } from '../utils/shopHelpers';
import { useWorkStatus } from '../hooks/useWorkStatus';

interface VisitedShop {
  visit_id: string;
  shop_id: string;
  shop_name: string;
  visit_time: string;
}

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation();
  
  // Get work status
  const { dayStarted, isOnBreak } = useWorkStatus(user?.id);
  
  // State
  const [activeTab, setActiveTab] = useState<'visited' | 'nearby'>('visited');
  const [searchTerm, setSearchTerm] = useState('');
  const [visitedShops, setVisitedShops] = useState<VisitedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Custom hooks
  const { shops: nearbyShops, loading: nearbyShopsLoading } = 
    useNearbyShops(userLocation, user?.id, searchTerm);
  
  const { orders: shopOrders, loading: ordersLoading } = useShopOrders(selectedShopId);

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
  
  // Check for success message in navigation state
  useEffect(() => {
    if (locationState.state && locationState.state.success) {
      // Success message handling could be added here
      // For now we're not showing any success message
    }
  }, [locationState]);
  
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
    try {
      setLoading(true);
      
      // Fetch shop details to get phone, email, etc.
      const { data: shopData } = await supabase
        .from('shops')
        .select('owner_name, phone_number')
        .eq('shop_id', shopId)
        .single();
      
      if (shopData) {
        setSelectedShop({
          shop_id: shopId,
          name: shopName,
          last_visit: 'Recent',
          phone_number: shopData.phone_number,
          owner_name: shopData.owner_name
        });
        
        setSelectedShopId(shopId);
      }
    } catch (err) {
      console.error('Error fetching shop details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open the order details modal
  const handleOpenOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  // Close the order details modal
  const handleCloseOrderDetails = () => {
    setIsOrderDetailsModalOpen(false);
    setSelectedOrder(null);
  };
  
  // Handle creating a new order
  const handleNewOrder = (shopId: string, shopName: string) => {
    // Find the visit for this shop
    const shopVisit = visitedShops.find(visit => visit.shop_id === shopId);
    
    if (shopVisit) {
      // Navigate to place order page with shop and visit info
      navigate(`/shops/${shopId}/order`, {
        state: {
          visitId: shopVisit.visit_id,
          shopName: shopName
        }
      });
    } else {
      // If no visit found, redirect to shop visit page first
      navigate(`/shops/${shopId}/visit`);
    }
  };

  // Handle viewing order history
  const handleViewHistory = (shopId: string, shopName: string) => {
    handleSelectShop(shopId, shopName);
  };
  
  // Handle editing an existing order
  const handleEditOrder = (order: Order) => {
    if (!selectedShop) return;
    
    // Navigate to place order page with shop and order info
    navigate(`/shops/${selectedShop.shop_id}/order`, {
      state: {
        shopName: selectedShop.name,
        orderToEdit: order,
        isEditing: true
      }
    });
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle tab change
  const handleTabChange = (tab: 'visited' | 'nearby') => {
    setActiveTab(tab);
  };
    
  // Handle back button
  const handleBack = () => {
    if (selectedShopId) {
      // Go back to shop list
      setSelectedShopId(null);
    } else {
      // Go back to previous page
      navigate(-1);
    }
  };

  // Determine if user can place orders
  const canPlaceOrder = dayStarted && !isOnBreak;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm relative">
        <img src="/assets/Benzorgo_revised_logo.png" alt="Logo" className="h-12 w-auto absolute left-4 top-1/2 -translate-y-1/2" />
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold">
            {selectedShopId ? 'Past Orders' : 'Orders'}
          </h1>
        </div>
      </header>
      <main className="flex-grow px-4 pb-20 pt-4">
        {/* Show break message if on break */}
        {isOnBreak && (
          <div className="mb-4 w-full p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            You are currently on break. New Orders feature is disabled
          </div>
        )}
        {/* Show different content based on whether a shop is selected */}
        {selectedShopId && selectedShop ? (
          <>
            <ShopHeader shopName={selectedShop.name} />
            <ShopOrdersList 
              orders={shopOrders} 
              loading={ordersLoading}
              onOpenOrderDetails={handleOpenOrderDetails}
              onEditOrder={handleEditOrder}
            />
          </>
        ) : (
          <ShopSelector 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            visitedShops={visitedShops}
            nearbyShops={nearbyShops}
            onSelectShop={handleSelectShop}
            onNewOrder={handleNewOrder}
            onViewHistory={handleViewHistory}
            loading={loading}
            nearbyShopsLoading={nearbyShopsLoading}
            canPlaceOrder={canPlaceOrder}
          />
        )}
      </main>
      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={handleCloseOrderDetails}
        order={selectedOrder}
        shop={selectedShop}
      />
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default OrdersPage;