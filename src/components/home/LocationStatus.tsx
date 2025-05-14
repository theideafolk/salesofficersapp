// Location Status component for HomePage
import React from 'react';
import { MapPin, Check } from 'lucide-react';
import MainButton from '../MainButton';
import { useLanguage } from '../../context/LanguageContext';

interface LocationStatusProps {
  locationEnabled: boolean;
  onToggleLocation: () => void;
}

const LocationStatus: React.FC<LocationStatusProps> = ({ 
  locationEnabled, 
  onToggleLocation 
}) => {
  const { t } = useLanguage();
  
  return (
    <>
      {locationEnabled ? (
        <div className="bg-green-500 text-white text-center py-4 rounded mb-4 flex items-center justify-center">
          <span>{t('allDataSynced')}</span>
          <Check size={18} className="ml-2" />
        </div>
      ) : (
        <MainButton 
          onClick={onToggleLocation} 
          variant="warning" 
          fullWidth
        >
          <div className="flex items-center justify-center">
            <MapPin className="mr-2" size={18} />
            {t('turnOnLocation')}
          </div>
        </MainButton>
      )}
    </>
  );
};

export default LocationStatus;