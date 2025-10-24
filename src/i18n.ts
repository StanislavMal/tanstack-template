// 📄 src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationRU from './locales/ru/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ru: {
    translation: translationRU,
  },
};

const i18nInstance = i18n.use(initReactI18next);

// ✅ ИСПРАВЛЕНИЕ: Используем детектор только на клиенте
if (!import.meta.env.SSR) {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
  resources,
  
  // ✅ ИСПРАВЛЕНИЕ: На сервере и клиенте используем одинаковый fallback
  // Детектор языка сработает ПОСЛЕ гидратации через changeLanguage
  lng: 'ru', // Всегда рендерим русский при SSR и первоначальной гидратации
  fallbackLng: 'ru',
  supportedLngs: ['en', 'ru'],
  debug: import.meta.env.DEV,

  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  },
  
  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },

  partialBundledLanguages: true,
});

// ✅ ИСПРАВЛЕНИЕ: На клиенте после гидратации применяем детектированный язык
if (!import.meta.env.SSR && typeof window !== 'undefined') {
  // Откладываем детектирование до следующего тика, чтобы избежать hydration mismatch
  setTimeout(() => {
    const detectedLang = 
      localStorage.getItem('i18nextLng') || 
      navigator.language.split('-')[0];
    
    if (detectedLang && ['en', 'ru'].includes(detectedLang) && detectedLang !== i18n.language) {
      i18n.changeLanguage(detectedLang);
    }
  }, 0);
}

export default i18n;