// Utility functions for formatting data in the application

/**
 * Format elapsed time as XX hrs YY mins
 * @param milliseconds Time in milliseconds
 * @returns Formatted time string
 */
export const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')} hrs ${minutes.toString().padStart(2, '0')} mins`;
};

/**
 * Format sales amount with Indian Rupee symbol
 * @param amount Amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Format time for display in 12-hour format
 * @param date Date object or ISO string
 * @returns Formatted time string (e.g., "10:30 AM")
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  // Format as HH:MM AM/PM
  return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
};