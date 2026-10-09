import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import mlTranslations from '../locales/ml.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  ml: {
    translation: mlTranslations,
  },
};

const savedLang =
  typeof window !== 'undefined' ? localStorage.getItem('careone_lang') || 'en' : 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
