// Hook for checking location permission status
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for checking location permission status
 * @returns Location enabled status and function to enable location
 */
export const useLocationStatus = () => {
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Check if location is enabled
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setLocationEnabled(result.state === 'granted');
      });
    }
  }, []);

  // Toggle location permission
  const handleToggleLocation = useCallback(() => {
    if (!locationEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationEnabled(true),
        () => alert('Location access is required for this app to function properly.')
      );
    }
  }, [locationEnabled]);

  return { locationEnabled, handleToggleLocation };
};