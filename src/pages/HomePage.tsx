// Home page component with mobile-friendly design
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import CircularButton from '../components/CircularButton';
import ProgressBar from '../components/ProgressBar';
import MainButton from '../components/MainButton';
import AppHeader from '../components/AppHeader';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ConfirmEndDayModal from '../components/ConfirmEndDayModal';
import { supabase } from '../lib/supabase';
import { MapPin, Check, TimerOff, AlertTriangle, PlayCircle, PauseCircle } from 'lucide-react';

interface WorkHours {
  work_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  total_break_minutes: number;
  is_break_active: boolean;
  total_work_hours: string | null;
}

// Local storage keys
const BREAK_START_KEY = 'break_start_time';
const WORK_ID_KEY = 'current_work_id';

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [dayStarted, setDayStarted] = useState(false);
  const [dayEnded, setDayEnded] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [currentWorkHours, setCurrentWorkHours] = useState<WorkHours | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndDayLoading, setIsEndDayLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    visitedShops: 0,
    totalShops: 25,
    orders: 0,
    sales: 0
  });
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Timer state and refs
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const totalBreakTimeRef = useRef<number>(0);
  
  // On component mount, check if the day is already started
  useEffect(() => {
    if (user) {
      checkWorkHoursStatus();
      fetchOfficerData();
      fetchDailyStats();
      
      // Check if location is enabled
      if (navigator.geolocation) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          setLocationEnabled(result.state === 'granted');
        });
      }
    }
  }, [user]);

  // Timer useEffect
  useEffect(() => {
    if (dayStarted && !isOnBreak && !dayEnded) {
      startTimer();
    } else if (isOnBreak || dayEnded) {
      stopTimer();
    }

    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [dayStarted, isOnBreak, dayEnded]);
  
  // Format elapsed time as HH:MM hrs
  const formatElapsedTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} hrs`;
  };

  // Start the timer
  const startTimer = () => {
    if (timerIntervalRef.current) return;

    const now = Date.now();
    timerStartTimeRef.current = now;

    timerIntervalRef.current = window.setInterval(() => {
      if (!timerStartTimeRef.current) return;
      
      const elapsed = Date.now() - timerStartTimeRef.current;
      setElapsedTime(previousElapsedTime => previousElapsedTime + elapsed);
      timerStartTimeRef.current = Date.now();
    }, 1000);
  };

  // Stop the timer
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerStartTimeRef.current = null;
  };

  // Calculate initial elapsed time based on start time and breaks
  const calculateInitialElapsedTime = (workHours: WorkHours) => {
    const startDateTime = new Date(workHours.start_time).getTime();
    const now = Date.now();
    let totalElapsedMs = now - startDateTime;
    
    // Subtract break time
    totalElapsedMs -= (workHours.total_break_minutes || 0) * 60 * 1000;
    
    // If currently on break, subtract current break time
    if (workHours.is_break_active) {
      const breakStartTime = localStorage.getItem(BREAK_START_KEY);
      if (breakStartTime) {
        const breakStartMs = parseInt(breakStartTime);
        totalElapsedMs -= (now - breakStartMs);
      }
    }
    
    return Math.max(0, totalElapsedMs);
  };
  
  // Check if the current day is already started or ended
  const checkWorkHoursStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      // Check if there's an entry for today
      const { data, error } = await supabase
        .from('work_hours')
        .select('*')
        .eq('sales_officer_id', user.id)
        .eq('date', dateString)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error('Error checking work hours status:', error);
        setErrorMessage('Failed to check work status. Please try again.');
        return;
      }
      
      if (data) {
        // We have work hours for today
        setCurrentWorkHours(data);
        localStorage.setItem(WORK_ID_KEY, data.work_id);
        
        // If end_time is not null, day has ended
        if (data.end_time) {
          setDayStarted(false);
          setDayEnded(true);
        } else {
          // Day is started but not ended
          setDayStarted(true);
          setDayEnded(false);
          
          // Format the start time for display
          const startDateTime = new Date(data.start_time);
          const hours = startDateTime.getHours();
          const minutes = startDateTime.getMinutes();
          const formattedTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
          setStartTime(formattedTime);
          
          // Check if currently on break
          if (data.is_break_active) {
            setIsOnBreak(true);
            // Check if we have a break start time in localStorage
            if (!localStorage.getItem(BREAK_START_KEY)) {
              // Store current time as break start if it's not already set
              localStorage.setItem(BREAK_START_KEY, Date.now().toString());
            }
          } else {
            setIsOnBreak(false);
            // Clear any stored break time
            localStorage.removeItem(BREAK_START_KEY);
          }
          
          // Set total break minutes from DB
          totalBreakTimeRef.current = (data.total_break_minutes || 0) * 60 * 1000;
          
          // Calculate elapsed time
          const initialElapsedTime = calculateInitialElapsedTime(data);
          setElapsedTime(initialElapsedTime);
        }
      } else {
        // No work hours for today
        setDayStarted(false);
        setDayEnded(false);
        setCurrentWorkHours(null);
        localStorage.removeItem(WORK_ID_KEY);
        localStorage.removeItem(BREAK_START_KEY);
      }
    } catch (err) {
      console.error('Error checking work hours:', err);
      setErrorMessage('Failed to check work status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteSuccess = () => {
    navigate('/login');
  };
  
  const handleStartDay = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Get today's date in YYYY-MM-DD format
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      
      // Create a new work hours entry
      const { data, error } = await supabase
        .from('work_hours')
        .insert([
          {
            sales_officer_id: user.id,
            date: dateString,
            start_time: now.toISOString(),
            total_break_minutes: 0,
            is_break_active: false
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error starting day:', error);
        setErrorMessage('Failed to start day. Please try again.');
        return;
      }
      
      // Store work_id in localStorage
      localStorage.setItem(WORK_ID_KEY, data.work_id);
      
      // Format the start time for display
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const formattedTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
      
      setCurrentWorkHours(data);
      setStartTime(formattedTime);
      setDayStarted(true);
      setDayEnded(false);
      setIsOnBreak(false);
      setElapsedTime(0);
      
      // Reset timer references
      timerStartTimeRef.current = now.getTime();
      totalBreakTimeRef.current = 0;
      
      // Ensure break storage is clear
      localStorage.removeItem(BREAK_START_KEY);
      
      // Ensure location permission is checked
      if (navigator.geolocation) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          setLocationEnabled(result.state === 'granted');
        });
      }
    } catch (err) {
      console.error('Error starting day:', err);
      setErrorMessage('Failed to start day. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEndDay = () => {
    setIsEndDayModalOpen(true);
  };
  
  const handleEndDay = async () => {
    if (!user || !currentWorkHours) return;
    
    try {
      setIsEndDayLoading(true);
      setErrorMessage(null);
      
      const now = new Date();
      
      // If on break, end the break first
      if (isOnBreak) {
        await handleToggleBreak();
      }
      
      // Convert elapsed time to interval string for PostgreSQL
      const totalHours = Math.floor(elapsedTime / (1000 * 60 * 60));
      const totalMinutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      const totalSeconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
      
      const intervalString = `${totalHours} hours ${totalMinutes} minutes ${totalSeconds} seconds`;
      
      // Update the work hours entry with end time
      const { error } = await supabase
        .from('work_hours')
        .update({ 
          end_time: now.toISOString(),
          is_break_active: false,
          total_work_hours: intervalString
        })
        .eq('work_id', currentWorkHours.work_id);
      
      if (error) {
        console.error('Error ending day:', error);
        setErrorMessage('Failed to end day. Please try again.');
        return;
      }
      
      // Clear localStorage
      localStorage.removeItem(BREAK_START_KEY);
      localStorage.removeItem(WORK_ID_KEY);
      
      // Close modal and update state
      setIsEndDayModalOpen(false);
      setDayStarted(false);
      setDayEnded(true);
      setStartTime('');
      setIsOnBreak(false);
      
      // Refresh work hours data
      await checkWorkHoursStatus();
    } catch (err) {
      console.error('Error ending day:', err);
      setErrorMessage('Failed to end day. Please try again.');
    } finally {
      setIsEndDayLoading(false);
    }
  };
  
  const handleToggleBreak = async () => {
    if (!user || !currentWorkHours) return;
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      const now = new Date();
      const nowMs = now.getTime();
      
      if (!isOnBreak) {
        // Start break - store the current time in localStorage
        localStorage.setItem(BREAK_START_KEY, nowMs.toString());
        
        const { error } = await supabase
          .from('work_hours')
          .update({ 
            is_break_active: true
          })
          .eq('work_id', currentWorkHours.work_id);
        
        if (error) {
          console.error('Error starting break:', error);
          setErrorMessage('Failed to start break. Please try again.');
          return;
        }
        
        setIsOnBreak(true);
      } else {
        // End break - calculate duration from localStorage
        const breakStartStr = localStorage.getItem(BREAK_START_KEY);
        
        if (!breakStartStr) {
          setErrorMessage('Error: Break start time is missing.');
          return;
        }
        
        const breakStartMs = parseInt(breakStartStr);
        const breakDurationMs = nowMs - breakStartMs;
        const breakDurationMinutes = Math.round(breakDurationMs / (1000 * 60));
        
        // Update total break minutes
        const currentTotalBreakMinutes = currentWorkHours.total_break_minutes || 0;
        const totalBreakMinutes = currentTotalBreakMinutes + breakDurationMinutes;
        
        totalBreakTimeRef.current += breakDurationMs;
        
        const { error } = await supabase
          .from('work_hours')
          .update({ 
            total_break_minutes: totalBreakMinutes,
            is_break_active: false
          })
          .eq('work_id', currentWorkHours.work_id);
        
        if (error) {
          console.error('Error ending break:', error);
          setErrorMessage('Failed to end break. Please try again.');
          return;
        }
        
        // Clear break start time from localStorage
        localStorage.removeItem(BREAK_START_KEY);
        
        setIsOnBreak(false);
      }
      
      // Refresh work hours data
      await checkWorkHoursStatus();
    } catch (err) {
      console.error('Error toggling break:', err);
      setErrorMessage('Failed to toggle break. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  // Format sales amount with Indian Rupee symbol
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
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
            {dayStarted ? (
              <>
                {/* Status Card - Day Started */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <div className="bg-green-500 rounded-full p-1 mr-2">
                      <Check size={16} className="text-white" />
                    </div>
                    <span className="text-gray-800">Day started at {startTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isOnBreak ? (
                        <PauseCircle size={18} className="mr-2 text-yellow-500" />
                      ) : (
                        <PlayCircle size={18} className="mr-2 text-green-500" />
                      )}
                      <span className="text-gray-800 font-medium">
                        Working Hours: {formatElapsedTime(elapsedTime)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {isOnBreak ? "On break" : "Working"}
                    </span>
                  </div>
                </div>
                
                {/* End Day and Break Buttons */}
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center">
                    {/* Move End Day button to the left */}
                    <div className="mr-8">
                      <CircularButton onClick={handleConfirmEndDay} color="danger" size="lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold">END</div>
                          <div className="text-2xl font-bold">DAY</div>
                        </div>
                      </CircularButton>
                    </div>
                    
                    {/* Break button */}
                    <button 
                      onClick={handleToggleBreak}
                      className={`${
                        isOnBreak ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                      } rounded-full h-20 w-20 font-bold flex items-center justify-center shadow-md`}
                    >
                      {isOnBreak ? 'RESUME' : 'BREAK'}
                    </button>
                  </div>
                </div>
              </>
            ) : dayEnded ? (
              /* Day Ended Message */
              <div className="mb-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TimerOff size={24} className="text-yellow-600 mr-2" />
                    <span className="text-yellow-800 font-medium">Your day has ended</span>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    You've completed your work day. Start a new day tomorrow.
                  </p>
                </div>
              </div>
            ) : (
              /* Start Day Button */
              <div className="flex justify-center mb-8">
                <CircularButton onClick={handleStartDay} color="success">
                  <div className="text-center">
                    <div className="text-2xl font-bold">START</div>
                    <div className="text-2xl font-bold">DAY</div>
                  </div>
                </CircularButton>
              </div>
            )}
            
            {/* Target Progress */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">YOUR TARGET</h2>
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
              <h2 className="text-2xl font-bold mb-4">TODAY'S SUMMARY</h2>
              
              <div className="flex justify-between">
                <div className="text-center">
                  <p className="text-xl">Orders: {dailyStats.orders}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl">Sales: {formatCurrency(dailyStats.sales)}</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <MainButton 
                onClick={handleVisitShop} 
                variant="outline" 
                fullWidth 
                disabled={!dayStarted || isOnBreak || dayEnded}
              >
                Visit Shop
              </MainButton>
              
              <MainButton 
                onClick={handleViewOrders} 
                variant="primary" 
                fullWidth
              >
                VIEW ORDERS
              </MainButton>
            </div>
            
            {/* Location and Sync Status */}
            {locationEnabled ? (
              <div className="bg-green-500 text-white text-center py-4 rounded mb-4 flex items-center justify-center">
                <span>All data synced and location active</span>
                <Check size={18} className="ml-2" />
              </div>
            ) : (
              <MainButton 
                onClick={handleToggleLocation} 
                variant="warning" 
                fullWidth
              >
                <div className="flex items-center justify-center">
                  <MapPin className="mr-2" size={18} />
                  Turn on location
                </div>
              </MainButton>
            )}
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