import React from 'react';
import { formatCurrency } from '../../utils/formatHelpers';
import { useLanguage } from '../../context/LanguageContext';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  free_qty?: number;
  free_product_name?: string;
  scheme_id?: number;
  scheme_text?: string;
  unit_of_measure?: string;
}

interface Order {
  order_id: string;
  date: string;
  amount: number;
  status: 'placed';
  items?: OrderItem[];
}

interface ShopOrdersListProps {
  orders: Order[];
  onOpenOrderDetails: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  loading: boolean;
}

const ShopOrdersList: React.FC<ShopOrdersListProps> = ({ 
  orders, 
  onOpenOrderDetails,
  onEditOrder,
  loading 
}) => {
  const { t } = useLanguage();
  
  // Format date for display
  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (err) {
      console.error('Error formatting date:', err, dateString);
      // Return a placeholder if date is invalid
      return "Date unavailable";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('noOrdersFound')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.order_id} className="border rounded-lg overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xl font-bold">{formatDisplayDate(order.date)}</p>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-gray-700">Order Placed</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold">{formatCurrency(order.amount)}</span>
              <div className="flex space-x-4 mt-1">
                <button 
                  className="text-blue-500 font-medium"
                  onClick={() => onOpenOrderDetails(order)}
                >
                  {t('view')}
                </button>
                <button 
                  className="text-green-500 font-medium"
                  onClick={() => onEditOrder(order)}
                >
                  {t('edit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShopOrdersList;