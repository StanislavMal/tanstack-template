// 📄 src/i18n.ts (Новая версия)

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// -> ИЗМЕНЕНИЕ: Импортируем переводы напрямую, как ресурсы
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

i18n
  // -> ИЗМЕНЕНИЕ: Убираем HttpBackend, так как ресурсы теперь встроены
  // .use(HttpBackend) 
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources, // -> ИЗМЕНЕНИЕ: Передаем ресурсы напрямую
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

    // -> ИЗМЕНЕНИЕ: Добавляем эти опции для корректной работы в SSR
    // Не загружать языки, которые не переданы в 'lng'
    // (важно для сервера, чтобы он не пытался что-то догружать)
    react: {
      useSuspense: false, 
    },
    // Не загружать неполные переводы
    partialBundledLanguages: true,
  });

export default i18n;