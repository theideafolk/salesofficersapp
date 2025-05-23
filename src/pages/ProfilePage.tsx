import React, { useEffect, useState } from 'react';
import BottomNavigation from '../components/BottomNavigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Loader2, Phone, Lock } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useLanguage } from '../context/LanguageContext';

const APP_VERSION = 'v1.0.0';

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from('sales_officers')
          .select('name, address, phone_number, employee_id, dob')
          .eq('sales_officers_id', user.id)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  // Get initial for avatar
  const getInitial = (name: string) => {
    if (!name) return '';
    return name.trim().charAt(0).toUpperCase();
  };

  // Handle password change success
  const handlePasswordChangeSuccess = () => {
    setTimeout(() => {
      setIsChangePasswordModalOpen(false);
    }, 2000);
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header with Centered Title */}
      <header className="flex justify-between items-center py-4 px-4 bg-white shadow-sm relative">
        <img src="/assets/Benzorgo_revised_logo.png" alt="Logo" className="h-12 w-auto absolute left-4 top-1/2 -translate-y-1/2" />
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold">{t('profileTitle')}</h1>
        </div>
      </header>
      <main className="flex-grow px-4 pb-20 pt-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : profile ? (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 mt-4 mb-8 flex flex-col min-h-[500px]">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-700 mb-2">
                {getInitial(profile.name)}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{profile.name || '-'}</div>
              <div className="text-gray-500 text-base">{t('salesOfficer')}</div>
            </div>
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              <div className="text-gray-500 text-base">{t('employeeId')}</div>
              <div className="text-gray-900 text-base text-right">{profile.employee_id || '-'}</div>
              <div className="text-gray-500 text-base">{t('phoneNumber')}</div>
              <div className="text-gray-900 text-base text-right">{profile.phone_number || '-'}</div>
              <div className="text-gray-500 text-base">{t('dateOfBirth')}</div>
              <div className="text-gray-900 text-base text-right">{profile.dob ? new Date(profile.dob).toLocaleDateString('en-GB') : '-'}</div>
            </div>
            {/* Reporting Manager Section */}
            <div className="border-t border-gray-200 pt-4 mb-4 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-lg">{t('reportingManager')}</span>
                <a href="tel:9876543210" className="bg-blue-100 p-2 rounded-full ml-2">
                  <Phone className="h-6 w-6 text-blue-600" />
                </a>
              </div>
              <div className="font-semibold text-lg text-gray-800 mb-1">Anjali Verma</div>
              <div className="text-base text-gray-500 mb-1">{t('areaSalesManager')}</div>
              <div className="flex items-center justify-between">
                <div className="text-base text-gray-500">{t('phoneNumber')}</div>
                <div className="text-base text-gray-900">9876543210</div>
              </div>
            </div>
            {/* Language and App Version */}
            <div className="border-t border-gray-200 pt-4 mb-4 flex items-center justify-between">
              <div>
                <div className="text-base text-gray-500">{t('language')}</div>
                <button
                  className="text-lg font-medium text-gray-800 focus:outline-none"
                  onClick={toggleLanguage}
                >
                  {language === 'en' ? 'EN | हिंदी' : 'हिंदी | EN'}
                </button>
              </div>
              <div className="text-base text-gray-500 text-right">
                {t('appVersion')}<br />
                <span className="text-lg text-gray-800 font-medium">{APP_VERSION}</span>
              </div>
            </div>
            {/* Change Password Button */}
            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-base shadow-lg mt-2 mb-4 flex items-center justify-center"
            >
              <Lock className="inline-block mr-2" /> {t('changePassword')}
            </button>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-base shadow-lg"
            >
              <LogOut className="inline-block mr-2" /> {t('logout')}
            </button>
          </div>
        ) : null}
      </main>
      <BottomNavigation />
      
      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
};

export default ProfilePage;