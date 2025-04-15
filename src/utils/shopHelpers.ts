// Helper functions for the shops feature

/**
 * Generate a map URL based on platform (iOS or Android/Other)
 * @param gpsLocation GPS location in format "(lng,lat)"
 * @returns URL for opening the location in maps
 */
export const getMapUrl = (gpsLocation: string | undefined): string => {
  if (!gpsLocation) {
    console.log('GPS location is undefined or empty');
    return '';
  }
  
  try {
    console.log('Raw GPS location:', gpsLocation);
    console.log('UserAgent:', navigator.userAgent);
    console.log('Window location:', window.location.href);
    
    // Extract coordinates from point string "(lng,lat)"
    const coordString = gpsLocation.toString().replace('(', '').replace(')', '');
    console.log('Parsed coordinate string:', coordString);
    
    const coords = coordString.split(',');
    if (coords.length !== 2) {
      console.error('Invalid coordinate format, expected "lng,lat" but got:', coordString);
      return '';
    }
    
    const [lng, lat] = coords.map(coord => parseFloat(coord.trim()));
    console.log('Parsed coordinates:', { lng, lat });
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinate values:', { lng, lat });
      return '';
    }
    
    // Check if iOS device
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log('Is iOS device:', isIos);
    
    let mapUrl;
    if (isIos) {
      // Apple Maps URL format
      mapUrl = `maps://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;
    } else {
      // Google Maps URL format (works on Android and desktop)
      mapUrl = `https://maps.google.com/maps?q=${lat},${lng}`;
    }
    
    console.log('Generated map URL:', mapUrl);
    console.log('Full map URL details:', {
      url: mapUrl,
      isIos: isIos,
      latitude: lat,
      longitude: lng,
      originalPoint: gpsLocation
    });
    
    return mapUrl;
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