// Start Day View component for HomePage
import React from 'react';
import CircularButton from '../CircularButton';
import { useLanguage } from '../../context/LanguageContext';

interface StartDayViewProps {
  onStartDay: () => void;
}

const StartDayView: React.FC<StartDayViewProps> = ({ onStartDay }) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex justify-center mb-8">
      <CircularButton onClick={onStartDay} color="success">
        <div className="text-center">
          <div className="text-2xl font-bold">{t('startDay')}</div>
        </div>
      </CircularButton>
    </div>
  );
};

export default StartDayView;