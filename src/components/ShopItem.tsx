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

  return (
    <div className="border-b pb-4">
      <div className="flex justify-between items-start">
        <div className="w-3/4">
          <h3 className="text-lg font-bold">{shop.name}</h3>
          <div className="flex items-center text-gray-600 mt-1">
            <MapPin className="h-4 w-4 mr-1 min-w-4 flex-shrink-0" />
            <a 
              href={getMapUrl(shop.gps_location)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="line-clamp-1 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {truncateText(shop.address, 30)}
            </a>
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
                className="hover:underline"
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