// Target Progress component for HomePage
import React from 'react';
import ProgressBar from '../ProgressBar';

interface TargetProgressProps {
  visitedShops: number;
  totalShops: number;
}

const TargetProgress: React.FC<TargetProgressProps> = ({ visitedShops, totalShops }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-2">YOUR TARGET</h2>
      <ProgressBar 
        current={visitedShops} 
        total={totalShops} 
        height="h-4" 
      />
      <p className="text-center mt-2">
        {visitedShops} of {totalShops} shops
      </p>
    </div>
  );
};

export default TargetProgress;