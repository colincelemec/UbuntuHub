import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get saved language from localStorage or default to English
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ubuntuhub-language') || 'en';
  });

  // Save language preference to localStorage whenever it changes
  // and keep <html lang="…"> in sync (SEO + screen readers pronounce
  // the page correctly, and it drives CSS :lang() rules).
  useEffect(() => {
    localStorage.setItem('ubuntuhub-language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  const value = {
    language,
    changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
