// Shop item component for displaying shop details in a list
import React, { useCallback, useState } from 'react';
import { MapPin, User, Phone } from 'lucide-react';
import { getMapUrl, getPhoneUrl, isMobile, formatLastVisitDate, truncateText } from '../utils/shopHelpers';

// Shop interface matching the one from ShopsPage
interface Shop {
  shop_id: string;
  name: string;
  address: string;
  territory: string;
  city: string;
  state: string;
  country: string;
  owner_name?: string;
  phone_number?: string;
  contact_person?: string;
  distance?: number;
  last_visit_date?: string;
  gps_location?: string;
}

interface ShopItemProps {
  shop: Shop;
  onVisit: (shopId: string) => void;
  canVisit: boolean;
  isVisitedToday?: boolean;
  isOnBreak?: boolean;
}

const ShopItem: React.FC<ShopItemProps> = ({ shop, onVisit, canVisit, isVisitedToday = false, isOnBreak = false }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleVisitClick = useCallback(() => {
    if (isVisitedToday) {
      setShowConfirmModal(true);
    } else {
      onVisit(shop.shop_id);
    }
  }, [shop.shop_id, onVisit, isVisitedToday]);

  const handleConfirmVisit = () => {
    setShowConfirmModal(false);
    onVisit(shop.shop_id);
  };

  const handleCancelVisit = () => {
    setShowConfirmModal(false);
  };

  // Generate map URL when component renders
  const mapUrl = shop.gps_location ? getMapUrl(shop.gps_location) : '';
  console.log('Shop GPS location:', shop.gps_location);
  console.log('Generated map URL:', mapUrl);
  
  // Handle map link click
  const handleMapClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    console.log('Map link clicked');
    console.log('Map URL being opened:', mapUrl);
    console.log('Shop GPS location:', shop.gps_location);
    
    // Only prevent default if no valid map URL
    if (!mapUrl) {
      e.preventDefault();
      console.error('No valid map URL available for this shop');
    } else {
      console.log('Opening map URL:', mapUrl);
      // Log that we're continuing with default behavior
      console.log('Continuing with default link behavior');
      
      // For testing only: Log whether this will open in a new tab
      console.log('Target attribute:', e.currentTarget.getAttribute('target'));
    }
    
    // Always stop propagation to prevent parent click handlers
    e.stopPropagation();
  };

  return (
    <div className="border-b pb-4">
      <div className="flex justify-between items-start">
        <div className="w-3/4">
          <h3 className="text-lg font-bold">{shop.name}</h3>
          <div className="flex items-center text-gray-600 mt-1">
            <MapPin className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
            {mapUrl ? (
              <a 
                href={mapUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="line-clamp-1 hover:underline text-gray-600"
                onClick={handleMapClick}
              >
                {truncateText(shop.address, 30)}
              </a>
            ) : (
              <span className="line-clamp-1">{truncateText(shop.address, 30)}</span>
            )}
          </div>
          
          {/* Owner and phone information displayed side by side */}
          <div className="flex items-center text-gray-600 mt-1">
            <User className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
            <span>{shop.owner_name || "No owner"}</span>
            
            {/* Spacer */}
            <span className="mx-2">•</span>
            
            <Phone className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
            {shop.phone_number && isMobile() ? (
              <a 
                href={getPhoneUrl(shop.phone_number)} 
                className="hover:underline text-gray-600"
                onClick={(e) => e.stopPropagation()}
              >
                {shop.phone_number}
              </a>
            ) : (
              <span>{shop.phone_number || "No phone"}</span>
            )}
          </div>
          
          <div className="flex items-center text-gray-600 mt-1">
            <User className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
            <span>Last visit: {formatLastVisitDate(shop.last_visit_date)}</span>
          </div>
          {shop.distance !== undefined && (
            <div className="text-gray-600 mt-1">
              <span>Distance: {shop.distance.toFixed(2)} km</span>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={handleVisitClick}
            className={`${
              isVisitedToday
                ? (isOnBreak ? 'bg-green-300 text-white cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white')
                : canVisit && !isOnBreak
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-300 text-white cursor-not-allowed'
            } text-base font-medium py-3 px-8 rounded-lg transition-colors duration-200 whitespace-nowrap`}
            style={isVisitedToday ? { pointerEvents: 'auto' } : {}}
            disabled={isOnBreak || !canVisit}
          >
            Visit
          </button>
          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full text-center">
                <div className="mb-4 text-lg font-semibold text-gray-800">
                  You have already visited the shop today.<br/>Do you want to visit the shop again?
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={handleConfirmVisit}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={handleCancelVisit}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopItem;