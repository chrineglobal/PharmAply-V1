import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { doc, updateDoc } from '../lib/firebase';
import { db } from '../lib/firebase';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

interface LanguageSwitcherProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'pill' | 'dropdown' | 'inline';
}

export function LanguageSwitcher({
  className = '',
  showLabels = true,
  variant = 'pill'
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language || 'fr';
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = async (code: string) => {
    try {
      await i18n.changeLanguage(code);
      localStorage.setItem('appLanguage', code);
      
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === code);
      if (langConfig) {
        document.documentElement.lang = code;
        document.documentElement.dir = langConfig.dir;
      }

      // Persist in user document if authenticated
      if (user?.uid) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            preferredLanguage: code
          });
        } catch (e) {
          // ignore if user doc doesn't allow update or is offline
        }
      }
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="language-switcher-button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 bg-[#F5FAFA] dark:bg-[#0E4A47] hover:bg-[#E7F1F1] dark:hover:bg-[#145250] text-[#0A3D3B] dark:text-[#D7F1EA] px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border border-[#CFE4E3] dark:border-[#145250] transition"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t('choose_language', 'Choisir la langue')}
      >
        <Globe size={14} className="text-[#0E7673] dark:text-[#38B794] shrink-0" />
        <span className="text-xs">{currentLang.flag}</span>
        {showLabels && <span className="uppercase tracking-wider font-bold">{currentLang.code}</span>}
        <ChevronDown size={12} className={`text-[#5C807F] dark:text-[#9FC8C7] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          id="language-dropdown-menu"
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-[#0A3D3B] shadow-xl border border-[#CFE4E3] dark:border-[#145250] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
          role="menu"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLangCode;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors text-left ${
                  isSelected
                    ? 'bg-[#D7F1EA] dark:bg-[#0E4A47] text-[#0E7673] dark:text-[#38B794] font-bold'
                    : 'text-[#0A3D3B] dark:text-[#D7F1EA] hover:bg-[#F5FAFA] dark:hover:bg-[#0E4A47]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{lang.flag}</span>
                  <div className="flex flex-col">
                    <span className="leading-none font-medium">{lang.nativeName}</span>
                    <span className="text-[10px] text-[#5C807F] dark:text-[#9FC8C7]">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-[#0E7673] dark:text-[#38B794] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
