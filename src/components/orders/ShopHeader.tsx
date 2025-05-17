import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ShopHeaderProps {
  shopName: string;
}

const ShopHeader: React.FC<ShopHeaderProps> = ({ shopName }) => {
  const { t } = useLanguage();
  
  return (
    <>
      {/* Shop name heading */}
      <h2 className="text-3xl font-bold mb-6">{shopName}</h2>
      
      {/* Recent Orders section title */}
      <h3 className="text-xl font-bold mb-4">{t('recentOrdersForShop')}</h3>
    </>
  );
};

export default ShopHeader;