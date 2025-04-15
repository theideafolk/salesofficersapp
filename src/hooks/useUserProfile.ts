// Hook for fetching user profile data
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Custom hook for fetching user profile data
 * @param user The authenticated user object
 * @returns The user's display name
 */
export const useUserProfile = (user: User | null) => {
  const [username, setUsername] = useState('');

  useEffect(() => {
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

    fetchOfficerData();
  }, [user]);

  return username;
};