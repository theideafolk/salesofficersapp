// Action Buttons component for HomePage
import React from 'react';
import MainButton from '../MainButton';

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
  return (
    <div className="flex gap-4 mb-6">
      <MainButton 
        onClick={onVisitShop} 
        variant="outline" 
        fullWidth 
        disabled={!canVisitShop}
      >
        Visit Shop
      </MainButton>
      
      <MainButton 
        onClick={onViewOrders} 
        variant="primary" 
        fullWidth
      >
        PLACE ORDER
      </MainButton>
    </div>
  );
};

export default ActionButtons;