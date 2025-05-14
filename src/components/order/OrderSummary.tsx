// Order summary component for showing cart totals and free offer status
import React from 'react';
import { Gift, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface OrderSummaryProps {
  totalItems: number;
  totalValue: number;
  hasOrderLevelScheme: boolean;
  qualifiesForOrderScheme: boolean;
  orderSchemeMinPrice?: number;
  orderSchemeText?: string;
  hasFreeItems: boolean;
  freeItems: React.ReactNode;
  onReview: () => void;
  disableReview: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  totalItems,
  totalValue,
  hasOrderLevelScheme,
  qualifiesForOrderScheme,
  orderSchemeMinPrice = 0,
  orderSchemeText = 'Free Traveler Bag',
  hasFreeItems,
  freeItems,
  onReview,
  disableReview
}) => {
  const { t } = useLanguage();

  // Format currency with two decimal places
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <div className="mt-6 pt-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <span className="text-lg font-bold">{t('totalItems')}: {totalItems}</span>
        <span className="text-lg font-bold">{t('subtotal')}: {formatCurrency(totalValue)}</span>
      </div>
      
      {/* Order-level scheme status */}
      {hasOrderLevelScheme && (
        <div className={`mb-4 border rounded-lg p-3 ${
          qualifiesForOrderScheme ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center">
            {qualifiesForOrderScheme ? (
              <Gift className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <HelpCircle className="h-5 w-5 text-yellow-500 mr-2" />
            )}
            <span className={qualifiesForOrderScheme ? 'text-green-700' : 'text-yellow-700'}>
              {qualifiesForOrderScheme 
                ? `Your order qualifies for a ${orderSchemeText}!` 
                : `Order ${formatCurrency(orderSchemeMinPrice)} worth to get a ${orderSchemeText}`}
            </span>
          </div>
          
          {!qualifiesForOrderScheme && (
            <div className="mt-1 ml-7">
              <div className="bg-gray-200 h-2 rounded-full w-full">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, (totalValue / orderSchemeMinPrice) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatCurrency(totalValue)}</span>
                <span>{formatCurrency(orderSchemeMinPrice)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Free items list */}
      {hasFreeItems && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-green-700 mb-1">
            <Gift size={16} className="mr-2" />
            <span className="font-medium">Free items included:</span>
          </div>
          {freeItems}
        </div>
      )}
      
      <button
        onClick={onReview}
        className={`w-full ${disableReview ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4 px-4 rounded-lg text-lg`}
        disabled={disableReview}
      >
        {t('reviewOrder')} ({formatCurrency(totalValue)})
      </button>
    </div>
  );
};

export default OrderSummary;