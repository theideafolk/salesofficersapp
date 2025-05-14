// Bottom navigation component for mobile app layout
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, ClipboardList, DollarSign, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
}

const BottomNavigation: React.FC = () => {
  const location = useLocation();
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
      labelKey: 'salesTitle',
      icon: <DollarSign size={24} />
    },
    {
      path: '/profile',
      labelKey: 'profileTitle', 
      icon: <User size={24} />
    }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-2 pb-2 pt-2 z-10">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-1/5 py-1 ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
              {item.icon}
            </div>
            <span className="text-xs mt-1">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigation;