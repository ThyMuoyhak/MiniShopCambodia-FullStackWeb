import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { useLanguage } from '../i18n';

export default function LanguageSwitcher({ dark }) {
  const { lang, toggle } = useLanguage();

  return (
    <button
      onClick={toggle}
      title="ភាសា / Language"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
        dark
          ? 'text-gray-300 border-gray-600 hover:bg-gray-800'
          : 'text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
      }`}
    >
      <FiGlobe className="w-3.5 h-3.5" />
      <span className="font-bold">{lang === 'kh' ? 'ខ្មែរ' : 'EN'}</span>
    </button>
  );
}
