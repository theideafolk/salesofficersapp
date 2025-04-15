// Confirmation modal component for ending the day
import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const ConfirmEndDayModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, loading }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
          disabled={loading}
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-800">End Your Day?</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to end your day?
            </p>
            <p className="text-gray-600 text-sm">
              This will mark the end of your working hours for today. You won't be able to start a new day until tomorrow.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ending...
                </>
              ) : (
                'End Day'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEndDayModal;