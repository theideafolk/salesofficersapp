// Shop item component for displaying shop details in a list
import React, { useCallback } from 'react';
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
}

const ShopItem: React.FC<ShopItemProps> = ({ shop, onVisit, canVisit }) => {
  const handleVisitClick = useCallback(() => {
    onVisit(shop.shop_id);
  }, [shop.shop_id, onVisit]);

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
        <button
          onClick={handleVisitClick}
          className={`${
            canVisit
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-green-300 cursor-not-allowed'
          } text-white font-medium py-3 px-8 rounded-lg text-base`}
          disabled={!canVisit}
        >
          Visit
        </button>
      </div>
    </div>
  );
};

export default ShopItem;