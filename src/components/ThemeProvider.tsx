import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor?: string;
  logoUrl: string;
  defaultPharmacyLogo?: string;
  dashboardWelcomeText: string;
  dashboardSubtitleText: string;
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#194B4B',
  secondaryColor: '#F59E0B',
  logoUrl: '',
  defaultPharmacyLogo: '',
  dashboardWelcomeText: 'Bienvenue sur votre espace santé',
  dashboardSubtitleText: 'Retrouvez vos médicaments et services de santé en un clic.'
};

const ThemeContext = createContext<ThemeSettings>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        // Try Firestore first
        const docRef = doc(db, 'settings', 'theme');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTheme({ ...defaultTheme, ...docSnap.data() });
          return;
        }

        // Try Supabase settings if present
        const { data: supaSettings } = await supabase.from('settings').select('*').eq('key', 'theme').maybeSingle();
        if (supaSettings?.value) {
          const parsed = typeof supaSettings.value === 'string' ? JSON.parse(supaSettings.value) : supaSettings.value;
          setTheme({ ...defaultTheme, ...parsed });
        }
      } catch (error) {
        console.warn('Theme fetch notice (using defaults):', error);
      }
    };
    fetchTheme();
  }, []);

  useEffect(() => {
    const primary = theme.primaryColor || '#194B4B';
    const styleId = 'dynamic-theme-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      :root {
        --app-primary-color: ${primary};
        --color-indigo-600: var(--app-primary-color);
        --color-indigo-500: var(--app-primary-color);
        --color-primary: var(--app-primary-color);
      }
      .bg-primary-app, 
      .bg-[var(--app-primary-color)], 
      .bg-[#1a3b8d], 
      .bg-[var(--app-primary-color)] { 
        background-color: var(--app-primary-color) !important; 
      }
      .text-primary-app, 
      .text-[var(--app-primary-color)], 
      .text-[#1a3b8d], 
      .text-[var(--app-primary-color)] { 
        color: var(--app-primary-color) !important; 
      }
      .border-primary-app, 
      .border-[var(--app-primary-color)], 
      .border-[var(--app-primary-color)] { 
        border-color: var(--app-primary-color) !important; 
      }
      .fill-primary-app, 
      .fill-[var(--app-primary-color)], 
      .fill-[var(--app-primary-color)] { 
        fill: var(--app-primary-color) !important; 
      }
      .ring-primary-app, 
      .ring-[var(--app-primary-color)] { 
        --tw-ring-color: var(--app-primary-color) !important; 
      }
      .accent-primary-app {
        accent-color: var(--app-primary-color) !important;
      }
    `;
  }, [theme.primaryColor]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
