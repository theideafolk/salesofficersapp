// Product search component for the place order page
import React from 'react';
import { Search } from 'lucide-react';

interface ProductSearchProps {
  searchTerm: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  searchTerm,
  onSearch,
  placeholder = "Search product name or code"
}) => {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-3"
        placeholder={placeholder}
        value={searchTerm}
        onChange={onSearch}
      />
    </div>
  );
};

export default ProductSearch;