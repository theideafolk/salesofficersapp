// Daily Summary component for HomePage
import React from 'react';
import { formatCurrency } from '../../utils/formatHelpers';
import { useLanguage } from '../../context/LanguageContext';

interface DailySummaryProps {
  orders: number;
  sales: number;
}

const DailySummary: React.FC<DailySummaryProps> = ({ orders, sales }) => {
  const { t } = useLanguage();
  
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">{t('todaysSummary')}</h2>
      
      <div className="flex justify-between">
        <div className="text-center">
          <p className="text-xl">{t('orders')}: {orders}</p>
        </div>
        
        <div className="text-center">
          <p className="text-xl">{t('sales')}: {formatCurrency(sales)}</p>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;