import React from 'react';
import { Plus } from 'lucide-react';

interface ShopHeaderProps {
  shopName: string;
  onCreateOrder: () => void;
}

const ShopHeader: React.FC<ShopHeaderProps> = ({ shopName, onCreateOrder }) => {
  return (
    <>
      {/* Shop name heading */}
      <h2 className="text-3xl font-bold mb-6">{shopName}</h2>
      
      {/* Create New Order button */}
      <button
        onClick={onCreateOrder}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center text-lg mb-8"
      >
        <Plus size={24} className="mr-2" />
        CREATE NEW ORDER
      </button>
      
      {/* Recent Orders section title */}
      <h3 className="text-xl font-bold mb-4">Recent Orders for This Shop</h3>
    </>
  );
};

export default ShopHeader;