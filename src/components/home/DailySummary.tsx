// Daily Summary component for HomePage
import React from 'react';
import { formatCurrency } from '../../utils/formatHelpers';

interface DailySummaryProps {
  orders: number;
  sales: number;
}

const DailySummary: React.FC<DailySummaryProps> = ({ orders, sales }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">TODAY'S SUMMARY</h2>
      
      <div className="flex justify-between">
        <div className="text-center">
          <p className="text-xl">Orders: {orders}</p>
        </div>
        
        <div className="text-center">
          <p className="text-xl">Sales: {formatCurrency(sales)}</p>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;