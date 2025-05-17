// Product list component for the place order page
import React from 'react';
import { Product } from '../../types/products';
import ProductItem from './ProductItem';
import { useLanguage } from '../../context/LanguageContext';

interface ProductListProps {
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

const ProductList: React.FC<ProductListProps> = ({
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
  const { t } = useLanguage();

  if (products.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        {t('noProductsFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          showSchemeChoice={true}
          schemeChoice={getSchemeChoice(product.product_id)}
          onSchemeChoiceChange={onSchemeChoiceChange}
        />
      ))}
    </div>
  );
};

export default ProductList;