// Helper functions for the shops feature

/**
 * Generate a map URL based on platform (iOS or Android/Other)
 * @param gpsLocation GPS location in format "(lng,lat)"
 * @returns URL for opening the location in maps
 */
export const getMapUrl = (gpsLocation: string | undefined): string => {
  if (!gpsLocation) return '';
  
  try {
    // Extract coordinates from point string "(lng,lat)"
    const coordString = gpsLocation.toString().replace('(', '').replace(')', '');
    const [lng, lat] = coordString.split(',').map(parseFloat);
    
    // Check if iOS device
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIos) {
      // Apple Maps URL format
      return `maps://?ll=${lat},${lng}&q=${lat},${lng}`;
    } else {
      // Google Maps URL format (works on Android and desktop)
      return `https://maps.google.com/?q=${lat},${lng}`;
    }
  } catch (error) {
    console.error('Error parsing GPS location:', error);
    return '';
  }
};

/**
 * Generate phone URL for dialing
 * @param phoneNumber Phone number to call
 * @returns URL for dialing the phone number
 */
export const getPhoneUrl = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';
  
  // Format phone number for tel: URL
  // Strip any non-digit characters
  const formattedNumber = phoneNumber.replace(/\D/g, '');
  return `tel:${formattedNumber}`;
};

/**
 * Check if the current device is mobile
 * @returns Boolean indicating if device is mobile
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Format date to display as "Apr 15"
 * @param dateString Date string or null/undefined
 * @returns Formatted date string
 */
export const formatLastVisitDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  
  return `${month} ${day}`;
};

/**
 * Truncate text with ellipsis if it exceeds the max length
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};