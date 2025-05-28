// Product search component for the place order page
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types/products';

interface ProductSearchProps {
  searchTerm: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectProduct?: (product: Product) => void;
  onClearSearch?: () => void;
  placeholder?: string;
  products: Product[];
  selectedProduct?: Product | null;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  searchTerm,
  onSearch,
  onSelectProduct,
  onClearSearch,
  placeholder,
  products,
  selectedProduct
}) => {
  const { t } = useLanguage();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Use provided placeholder or default translated placeholder
  const searchPlaceholder = placeholder || t('searchProduct');

  // Filter products for suggestions
  const suggestions = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5); // Show only top 5 suggestions

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input focus
  const handleFocus = () => {
    if (searchTerm) {
      setShowSuggestions(true);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setShowSuggestions(false);
    // Set search term to product name instead of clearing it
    onSearch({ target: { value: product.name } } as React.ChangeEvent<HTMLInputElement>);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e);
    setShowSuggestions(true);
  };

  // Handle clear search
  const handleClearSearch = () => {
    if (onClearSearch) {
      onClearSearch();
    }
  };
  
  return (
    <div className="relative mb-6" ref={searchRef}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <div className="relative">
        <input
          type="text"
          className="bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 py-3"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
        {(searchTerm || selectedProduct) && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((product) => (
            <div
              key={product.product_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
              onClick={() => handleSuggestionClick(product)}
            >
              <span className="text-gray-900">{product.name}</span>
              <span className="text-gray-500 text-sm">
                {product.unit_of_measure}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;