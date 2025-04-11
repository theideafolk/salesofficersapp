// Home page component with mobile-friendly design
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import CircularButton from '../components/CircularButton';
import ProgressBar from '../components/ProgressBar';
import MainButton from '../components/MainButton';
import AppHeader from '../components/AppHeader';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { supabase } from '../lib/supabase';
import { MapPin } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [dailyStats, setDailyStats] = useState({
    visitedShops: 0,
    totalShops: 25,
    orders: 0,
    sales: 0
  });
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    // Get sales officer name
    const fetchOfficerData = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('sales_officers')
          .select('name')
          .eq('sales_officers_id', user.id)
          .single();
          
        if (data && !error) {
          setUsername(data.name.split(' ')[0]); // Get first name
        } else {
          // Fallback to phone number if name isn't available
          const phone = user.phone?.substring(3) || 'User';
          setUsername(phone);
        }
      }
    };

    // Fetch today's stats
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

    fetchOfficerData();
    fetchDailyStats();
    
    // Check if location is enabled
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setLocationEnabled(result.state === 'granted');
      });
    }
    
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteSuccess = () => {
    navigate('/login');
  };
  
  const handleStartDay = () => {
    // In a real app, this would initialize the tracking and possibly
    // create a day entry in the database
    console.log('Starting day');
  };
  
  const handleVisitShop = () => {
    navigate('/shops');
  };
  
  const handleViewOrders = () => {
    navigate('/orders');
  };
  
  const handleToggleLocation = () => {
    if (!locationEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationEnabled(true),
        () => alert('Location access is required for this app to function properly.')
      );
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* App Header */}
      <AppHeader 
        onToggleMenu={() => setMenuOpen(!menuOpen)} 
        menuOpen={menuOpen} 
        onLogout={handleSignOut}
      />
      
      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20">
          <div className="bg-white h-full w-3/4 max-w-xs p-5 flex flex-col">
            <h2 className="text-xl font-bold mb-5">Menu</h2>
            
            <div className="flex-grow">
              <button 
                onClick={handleSignOut}
                className="bg-white hover:bg-gray-100 text-gray-800 w-full py-3 px-4 rounded-lg font-medium mb-2 text-left"
              >
                Logout
              </button>
              
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="bg-white hover:bg-gray-100 text-red-600 w-full py-3 px-4 rounded-lg font-medium text-left"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-2">
        <h1 className="text-3xl font-bold text-center mb-6">Hi {username}</h1>
        
        {/* Start Day Button */}
        <div className="flex justify-center mb-8">
          <CircularButton onClick={handleStartDay} color="success">
            <div className="text-center">
              <div className="text-2xl font-bold">START</div>
              <div className="text-2xl font-bold">DAY</div>
            </div>
          </CircularButton>
        </div>
        
        {/* Target Progress */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Your Target</h2>
          <ProgressBar 
            current={dailyStats.visitedShops} 
            total={dailyStats.totalShops} 
            height="h-4" 
          />
          <p className="text-center mt-2">
            {dailyStats.visitedShops} of {dailyStats.totalShops} shops
          </p>
        </div>
        
        {/* Today's Summary */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Today's Summary</h2>
          
          <div className="flex justify-between">
            <div className="text-center">
              <h3 className="text-lg">Orders:</h3>
              <p className="text-xl">{dailyStats.orders}</p>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg">Sales:</h3>
              <p className="text-xl">₹{dailyStats.sales}</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <MainButton onClick={handleVisitShop} variant="outline" fullWidth>
            Visit Shop
          </MainButton>
          
          <MainButton onClick={handleViewOrders} variant="primary" fullWidth>
            View Orders
          </MainButton>
        </div>
        
        {/* Location Button */}
        <MainButton 
          onClick={handleToggleLocation} 
          variant="warning" 
          fullWidth
          disabled={locationEnabled}
        >
          <div className="flex items-center justify-center">
            <MapPin className="mr-2" size={18} />
            {locationEnabled ? 'Location enabled' : 'Turn on location'}
          </div>
        </MainButton>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Delete Account Modal */}
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default HomePage;