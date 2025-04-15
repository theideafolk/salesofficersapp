// Start Day View component for HomePage
import React from 'react';
import CircularButton from '../CircularButton';

interface StartDayViewProps {
  onStartDay: () => void;
}

const StartDayView: React.FC<StartDayViewProps> = ({ onStartDay }) => {
  return (
    <div className="flex justify-center mb-8">
      <CircularButton onClick={onStartDay} color="success">
        <div className="text-center">
          <div className="text-2xl font-bold">START</div>
          <div className="text-2xl font-bold">DAY</div>
        </div>
      </CircularButton>
    </div>
  );
};

export default StartDayView;