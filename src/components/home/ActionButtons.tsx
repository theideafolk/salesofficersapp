// Action Buttons component for HomePage
import React from 'react';
import MainButton from '../MainButton';
import { useLanguage } from '../../context/LanguageContext';

interface ActionButtonsProps {
  canVisitShop: boolean;
  onVisitShop: () => void;
  onViewOrders: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  canVisitShop, 
  onVisitShop, 
  onViewOrders 
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex gap-4 mb-6">
      <MainButton 
        onClick={onVisitShop} 
        variant="outline" 
        fullWidth 
        disabled={!canVisitShop}
      >
        {t('visitShop')}
      </MainButton>
      
      <MainButton 
        onClick={onViewOrders} 
        variant="primary" 
        fullWidth
      >
        {t('placeOrder')}
      </MainButton>
    </div>
  );
};

export default ActionButtons;