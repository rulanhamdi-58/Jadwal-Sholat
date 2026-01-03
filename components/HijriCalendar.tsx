import React from 'react';
import { HijriDateInfo } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface HijriCalendarProps {
  hijri: HijriDateInfo;
  gregorian: string;
}

const HijriCalendar: React.FC<HijriCalendarProps> = ({ hijri, gregorian }) => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
      {/* Decorative Arch Top */}
      <div className={`w-16 h-1 ${theme.accentBg} bg-opacity-50 rounded-full mb-4`}></div>
      
      {/* Hijri Date (Arabic) */}
      <div className={`font-arabic text-3xl md:text-4xl font-bold ${theme.id === 'subuh' ? 'text-amber-600' : 'text-amber-500'} tracking-wide drop-shadow-md leading-relaxed`}>
        {hijri.dayNameArabic} {hijri.fullString}
      </div>

      {/* Gregorian Date (Latin) */}
      <div className={`font-sans text-xl md:text-2xl font-bold ${theme.textMain} tracking-wide opacity-90`}>
        {gregorian}
      </div>
    </div>
  );
};

export default HijriCalendar;