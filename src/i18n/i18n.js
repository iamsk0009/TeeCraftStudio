import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translations directly
import enTranslation from "../locales/en/translation.json";
import frTranslation from "../locales/fr/translation.json";
import grTranslation from "../locales/german/translation.json";
import dtTransaltion from "../locales/dutch/translation.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  de: {
    translation: grTranslation,
  },
  nl: {
    translation: dtTransaltion,
  },
};

// Get language from WPML or fallback to default language detector
const getInitialLanguage = () => {
  // Priority 1: Check for WPML directory-based language (/fr/designer-tool)
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0];

  // Check if first segment is a language code
  if (firstSegment && ["en", "fr", "de", "nl"].includes(firstSegment)) {
    localStorage.setItem("wpml_language", firstSegment);
    return firstSegment;
  }

  // Priority 2: Check query parameter (?lang=fr)
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get("lang");

  if (langParam && ["en", "fr", "de", "nl"].includes(langParam)) {
    localStorage.setItem("wpml_language", langParam);
    return langParam;
  }

  const wpmlLanguage = localStorage.getItem("wpml_language") || "en";
  return wpmlLanguage;
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    // fallbackLng: 'en',
    lng: getInitialLanguage(),
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export default i18n;
