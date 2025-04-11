// Main action button component
import React from 'react';

interface MainButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'warning';
  fullWidth?: boolean;
  disabled?: boolean;
}

const MainButton: React.FC<MainButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false
}) => {
  // Styles based on variant
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    outline: 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50',
    warning: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${
        fullWidth ? 'w-full' : ''
      } py-3 px-4 rounded-lg font-medium focus:outline-none transition-colors duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
};

export default MainButton;