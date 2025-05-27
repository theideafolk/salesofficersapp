import React from 'react';
import { X, CheckCircle, MapPin, Clock } from 'lucide-react';

interface VisitConfirmedModalProps {
  open: boolean;
  shopName: string;
  imageUrl?: string | null;
  visitTime: string;
  onPlaceOrder?: () => void;
  onEntryDenied?: () => void;
  onClose: () => void;
}

const VisitConfirmedModal: React.FC<VisitConfirmedModalProps> = ({
  open,
  shopName,
  imageUrl,
  visitTime,
  onPlaceOrder,
  onEntryDenied,
  onClose
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md relative shadow-xl border border-green-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-800"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="bg-green-500 rounded-full p-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">Visit Confirmed</h2>
          <h3 className="text-xl font-medium text-center mb-4">{shopName}</h3>
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 mr-2 text-gray-800" />
              <span className="text-base text-gray-800">GPS location captured</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-800" />
              <span className="text-base text-gray-800">{visitTime}</span>
            </div>
          </div>
          {imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 flex justify-center items-center bg-gray-50">
              <div className="w-full h-40 relative">
                <img 
                  src={imageUrl} 
                  alt="Visit proof" 
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>
          )}
          <div className="flex items-center mb-6">
            <div className="bg-green-500 rounded-full p-1 mr-2">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-base">Proof of visit logged</span>
          </div>
          <div className="flex flex-row gap-2">
            {onPlaceOrder && (
              <button
                onClick={onPlaceOrder}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded-lg text-base"
              >
                Place Order
              </button>
            )}
            {onEntryDenied && (
              <button
                onClick={onEntryDenied}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-lg text-base"
              >
                Entry Denied
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitConfirmedModal; 