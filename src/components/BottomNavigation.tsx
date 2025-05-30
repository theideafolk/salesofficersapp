// Bottom navigation component for mobile app layout
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Store, ClipboardList, DollarSign, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
}

interface BottomNavigationProps {
  onNavigationAttempt?: (path: string) => boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ onNavigationAttempt }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const navItems: NavItem[] = [
    {
      path: '/',
      labelKey: 'home',
      icon: <Home size={24} />
    },
    {
      path: '/shops',
      labelKey: 'visitShopTitle',
      icon: <Store size={24} />
    },
    {
      path: '/orders',
      labelKey: 'ordersTitle',
      icon: <ClipboardList size={24} />
    },
    {
      path: '/sales',
      labelKey: 'salesNavTitle',
      icon: <DollarSign size={24} />
    },
    {
      path: '/profile',
      labelKey: 'profileTitle', 
      icon: <User size={24} />
    }
  ];

  const handleNavigation = (path: string) => {
    if (onNavigationAttempt) {
      const shouldNavigate = onNavigationAttempt(path);
      if (shouldNavigate) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-2 pb-2 pt-2 z-10">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className={`flex flex-col items-center justify-center w-1/5 py-1 ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
              {item.icon}
            </div>
            <span className="text-xs mt-1">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNavigation;