// Home page component with mobile-friendly design
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Components
import BottomNavigation from '../components/BottomNavigation';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ConfirmEndDayModal from '../components/ConfirmEndDayModal';
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
  const [loading, setLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ visits: 0, uniqueShops: 0 });
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  
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
      isLoading: workHoursLoading,
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
  
  // Handle end day confirmation
  const handleConfirmEndDay = () => {
    setIsEndDayModalOpen(true);
  };
  
  // Execute end day when confirmed
  const handleEndDay = async () => {
    await endDay();
    setIsEndDayModalOpen(false);
  };

  const fetchTodayStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch total visits for today
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('visit_id')
        .eq('sales_officer_id', user.id)
        .gte('created_at', today.toISOString());
        
      if (visitsError) throw visitsError;
      
      // Fetch unique shops visited today
      const { data: uniqueShopsData, error: uniqueShopsError } = await supabase
        .from('visits')
        .select('shop_id')
        .eq('sales_officer_id', user.id)
        .gte('created_at', today.toISOString());
        
      if (uniqueShopsError) throw uniqueShopsError;
      
      // Count unique shops
      const uniqueShops = new Set(uniqueShopsData?.map(visit => visit.shop_id) || []).size;
      
      setTodayStats({
        visits: visitsData?.length || 0,
        uniqueShops: uniqueShops
      });
    } catch (error) {
      console.error('Error fetching today stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  useEffect(() => {
    fetchTodayStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Language Toggle */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm relative">
        <img src="/assets/Benzorgo_revised_logo.png" alt="Logo" className="h-12 w-auto absolute left-4 top-1/2 -translate-y-1/2" />
        <div className="flex-1 flex justify-center">
          <button
            className="text-gray-800 text-lg font-medium focus:outline-none"
            onClick={toggleLanguage}
          >
            {language === 'en' ? 'EN | हिंदी' : 'हिंदी | EN'}
          </button>
        </div>
      </header>
      
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
        
        {workHoursLoading ? (
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
              visitedShops={todayStats.uniqueShops}
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