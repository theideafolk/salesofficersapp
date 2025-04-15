// Utility functions for checking work hours status
import { supabase } from './supabase';

// Interface for work hours data
export interface WorkHoursStatus {
  dayStarted: boolean;
  dayEnded: boolean;
  isOnBreak: boolean;
  workId: string | null;
}

/**
 * Check the current day's work hours status for a user
 * @param userId The user ID to check work hours for
 * @returns Object containing work hours status
 */
export const checkWorkHoursStatus = async (userId: string): Promise<WorkHoursStatus> => {
  try {
    if (!userId) {
      return {
        dayStarted: false,
        dayEnded: false,
        isOnBreak: false,
        workId: null
      };
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Check if there's an entry for today
    const { data, error } = await supabase
      .from('work_hours')
      .select('work_id, end_time, is_break_active')
      .eq('sales_officer_id', userId)
      .eq('date', dateString)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking work hours status:', error);
      throw error;
    }
    
    if (data) {
      // Work hours entry exists for today
      return {
        dayStarted: true,
        dayEnded: data.end_time !== null,
        isOnBreak: data.is_break_active || false,
        workId: data.work_id
      };
    } else {
      // No work hours for today
      return {
        dayStarted: false,
        dayEnded: false,
        isOnBreak: false,
        workId: null
      };
    }
  } catch (err) {
    console.error('Error checking work hours:', err);
    // Return a safe default
    return {
      dayStarted: false,
      dayEnded: false,
      isOnBreak: false,
      workId: null
    };
  }
};