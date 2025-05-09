// Popular products horizontal scroll component for place order page
import React from 'react';
import { Product } from '../../types/products';
import ProductItem from './ProductItem';

interface PopularProductsProps {
  products: Product[];
  getQuantity: (productId: string) => number;
  getFreeQuantity: (productId: string) => number;
  getOfferProductCount: (product: Product) => number;
  lastOrders: Record<string, number>;
  getSchemeChoice: (productId: string) => 'freeQuantity' | 'offerProduct' | 'both';
  hasScheme: (product: Product) => boolean;
  getSchemeDescription: (product: Product) => string;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
  onSchemeChoiceChange: (productId: string, choice: 'freeQuantity' | 'offerProduct' | 'both') => void;
}

const PopularProducts: React.FC<PopularProductsProps> = ({
  products,
  getQuantity,
  getFreeQuantity,
  getOfferProductCount,
  lastOrders,
  getSchemeChoice,
  hasScheme,
  getSchemeDescription,
  onIncrement,
  onDecrement,
  onSchemeChoiceChange
}) => {
  if (products.length === 0) return null;

  return (
    <div className="mb-6 overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex space-x-3 min-w-max">
        {products.map((product) => (
          <ProductItem
            key={product.product_id}
            product={product}
            quantity={getQuantity(product.product_id)}
            freeQuantity={getFreeQuantity(product.product_id)}
            offerProductCount={getOfferProductCount(product)}
            lastOrderedQuantity={lastOrders[product.product_id]}
            hasScheme={hasScheme(product)}
            schemeDescription={getSchemeDescription(product)}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            isMinimal={true}
            showSchemeChoice={product.product_scheme_id === 2 && product.product_item_offer_id !== null}
            schemeChoice={getSchemeChoice(product.product_id)}
            onSchemeChoiceChange={onSchemeChoiceChange}
          />
        ))}
      </div>
    </div>
  );
};

export default PopularProducts;