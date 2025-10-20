// 📄 src/i18n.ts (Новая, исправленная версия)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем переводы напрямую, как ресурсы
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

const i18nInstance = i18n
  .use(initReactI18next);

// -> ИЗМЕНЕНИЕ: Используем детектор языка только на стороне клиента
if (!import.meta.env.SSR) {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
    resources, 
    // -> ИЗМЕНЕНИЕ: На сервере всегда используем fallbackLng, чтобы избежать расхождений.
    // На клиенте `lng` будет `undefined`, что позволит LanguageDetector'у сработать.
    lng: import.meta.env.SSR ? 'ru' : undefined,
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

export default i18n;