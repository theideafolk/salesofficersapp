// Individual product item component for the order page
import React from 'react';
import { Plus, Minus, Tag, Gift } from 'lucide-react';
import { Product } from '../../types/products';

interface ProductItemProps {
  product: Product;
  quantity: number;
  freeQuantity: number;
  offerProductCount: number;
  lastOrderedQuantity?: number;
  hasScheme: boolean;
  schemeDescription: string;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
  isMinimal?: boolean;
  showSchemeChoice?: boolean;
  schemeChoice?: 'freeQuantity' | 'offerProduct' | 'both';
  onSchemeChoiceChange?: (
    productId: string,
    choice: 'freeQuantity' | 'offerProduct' | 'both'
  ) => void;
}

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  quantity,
  freeQuantity,
  offerProductCount,
  lastOrderedQuantity,
  hasScheme,
  schemeDescription,
  onIncrement,
  onDecrement,
  isMinimal = false,
  showSchemeChoice = false,
  schemeChoice = 'freeQuantity',
  onSchemeChoiceChange
}) => {
  // Format currency with two decimal places
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const meetsSchemeRequirement = 
    hasScheme && 
    quantity >= (product.product_scheme_buy_qty || 0);

  return (
    <div className={isMinimal ? "border rounded-lg p-3 relative min-w-[180px] max-w-[200px]" : "border-b pb-4"}>
      <div className={isMinimal ? "" : "flex justify-between"}>
        <div className={isMinimal ? "" : "flex-1 pr-4"}>
          <h3 className={isMinimal ? "font-bold" : "font-bold text-lg"}>{product.name}</h3>
          
          {/* Display scheme text only once at the top */}
          {hasScheme && (
            <div className={`text-${isMinimal ? 'xs' : 'sm'} text-green-700 mt-1 flex items-center`}>
              <Tag size={isMinimal ? 12 : 14} className="mr-1 flex-shrink-0" />
              <span>{schemeDescription}</span>
            </div>
          )}
          
          {!isMinimal && (
            <p className="text-gray-700">
              Pack of {product.unit_of_measure || 'Standard pack'}
            </p>
          )}
          
          {/* Only show scheme choice buttons when relevant */}
          {showSchemeChoice && product.product_scheme_id === 2 && 
           product.product_item_offer_id && meetsSchemeRequirement && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium">Choose offer:</span>
              <button 
                onClick={() => onSchemeChoiceChange?.(product.product_id, 'freeQuantity')} 
                className={`text-xs px-2 py-1 rounded ${
                  schemeChoice === 'freeQuantity' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                Free Quantity
              </button>
              <button 
                onClick={() => onSchemeChoiceChange?.(product.product_id, 'offerProduct')} 
                className={`text-xs px-2 py-1 rounded ${
                  schemeChoice === 'offerProduct' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {product.offer_product_name || 'Free Product'}
              </button>
            </div>
          )}
          
          {/* Free items notifications */}
          {freeQuantity > 0 && (
            <div className="mt-1 text-xs text-green-600 flex items-center">
              <Gift size={12} className="mr-1" />
              <span>{freeQuantity} free</span>
            </div>
          )}
          
          {/* Offer product notification */}
          {offerProductCount > 0 && product.offer_product_name && (
            <div className="mt-1 text-xs text-purple-600 flex items-center">
              <Gift size={12} className="mr-1" />
              <span>{offerProductCount} {product.offer_product_name}</span>
            </div>
          )}
        </div>
        
        <div className={isMinimal ? "" : "flex flex-col items-end"}>
          <div className={`flex items-center bg-gray-100 rounded-full p-1 ${isMinimal ? 'my-2' : 'mb-2'}`}>
            <button 
              onClick={() => onDecrement(product)} 
              className="h-8 w-8 flex items-center justify-center"
            >
              <Minus size={18} />
            </button>
            <span className="font-medium px-3">{quantity}</span>
            <button 
              onClick={() => onIncrement(product)} 
              className="h-8 w-8 flex items-center justify-center"
            >
              <Plus size={18} />
            </button>
          </div>
          <p className={isMinimal ? "text-xl font-bold" : "text-xl font-bold"}>
            {formatCurrency(product.ptr || product.mrp)}
          </p>
          
          {lastOrderedQuantity && (
            <p className="text-sm text-gray-600">
              Last ordered: {lastOrderedQuantity} pcs
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductItem;