// Category list component for the place order page
import React from 'react';

interface CategoryListProps {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ 
  categories,
  activeCategory,
  onChange
}) => {
  if (categories.length <= 1) return null;

  return (
    <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`px-4 py-2 rounded-full whitespace-nowrap ${
            activeCategory === category
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryList;