import React from 'react';
import { formatLastVisitDate } from '../../utils/shopHelpers';
import { MapPin, Plus, History } from 'lucide-react';

interface Shop {
  shop_id: string;
  name: string;
  last_visit?: string;
  distance?: number;
  address?: string;
  last_visit_date?: string;
  phone_number?: string;
  owner_name?: string;
}

interface VisitedShop {
  visit_id: string;
  shop_id: string;
  shop_name: string;
  visit_time: string;
}

interface ShopSelectorProps {
  activeTab: 'visited' | 'nearby';
  onTabChange: (tab: 'visited' | 'nearby') => void;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  visitedShops: VisitedShop[];
  nearbyShops: Shop[];
  onSelectShop: (shopId: string, shopName: string) => void;
  loading: boolean;
  nearbyShopsLoading: boolean;
  onNewOrder?: (shopId: string, shopName: string) => void;
  onViewHistory?: (shopId: string, shopName: string) => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  visitedShops,
  nearbyShops,
  onSelectShop,
  loading,
  nearbyShopsLoading,
  onNewOrder,
  onViewHistory
}) => {
  // Filter shops based on search term
  const filteredVisitedShops = searchTerm 
    ? visitedShops.filter(shop => 
        shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : visitedShops;
  
  return (
    <>
      {/* Shop selection tabs */}
      <div className="flex rounded-full bg-gray-100 p-1 mb-6">
        <button
          className={`flex-1 py-2 rounded-full ${
            activeTab === 'visited' ? 'bg-blue-500 text-white' : 'text-gray-700'
          }`}
          onClick={() => onTabChange('visited')}
        >
          Visited Shops
        </button>
        <button
          className={`flex-1 py-2 rounded-full ${
            activeTab === 'nearby' ? 'bg-blue-500 text-white' : 'text-gray-700'
          }`}
          onClick={() => onTabChange('nearby')}
        >
          Nearby Shops
        </button>
      </div>
      
      {/* Search bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          className="bg-gray-100 border border-gray-200 text-gray-900 text-base rounded-lg block w-full pl-10 p-2.5"
          placeholder="Search by shop name"
          value={searchTerm}
          onChange={onSearchChange}
        />
      </div>
      
      {/* Shop list heading */}
      <h2 className="text-2xl font-bold mb-4">
        {activeTab === 'visited' ? 'Shops Visited Today' : 'Shops Near You'}
      </h2>
      
      {/* Shop list */}
      {activeTab === 'visited' ? (
        // Visited shops view
        loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredVisitedShops.length > 0 ? (
          <div className="space-y-6">
            {filteredVisitedShops.map((shop) => (
              <div key={shop.visit_id} className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{shop.shop_name}</h3>
                    <p className="text-gray-600">Visited at {shop.visit_time}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onNewOrder ? onNewOrder(shop.shop_id, shop.shop_name) : onSelectShop(shop.shop_id, shop.shop_name)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg"
                      aria-label="New Order"
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => onViewHistory ? onViewHistory(shop.shop_id, shop.shop_name) : onSelectShop(shop.shop_id, shop.shop_name)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg"
                      aria-label="Order History"
                    >
                      <History size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No shops visited today. Visit a shop to place orders.
          </div>
        )
      ) : (
        // Nearby shops view
        nearbyShopsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : nearbyShops.length > 0 ? (
          <div className="space-y-6">
            {nearbyShops.map((shop) => (
              <div key={shop.shop_id} className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{shop.name}</h3>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{shop.distance?.toFixed(1)} km away</span>
                    </div>
                    {shop.last_visit_date && (
                      <div className="text-gray-600 mt-1">
                        Last visit: {formatLastVisitDate(shop.last_visit_date)}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onNewOrder ? onNewOrder(shop.shop_id, shop.name) : onSelectShop(shop.shop_id, shop.name)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg"
                      aria-label="New Order"
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => onViewHistory ? onViewHistory(shop.shop_id, shop.name) : onSelectShop(shop.shop_id, shop.name)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg"
                      aria-label="Order History"
                    >
                      <History size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No shops found nearby. Try adding new shops or check your location settings.
          </div>
        )
      )}
    </>
  );
};

export default ShopSelector;