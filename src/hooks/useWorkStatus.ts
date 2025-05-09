// Hook for checking work hours status
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Work hours status interface
interface WorkStatus {
  dayStarted: boolean;
  dayEnded: boolean;
  isOnBreak: boolean;
  checkingStatus: boolean;
}

/**
 * Custom hook for checking work hours status
 * @param userId User ID to check work status for
 * @returns Work status object with loading state
 */
export const useWorkStatus = (userId: string | undefined) => {
  const [status, setStatus] = useState<WorkStatus>({
    dayStarted: false,
    dayEnded: false,
    isOnBreak: false,
    checkingStatus: true
  });

  useEffect(() => {
    if (!userId) return;
    
    const checkWorkHoursStatus = async () => {
      try {
        setStatus(prev => ({ ...prev, checkingStatus: true }));
        
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        
        // Check if there's an entry for today
        const { data, error } = await supabase
          .from('work_hours')
          .select('end_time, is_break_active')
          .eq('sales_officer_id', userId)
          .eq('date', dateString)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error checking work hours status:', error);
          return;
        }
        
        if (data) {
          // If end_time is not null, day has ended
          if (data.end_time) {
            setStatus({
              dayEnded: true,
              dayStarted: false,
              isOnBreak: false,
              checkingStatus: false
            });
          } else {
            // Day is started but not ended
            setStatus({
              dayStarted: true,
              dayEnded: false,
              isOnBreak: data.is_break_active || false,
              checkingStatus: false
            });
          }
        } else {
          // No work hours for today
          setStatus({
            dayStarted: false,
            dayEnded: false,
            isOnBreak: false,
            checkingStatus: false
          });
        }
      } catch (err) {
        console.error('Error checking work hours:', err);
        setStatus(prev => ({ ...prev, checkingStatus: false }));
      }
    };
    
    checkWorkHoursStatus();
  }, [userId]);

  return status;
};