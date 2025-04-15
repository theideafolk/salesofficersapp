// Side Menu component for HomePage
import React from 'react';
import { Menu } from 'lucide-react';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
  isOpen, 
  onClose, 
  onLogout, 
  onDeleteAccount 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20"
      onClick={onClose}
    >
      <div 
        className="bg-white h-full w-3/4 max-w-xs p-5 flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on menu content
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">Menu</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close menu"
          >
            <Menu size={24} />
          </button>
        </div>
        
        <div className="flex-grow">
          <button 
            onClick={onLogout}
            className="bg-white hover:bg-gray-100 text-gray-800 w-full py-3 px-4 rounded-lg font-medium mb-2 text-left"
          >
            Logout
          </button>
          
          <button
            onClick={onDeleteAccount}
            className="bg-white hover:bg-gray-100 text-red-600 w-full py-3 px-4 rounded-lg font-medium text-left"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideMenu;