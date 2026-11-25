import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from './DarkModeProvider';
import { useTranslation } from "react-i18next";

export function DarkModeToggle({ className = '' }: { className?: string }) {
    const { t } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`relative p-2 rounded-full transition-colors flex items-center justify-center ${
        isDarkMode
          ? 'bg-[#0A3D3B] text-[#38B794] hover:bg-[#0E7673] hover:text-white'
          : 'bg-[#E7F1F1] text-[#0E7673] hover:bg-[#CFE4E3]'
      } ${className}`}
      aria-label="Toggle Dark Mode"
      title={t('toggle_dark_mode', 'Toggle Dark Mode')}
    >
      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
