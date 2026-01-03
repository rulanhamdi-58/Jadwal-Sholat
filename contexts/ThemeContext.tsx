import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

// Keep the union type so checks in other components don't fail compilation
export type ThemeId = 'midnight' | 'subuh' | 'maghrib';

export interface ThemeColors {
  id: ThemeId;
  label: string;
  appBg: string;
  cardBg: string;
  cardBorder: string;
  textMain: string;
  textMuted: string;
  accent: string;
  accentBg: string; // for buttons/active states
  clockFace: string;
  clockBezel: string;
  clockNumber: string;
  clockHandHour: string;
  clockHandMinute: string;
  clockHandSecond: string;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    appBg: 'bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950 via-slate-950 to-black',
    cardBg: 'bg-slate-900/60',
    cardBorder: 'border-slate-800/80',
    textMain: 'text-slate-100',
    textMuted: 'text-slate-400',
    accent: 'text-emerald-500', 
    accentBg: 'bg-emerald-500', 
    clockFace: 'bg-[radial-gradient(circle_at_30%_30%,_rgba(30,41,59,1)_0%,_rgba(2,6,23,1)_100%)]',
    clockBezel: 'bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950',
    clockNumber: 'text-white',
    clockHandHour: 'stroke-slate-200',
    clockHandMinute: 'stroke-slate-400',
    clockHandSecond: 'stroke-emerald-500', 
  },
  subuh: {
    id: 'subuh',
    label: 'Subuh',
    appBg: 'bg-[#f0f9ff] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-200 via-white to-slate-100',
    cardBg: 'bg-white/70',
    cardBorder: 'border-white/60',
    textMain: 'text-slate-800',
    textMuted: 'text-slate-500',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-600',
    clockFace: 'bg-[radial-gradient(circle_at_30%_30%,_#ffffff_0%,_#e2e8f0_100%)]',
    clockBezel: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
    clockNumber: 'text-slate-800',
    clockHandHour: 'stroke-slate-800',
    clockHandMinute: 'stroke-slate-600',
    clockHandSecond: 'stroke-emerald-600',
  },
  maghrib: {
    id: 'maghrib',
    label: 'Maghrib',
    appBg: 'bg-[#1a0b2e] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-[#1a0b2e] to-black',
    cardBg: 'bg-[#2d1b4e]/60',
    cardBorder: 'border-purple-800/50',
    textMain: 'text-purple-50',
    textMuted: 'text-purple-300',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500',
    clockFace: 'bg-[radial-gradient(circle_at_30%_30%,_#4c1d95_0%,_#1e1b4b_100%)]',
    clockBezel: 'bg-gradient-to-br from-amber-700 via-purple-900 to-slate-950',
    clockNumber: 'text-amber-100',
    clockHandHour: 'stroke-amber-100',
    clockHandMinute: 'stroke-purple-200',
    clockHandSecond: 'stroke-amber-400',
  }
};

interface ThemeContextType {
  theme: ThemeColors;
  currentThemeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>('midnight');

  useEffect(() => {
    // Load saved theme from local storage
    const savedTheme = localStorage.getItem('app-theme') as ThemeId;
    if (savedTheme && THEMES[savedTheme]) {
      setThemeId(savedTheme);
    }
  }, []);

  const handleSetTheme = (id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem('app-theme', id);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: THEMES[themeId], 
      currentThemeId: themeId,
      setTheme: handleSetTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};