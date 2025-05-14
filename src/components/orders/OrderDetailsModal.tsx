import React from 'react';
import { ArrowLeft, Gift } from 'lucide-react';
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

interface Shop {
  shop_id: string;
  name: string;
  last_visit?: string;
  distance?: number;
  address?: string;
  last_visit_date?: string;
  phone_number?: string;
  owner_name?: string;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  shop: Shop | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  shop
}) => {
  const { t } = useLanguage();

  if (!isOpen || !order) return null;

  // Helper function to get a shortened order ID for display
  const getShortOrderId = (orderId: string): string => {
    // Use last 6 characters of the UUID
    return orderId.substring(orderId.length - 6);
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Modal Header - Fixed at top */}
        <div className="relative p-4 border-b flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-center">{t('orderDetails')}</h2>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-grow">
          {/* Order Header Info */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{t('orderNumber')}{getShortOrderId(order.order_id)}</h3>
                <p className="text-gray-600">{formatDisplayDate(order.date)}</p>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-lg">{t('orderPlaced')}</span>
              </div>
            </div>
            
            {/* Shop Information */}
            <div className="mt-4">
              <h4 className="text-xl font-bold">{shop?.name}</h4>
              {shop?.phone_number && (
                <p className="text-gray-600">{shop.phone_number}</p>
              )}
            </div>
          </div>
          
          {/* Ordered Items List */}
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">{t('orderedItems')}</h3>
            
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="border-b pb-4">
                  <div className="flex justify-between">
                    <h4 className="text-lg font-bold">{item.product_name}</h4>
                    <span className="text-lg font-bold">{formatCurrency(item.amount)}</span>
                  </div>
                  
                  {/* Unit of measure and quantity x price below the product name and price */}
                  <div className="flex justify-between">
                    <div className="text-gray-600">
                      {item.unit_of_measure || "Standard pack"}
                    </div>
                    <div className="text-gray-600">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </div>
                  </div>
                  
                  {/* Display free items related to this product */}
                  {item.free_qty > 0 && (
                    <div className="mt-1 text-green-600 flex items-center">
                      <Gift className="h-4 w-4 mr-1" />
                      <span>{t('free')}: {item.free_qty} x {item.product_name}</span>
                    </div>
                  )}
                  
                  {item.free_product_name && (
                    <div className="mt-1 text-green-600 flex items-center">
                      <Gift className="h-4 w-4 mr-1" />
                      <span>{t('free')}: 1 x {item.free_product_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Order Total */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{t('totalOrderValue')}</h3>
                <span className="text-xl font-bold">{formatCurrency(order.amount)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed Close Button at bottom */}
        <div className="p-6 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg text-lg"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;