// Shops page component for viewing nearby shops and marking visits
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import ShopItem from '../components/ShopItem';
import RecentVisitItem from '../components/RecentVisitItem';
import { useNearbyShops } from '../hooks/useNearbyShops';
import { useRecentVisits } from '../hooks/useRecentVisits';
import { useWorkStatus } from '../hooks/useWorkStatus';
import { Search, Plus, AlertCircle, Menu, LogOut, Clock, CheckCircle, X } from 'lucide-react';

// Target number of shops to visit per day
const TARGET_SHOPS_PER_DAY = 25;

const ShopsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Use custom hooks
  const { dayStarted, dayEnded, isOnBreak, checkingStatus } = useWorkStatus(user?.id);
  const { shops: nearbyShops, loading, error: shopsError } = useNearbyShops(userLocation, user?.id, searchTerm);
  const recentVisits = useRecentVisits(user?.id);
  
  // Check for success message in navigation state
  useEffect(() => {
    if (locationState.state && locationState.state.success) {
      setSuccessMessage(locationState.state.message || 'Operation completed successfully');
      
      // Clear the success message after 3 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [locationState]);
  
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
  
  // Handle shop search with debouncing
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);
  
  // Handle shop visit
  const handleVisitShop = useCallback((shopId: string) => {
    // Navigate to a new page or open a modal to record the visit
    navigate(`/shops/${shopId}/visit`);
  }, [navigate]);
  
  // Navigate to new shop creation
  const handleAddNewShop = useCallback(() => {
    navigate('/shops/new');
  }, [navigate]);
  
  // Toggle menu function
  const handleToggleMenu = useCallback(() => {
    setMenuOpen(prevState => !prevState);
  }, []);
  
  // Close menu when clicking outside
  const handleOutsideClick = useCallback(() => {
    setMenuOpen(false);
  }, []);
  
  // Handle logout
  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);
  
  // Check if the user is allowed to perform actions (day started and not on break)
  const canPerformActions = dayStarted && !dayEnded && !isOnBreak;
  
  // Show error from shops hook if present
  useEffect(() => {
    if (shopsError) {
      setError(shopsError);
    }
  }, [shopsError]);

  // Calculate remaining shops to visit
  const remainingVisits = TARGET_SHOPS_PER_DAY - recentVisits.length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logout */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm">
        <button 
          className="text-gray-800 focus:outline-none"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={handleToggleMenu}
        >
          {menuOpen ? <Menu size={24} /> : <Menu size={24} />}
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
      
      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={handleOutsideClick}>
          <div 
            className="bg-white h-full w-3/4 max-w-xs p-5 flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on menu content
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Menu</h2>
              <button 
                onClick={handleToggleMenu} 
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close menu"
              >
                <Menu size={24} />
              </button>
            </div>
            
            <div className="flex-grow">
              <button 
                onClick={handleAddNewShop}
                className="bg-white hover:bg-gray-100 text-gray-800 w-full py-3 px-4 rounded-lg font-medium mb-2 text-left flex items-center"
                disabled={!canPerformActions || checkingStatus}
              >
                <Plus size={20} className="mr-2" />
                Add New Shop
              </button>
              
              <button 
                onClick={handleLogout}
                className="bg-white hover:bg-gray-100 text-gray-800 w-full py-3 px-4 rounded-lg font-medium mb-2 text-left flex items-center"
              >
                <LogOut size={20} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      
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
        
        {/* Day Ended Warning */}
        {dayEnded && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            <span>Your work day has ended. Visit and add shop features are disabled.</span>
          </div>
        )}
        
        {/* Break Warning */}
        {isOnBreak && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>You are currently on break. Visit and add shop features are disabled.</span>
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
          className={`w-full ${
            canPerformActions && !checkingStatus
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-blue-300 cursor-not-allowed'
          } text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center mb-6`}
          disabled={!canPerformActions || checkingStatus}
        >
          <Plus className="mr-2 h-5 w-5" />
          New Shop
        </button>
        
        {/* Pending Visits Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">VISITS PENDING</h2>
            <span className="text-gray-600 font-medium">{remainingVisits} left</span>
          </div>
          
          {loading && nearbyShops.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : nearbyShops.length > 0 ? (
            <div className="space-y-4">
              {nearbyShops.map((shop) => (
                <ShopItem
                  key={shop.shop_id}
                  shop={shop}
                  onVisit={handleVisitShop}
                  canVisit={canPerformActions && !checkingStatus}
                />
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
                <RecentVisitItem key={`${visit.shop_id}-${index}`} visit={visit} />
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