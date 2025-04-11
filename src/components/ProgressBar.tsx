// Progress bar component for tracking targets
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  height?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  total, 
  label,
  height = 'h-3' 
}) => {
  // Calculate percentage
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  
  return (
    <div className="w-full">
      {label && <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>}
      <div className={`w-full bg-gray-200 rounded-full ${height}`}>
        <div
          className="bg-green-500 rounded-full h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;