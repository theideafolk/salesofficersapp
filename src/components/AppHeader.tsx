// Header component for the app with menu, language selector and logout button
import React from 'react';
import { Menu, LogOut, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AppHeaderProps {
  onToggleMenu: () => void;
  menuOpen: boolean;
  onLogout?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  onToggleMenu, 
  menuOpen, 
  onLogout 
}) => {
  const { language, toggleLanguage } = useLanguage();
  
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };
  
  return (
    <header className="flex justify-between items-center py-4 px-4 bg-white">
      <button 
        className="text-gray-800 focus:outline-none"
        onClick={onToggleMenu}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      <button
        className="text-gray-800 text-lg font-medium focus:outline-none"
        onClick={toggleLanguage}
      >
        {language === 'en' ? 'EN | हिंदी' : 'हिंदी | EN'}
      </button>
      
      <button 
        className="text-gray-800 focus:outline-none"
        onClick={handleLogout}
        aria-label="Logout"
      >
        <LogOut size={24} />
      </button>
    </header>
  );
};

export default AppHeader;