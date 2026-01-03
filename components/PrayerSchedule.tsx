import React from 'react';
import { PrayerTime } from '../types';
import { PRAYER_NAMES_ID } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface PrayerScheduleProps {
  prayers: PrayerTime[];
  onPrevDay?: () => void;
  onNextDay?: () => void;
  isLoading?: boolean;
}

const PrayerSchedule: React.FC<PrayerScheduleProps> = ({ prayers, onPrevDay, onNextDay, isLoading }) => {
  const { theme } = useTheme();

  return (
    <div className={`w-full max-w-sm mx-auto ${theme.id === 'subuh' ? 'bg-slate-50/50' : 'bg-slate-900/50'} backdrop-blur-md rounded-2xl border ${theme.cardBorder} p-4 transition-all duration-300`}>
      
      {/* Header with Navigation */}
      <div className={`flex items-center justify-between mb-4 border-b ${theme.id === 'subuh' ? 'border-slate-200' : 'border-slate-800'} pb-2`}>
        <button 
          onClick={onPrevDay}
          disabled={isLoading}
          className={`p-2 rounded-full ${theme.id === 'subuh' ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'} disabled:opacity-30 transition-colors`}
          aria-label="Hari Sebelumnya"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className={`text-center text-amber-500 font-arabic text-xl`}>
           مواقيت الصلاة
        </h3>

        <button 
          onClick={onNextDay}
          disabled={isLoading}
          className={`p-2 rounded-full ${theme.id === 'subuh' ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'} disabled:opacity-30 transition-colors`}
          aria-label="Hari Selanjutnya"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className={`space-y-2 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
        {prayers.map((prayer, idx) => {
          const isActive = prayer.isNext;
          return (
            <div 
              key={idx}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? `${theme.id === 'subuh' ? 'bg-emerald-100 border-emerald-300' : 'bg-emerald-900/30 border-emerald-500/30'} border shadow-sm translate-x-1` 
                  : `hover:${theme.id === 'subuh' ? 'bg-slate-100' : 'bg-slate-800/50'}`
              }`}
            >
              <div className="flex flex-col items-start gap-0.5">
                 <span className={`font-arabic text-xl leading-none ${isActive ? theme.accent : theme.textMuted}`}>
                   {prayer.nameArabic}
                 </span>
                 <span className={`text-xs font-medium uppercase tracking-wide opacity-80 ${isActive ? theme.textMain : theme.textMuted}`}>
                    {PRAYER_NAMES_ID[prayer.name as keyof typeof PRAYER_NAMES_ID]}
                 </span>
              </div>
              
              <div className={`font-mono text-xl ${isActive ? `${theme.accent} font-bold` : theme.textMuted}`}>
                {prayer.time}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrayerSchedule;