import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    // Store both WPML and i18next language preferences
    localStorage.setItem('wpml_language', lng);
    // localStorage.setItem('i18nextLng', lng);
    i18n.changeLanguage(lng).then(() => {
      // console.log("Language changed, new language:", i18n.language);
    });
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 md:left-[2%]  md:translate-x-0 z-20 layer-controls">
      <div className="mx-auto">
        <select
          className="px-3 py-2 border border-[#10196A] rounded-md cursor-pointer bg-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 hover:border-purple-600 transition-all duration-300"
          value={i18n.language}
          onChange={(e) => changeLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="de">German</option>
          <option value="nl">Dutch</option>
        </select>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
