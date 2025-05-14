// Day Started View component for HomePage
import React from 'react';
import { Check, PauseCircle, PlayCircle } from 'lucide-react';
import CircularButton from '../CircularButton';
import { formatElapsedTime } from '../../utils/formatHelpers';
import { useLanguage } from '../../context/LanguageContext';

interface DayStartedViewProps {
  startTime: string;
  isOnBreak: boolean;
  elapsedTime: number;
  onEndDay: () => void;
  onToggleBreak: () => void;
}

const DayStartedView: React.FC<DayStartedViewProps> = ({
  startTime,
  isOnBreak,
  elapsedTime,
  onEndDay,
  onToggleBreak
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Status Card - Day Started */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-2">
          <div className="bg-green-500 rounded-full p-1 mr-2">
            <Check size={16} className="text-white" />
          </div>
          <span className="text-gray-800">{t('dayStarted', { startTime })}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isOnBreak ? (
              <PauseCircle size={18} className="mr-2 text-yellow-500" />
            ) : (
              <PlayCircle size={18} className="mr-2 text-green-500" />
            )}
            <span className="text-gray-800 font-medium">
              {t('workingHours', { time: formatElapsedTime(elapsedTime) })}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {isOnBreak ? t('onBreak') : t('working')}
          </span>
        </div>
      </div>
      
      {/* End Day and Break Buttons */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          {/* Move End Day button to the left */}
          <div className="mr-8">
            <CircularButton onClick={onEndDay} color="danger" size="lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{t('endDay')}</div>
              </div>
            </CircularButton>
          </div>
          
          {/* Break button */}
          <button 
            onClick={onToggleBreak}
            className={`${
              isOnBreak ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            } rounded-full h-20 w-20 font-bold flex items-center justify-center shadow-md`}
          >
            {isOnBreak ? t('resume') : t('break')}
          </button>
        </div>
      </div>
    </>
  );
};

export default DayStartedView;