// Home page component with mobile-friendly design
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

// Components
import AppHeader from '../components/AppHeader';
import BottomNavigation from '../components/BottomNavigation';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ConfirmEndDayModal from '../components/ConfirmEndDayModal';
import SideMenu from '../components/home/SideMenu';
import DayStartedView from '../components/home/DayStartedView';
import DayEndedView from '../components/home/DayEndedView';
import StartDayView from '../components/home/StartDayView';
import TargetProgress from '../components/home/TargetProgress';
import DailySummary from '../components/home/DailySummary';
import ActionButtons from '../components/home/ActionButtons';
import LocationStatus from '../components/home/LocationStatus';

// Custom hooks
import { useWorkHours } from '../hooks/useWorkHours';
import { useUserProfile } from '../hooks/useUserProfile';
import { useDailyStats } from '../hooks/useDailyStats';
import { useLocationStatus } from '../hooks/useLocationStatus';

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // UI state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Custom hooks
  const username = useUserProfile(user);
  const dailyStats = useDailyStats(user);
  const { locationEnabled, handleToggleLocation } = useLocationStatus();
  
  // Work hours hook
  const [
    { 
      dayStarted, 
      dayEnded, 
      startTime, 
      isOnBreak, 
      elapsedTime,
      isLoading,
      isEndDayLoading,
      errorMessage
    },
    {
      startDay,
      endDay,
      toggleBreak,
      confirmEndDay
    }
  ] = useWorkHours(user?.id);
  
  // Event handlers
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteSuccess = () => {
    navigate('/login');
  };
  
  const handleVisitShop = () => {
    navigate('/shops');
  };
  
  const handleViewOrders = () => {
    navigate('/orders');
  };
  
  // Toggle menu function
  const handleToggleMenu = useCallback(() => {
    setMenuOpen(prevState => !prevState);
  }, []);

  // Close menu when clicking outside of it
  const handleOutsideClick = useCallback(() => {
    setMenuOpen(false);
  }, []);
  
  // Handle end day confirmation
  const handleConfirmEndDay = () => {
    setIsEndDayModalOpen(true);
  };
  
  // Execute end day when confirmed
  const handleEndDay = async () => {
    await endDay();
    setIsEndDayModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* App Header */}
      <AppHeader 
        onToggleMenu={handleToggleMenu} 
        menuOpen={menuOpen} 
        onLogout={handleSignOut}
      />
      
      {/* Side Menu */}
      <SideMenu
        isOpen={menuOpen}
        onClose={handleOutsideClick}
        onLogout={handleSignOut}
        onDeleteAccount={() => setIsDeleteModalOpen(true)}
      />
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-2">
        <h1 className="text-3xl font-bold text-center mb-6">Hi {username}</h1>
        
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertTriangle size={18} className="mr-2" />
            {errorMessage}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Day Status View - Show different UI based on day status */}
            {dayStarted ? (
              <DayStartedView
                startTime={startTime}
                isOnBreak={isOnBreak}
                elapsedTime={elapsedTime}
                onEndDay={handleConfirmEndDay}
                onToggleBreak={toggleBreak}
              />
            ) : dayEnded ? (
              <DayEndedView />
            ) : (
              <StartDayView onStartDay={startDay} />
            )}
            
            {/* Target Progress */}
            <TargetProgress
              visitedShops={dailyStats.visitedShops}
              totalShops={dailyStats.totalShops}
            />
            
            {/* Today's Summary */}
            <DailySummary
              orders={dailyStats.orders}
              sales={dailyStats.sales}
            />
            
            {/* Action Buttons */}
            <ActionButtons
              canVisitShop={dayStarted && !isOnBreak && !dayEnded}
              onVisitShop={handleVisitShop}
              onViewOrders={handleViewOrders}
            />
            
            {/* Location Status */}
            <LocationStatus
              locationEnabled={locationEnabled}
              onToggleLocation={handleToggleLocation}
            />
          </>
        )}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Delete Account Modal */}
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
      
      {/* End Day Confirmation Modal */}
      <ConfirmEndDayModal
        isOpen={isEndDayModalOpen}
        onClose={() => setIsEndDayModalOpen(false)}
        onConfirm={handleEndDay}
        loading={isEndDayLoading}
      />
    </div>
  );
};

export default HomePage;