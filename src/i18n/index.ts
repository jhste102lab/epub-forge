import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';
import zh from './locales/zh';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// A prerendered per-language page sets window.__INITIAL_LANG__; honor it first
// so /ja/, /ko/ … open in that language.
const detector = new LanguageDetector();
detector.addDetector({
  name: 'initialGlobal',
  lookup: () => window.__INITIAL_LANG__,
});

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['initialGlobal', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync for accessibility and SEO.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;
