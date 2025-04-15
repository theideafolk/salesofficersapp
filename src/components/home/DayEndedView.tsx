// Day Ended View component for HomePage
import React from 'react';
import { TimerOff } from 'lucide-react';

const DayEndedView: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <TimerOff size={24} className="text-yellow-600 mr-2" />
          <span className="text-yellow-800 font-medium">Your day has ended</span>
        </div>
        <p className="text-yellow-700 text-sm">
          You've completed your work day. Start a new day tomorrow.
        </p>
      </div>
    </div>
  );
};

export default DayEndedView;