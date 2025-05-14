import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import hiTranslations from '../locales/hi.json';

type LanguageContextType = {
  language: 'en' | 'hi';
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Get initial language from localStorage or default to English
  const storedLanguage = localStorage.getItem('language');
  const [language, setLanguage] = useState<'en' | 'hi'>(
    (storedLanguage as 'en' | 'hi') || 'en'
  );

  // Toggle language between English and Hindi
  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'hi' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Get translation by key
  const t = (key: string, params?: Record<string, string>): string => {
    const translations = language === 'en' ? enTranslations : hiTranslations;
    let translation = (translations as any)[key] || key;

    // Replace parameters in the translation
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{${paramKey}}`, value);
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}