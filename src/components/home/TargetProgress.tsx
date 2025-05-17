// Target Progress component for HomePage
import React from 'react';
import ProgressBar from '../ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface TargetProgressProps {
  visitedShops: number;
  totalShops: number;
}

const TargetProgress: React.FC<TargetProgressProps> = ({ visitedShops, totalShops }) => {
  const { t } = useLanguage();
  
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-2">{t('yourTarget')}</h2>
      <ProgressBar 
        current={visitedShops} 
        total={totalShops} 
        height="h-4" 
      />
      <p className="text-center mt-2">
        {visitedShops} of {totalShops} {t('shops')}
      </p>
    </div>
  );
};

export default TargetProgress;