// Hook for managing work hours, breaks, and timer
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatTime } from '../utils/formatHelpers';

// Local storage keys
const BREAK_START_KEY = 'break_start_time';
const WORK_ID_KEY = 'current_work_id';

export interface WorkHours {
  work_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  total_break_minutes: number;
  is_break_active: boolean;
  total_work_hours: string | null;
}

interface WorkHoursState {
  currentWorkHours: WorkHours | null;
  dayStarted: boolean;
  dayEnded: boolean;
  startTime: string;
  isOnBreak: boolean;
  elapsedTime: number;
  isLoading: boolean;
  isEndDayLoading: boolean;
  errorMessage: string | null;
}

interface WorkHoursActions {
  startDay: () => Promise<void>;
  endDay: () => Promise<void>;
  toggleBreak: () => Promise<void>;
  confirmEndDay: () => void;
}

/**
 * Custom hook for managing work hours
 * @param userId User ID for work hours operations
 * @returns Work hours state and actions
 */
export const useWorkHours = (userId: string | undefined): [WorkHoursState, WorkHoursActions] => {
  // State
  const [currentWorkHours, setCurrentWorkHours] = useState<WorkHours | null>(null);
  const [dayStarted, setDayStarted] = useState(false);
  const [dayEnded, setDayEnded] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndDayLoading, setIsEndDayLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);
  
  // Timer state and refs
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const totalBreakTimeRef = useRef<number>(0);

  // Calculate initial elapsed time based on start time and breaks
  const calculateInitialElapsedTime = useCallback((workHours: WorkHours) => {
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
  }, []);

  // Start the timer
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;

    const now = Date.now();
    timerStartTimeRef.current = now;

    timerIntervalRef.current = window.setInterval(() => {
      if (!timerStartTimeRef.current) return;
      
      const elapsed = Date.now() - timerStartTimeRef.current;
      setElapsedTime(previousElapsedTime => previousElapsedTime + elapsed);
      timerStartTimeRef.current = Date.now();
    }, 1000);
  }, []);

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerStartTimeRef.current = null;
  }, []);

  // Check work hours status
  const checkWorkHoursStatus = useCallback(async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      // Check if there's an entry for today
      const { data, error } = await supabase
        .from('work_hours')
        .select('*')
        .eq('sales_officer_id', userId)
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
          setStartTime(formatTime(startDateTime));
          
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
  }, [userId, calculateInitialElapsedTime]);

  // Start day action
  const startDay = useCallback(async () => {
    if (!userId) return;
    
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
            sales_officer_id: userId,
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
      
      setCurrentWorkHours(data);
      setStartTime(formatTime(now));
      setDayStarted(true);
      setDayEnded(false);
      setIsOnBreak(false);
      setElapsedTime(0);
      
      // Reset timer references
      timerStartTimeRef.current = now.getTime();
      totalBreakTimeRef.current = 0;
      
      // Ensure break storage is clear
      localStorage.removeItem(BREAK_START_KEY);
    } catch (err) {
      console.error('Error starting day:', err);
      setErrorMessage('Failed to start day. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Confirm end day action
  const confirmEndDay = useCallback(() => {
    setIsEndDayModalOpen(true);
  }, []);

  // End day action
  const endDay = useCallback(async () => {
    if (!userId || !currentWorkHours) return;
    
    try {
      setIsEndDayLoading(true);
      setErrorMessage(null);
      
      const now = new Date();
      
      // If on break, end the break first
      if (isOnBreak) {
        await toggleBreak();
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
  }, [userId, currentWorkHours, isOnBreak, elapsedTime, toggleBreak, checkWorkHoursStatus]);

  // Toggle break action
  async function toggleBreak() {
    if (!userId || !currentWorkHours) return;
    
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
  }

  // Check work hours status on component mount
  useEffect(() => {
    if (userId) {
      checkWorkHoursStatus();
    }
  }, [userId, checkWorkHoursStatus]);

  // Timer effect
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
  }, [dayStarted, isOnBreak, dayEnded, startTimer, stopTimer]);

  const state: WorkHoursState = {
    currentWorkHours,
    dayStarted,
    dayEnded,
    startTime,
    isOnBreak,
    elapsedTime,
    isLoading,
    isEndDayLoading,
    errorMessage
  };

  const actions: WorkHoursActions = {
    startDay,
    endDay,
    toggleBreak,
    confirmEndDay
  };

  return [state, actions];
};