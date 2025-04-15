// Circular button component used for Start Day action
import React from 'react';

interface CircularButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'danger';
}

const CircularButton: React.FC<CircularButtonProps> = ({ 
  onClick, 
  children, 
  size = 'lg',
  color = 'success'
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-24 h-24 text-sm',
    md: 'w-32 h-32 text-base',
    lg: 'w-40 h-40 text-xl'
  };
  
  // Color classes
  const colorClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };
  
  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full flex flex-col items-center justify-center font-bold transition-colors duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
    >
      {children}
    </button>
  );
};

export default CircularButton;