import React, { useMemo, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface MonthlyCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CalendarEvent {
  day: number;
  monthIndex: number; // 1 = Muharram, 12 = Dzulhijjah
  title: string;
  type: 'holiday' | 'pondok';
}

const EVENTS: CalendarEvent[] = [
  // HARI BESAR ISLAM
  { day: 1, monthIndex: 1, title: "Awal Tahun Hijriyah", type: 'holiday' },
  { day: 12, monthIndex: 3, title: "Maulid Nabi", type: 'holiday' },
  { day: 27, monthIndex: 7, title: "Isra' Mi'raj", type: 'holiday' },
  { day: 15, monthIndex: 8, title: "Nisfu Sya'ban", type: 'holiday' },
  { day: 1, monthIndex: 9, title: "Awal Ramadlan", type: 'holiday' },
  { day: 17, monthIndex: 9, title: "Nuzulul Qur'an", type: 'holiday' },
  { day: 1, monthIndex: 10, title: "Hari Raya Idul Fitri", type: 'holiday' },
  { day: 9, monthIndex: 12, title: "Arafah", type: 'holiday' },
  { day: 10, monthIndex: 12, title: "Hari Raya Idul Adha", type: 'holiday' },

  // HARI PENTING PONDOK
  { day: 8, monthIndex: 3, title: "Libur Maulid", type: 'pondok' }, 
  { day: 15, monthIndex: 4, title: "Haul Gus Imam Sanusi", type: 'pondok' }, 
  { day: 14, monthIndex: 5, title: "Haul Gus M. Kholid MM", type: 'pondok' }, 
  { day: 4, monthIndex: 7, title: "Haul KH. Abdulloh Chunain", type: 'pondok' }, 
  { day: 19, monthIndex: 8, title: "Libur Akhirus Sanah", type: 'pondok' }, 
  { day: 15, monthIndex: 10, title: "Tahun Ajaran Baru", type: 'pondok' }, 
  { day: 7, monthIndex: 11, title: "Haul Gus Ahsanan Nidhom", type: 'pondok' }, 
  { day: 21, monthIndex: 11, title: "Haul Ibu Nyai Hj. Humaidah", type: 'pondok' }, 
  { day: 26, monthIndex: 11, title: "Haul Neng Hj. Nur Inayah", type: 'pondok' }, 
];

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [viewDate, setViewDate] = useState(new Date());

  // Reset view to current month when modal opens & Lock Scroll
  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Formatters
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric' });
    // NEW: Formatter for Agenda (Day + Month Name in Arabic)
    const hijriAgendaFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long' });

    const latnDayFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' });
    const latnMonthFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric' });
    const idDateFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long' });

    // Formatters for Header Title (Checking range)
    const hijriMonthTitleFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long' });
    const hijriYearTitleFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { year: 'numeric' });

    // Logic to determine Hijri Title (Range)
    const startHMonth = hijriMonthTitleFmt.format(firstDay);
    const startHYear = hijriYearTitleFmt.format(firstDay);
    const endHMonth = hijriMonthTitleFmt.format(lastDay);
    const endHYear = hijriYearTitleFmt.format(lastDay);

    let finalHijriTitle = "";
    if (startHYear === endHYear) {
        if (startHMonth === endHMonth) {
            finalHijriTitle = `${startHMonth} ${startHYear}`;
        } else {
            // "Rajab - Sha'ban 1447"
            finalHijriTitle = `${startHMonth} - ${endHMonth} ${startHYear}`;
        }
    } else {
        // "Dhu al-Hijjah 1446 - Muharram 1447"
        finalHijriTitle = `${startHMonth} ${startHYear} - ${endHMonth} ${endHYear}`;
    }

    const getHijriParts = (date: Date) => {
      const d = latnDayFormatter.format(date);
      const m = latnMonthFormatter.format(date);
      return { day: parseInt(d), month: parseInt(m) };
    };

    const days = [];
    const activeEvents: { date: string, title: string, type: string, hijriDate: string }[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const hijriText = hijriFormatter.format(date);
      const { day: hDay, month: hMonth } = getHijriParts(date);
      
      const isToday = 
        date.getDate() === new Date().getDate() && 
        date.getMonth() === new Date().getMonth() && 
        date.getFullYear() === new Date().getFullYear();

      const event = EVENTS.find(e => e.day === hDay && e.monthIndex === hMonth);
      
      if (event) {
        activeEvents.push({
          date: `${i} ${idDateFormatter.format(date)}`,
          hijriDate: hijriAgendaFormatter.format(date), // Day and Month in Arabic
          title: event.title,
          type: event.type
        });
      }

      days.push({
        gregorian: i,
        hijri: hijriText,
        isToday: isToday,
        event: event
      });
    }

    activeEvents.sort((a, b) => parseInt(a.date) - parseInt(b.date));

    return {
      hijriTitle: finalHijriTitle,
      gregorianTitle: viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      days,
      activeEvents
    };
  }, [viewDate]);

  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col ${theme.appBg} transition-all duration-500 ease-in-out transform ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Decorative BG elements for full screen feel */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      
      <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between p-4 md:p-6 shrink-0 z-10">
            <h2 className={`text-xl md:text-3xl font-arabic font-bold ${theme.accent} drop-shadow-sm`}>
                التقويم الهجري
            </h2>
            <button 
                onClick={onClose}
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${theme.id === 'subuh' ? 'bg-white/80 hover:bg-white text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white'} backdrop-blur-md shadow-sm transition-all border ${theme.cardBorder}`}
            >
                <span className="text-lg">✕</span>
                <span className="text-sm font-medium hidden md:inline">Tutup</span>
            </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-0">
             <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-10">
                
                {/* CALENDAR SECTION */}
                <div className="flex-1 flex flex-col space-y-6">
                    
                    {/* Month Navigator Card */}
                    <div className={`${theme.cardBg} backdrop-blur-md rounded-3xl border ${theme.cardBorder} p-6 flex items-center justify-between shadow-lg`}>
                        <button onClick={handlePrevMonth} className={`p-3 rounded-full ${theme.id === 'subuh' ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-300'} transition-colors`}>
                           <svg className="w-6 h-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="text-center">
                            <h2 className={`text-3xl md:text-5xl font-arabic ${theme.accent} mb-2 leading-tight px-2`}>{calendarData.hijriTitle}</h2>
                            <p className={`${theme.textMuted} font-mono tracking-[0.2em] text-sm uppercase`}>{calendarData.gregorianTitle}</p>
                        </div>

                        <button onClick={handleNextMonth} className={`p-3 rounded-full ${theme.id === 'subuh' ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-300'} transition-colors`}>
                           <svg className="w-6 h-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Grid */}
                    <div className={`${theme.cardBg} backdrop-blur-md rounded-3xl border ${theme.cardBorder} p-4 md:p-6 shadow-xl`}>
                        <div className="grid grid-cols-7 mb-4">
                            {weekDays.map((day, idx) => (
                                <div key={idx} className={`text-center font-arabic text-sm md:text-lg font-bold py-2 ${
                                    idx === 5 ? 'text-emerald-500' : idx === 0 ? 'text-red-500' : theme.textMuted
                                }`}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 md:gap-2">
                             {calendarData.days.map((day, idx) => {
                                if (!day) return <div key={idx} className="aspect-square"></div>;
                                
                                const isSunday = idx % 7 === 0;
                                const isFriday = idx % 7 === 5;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className={`aspect-square relative flex flex-col items-center justify-center rounded-xl border transition-all duration-300 group hover:scale-[1.02] ${
                                            day.isToday 
                                                ? `${theme.id === 'subuh' ? 'bg-amber-100 border-amber-300' : 'bg-amber-900/40 border-amber-500/50'} shadow-md` 
                                                : day.event 
                                                    ? day.event.type === 'holiday' 
                                                        ? `${theme.id === 'subuh' ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-700/40'}` 
                                                        : `${theme.id === 'subuh' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-700/40'}`
                                                    : `${theme.id === 'subuh' ? 'bg-slate-50 border-slate-100 hover:bg-white' : 'bg-white/5 border-white/5 hover:bg-white/10'}`
                                        }`}
                                    >
                                        {/* Hijri Number */}
                                        <span className={`font-arabic text-xl md:text-3xl font-bold ${
                                            day.isToday ? theme.accent :
                                            day.event?.type === 'holiday' ? 'text-red-400' :
                                            isSunday ? 'text-red-500' :
                                            isFriday ? 'text-emerald-500' :
                                            theme.textMain
                                        }`}>
                                            {day.hijri}
                                        </span>
                                        
                                        {/* Gregorian Number */}
                                        <span className={`absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 text-[10px] md:text-xs font-mono opacity-60 ${day.isToday ? 'text-amber-600 font-bold' : theme.textMuted}`}>
                                            {day.gregorian}
                                        </span>

                                        {/* Dots for Events */}
                                        {day.event && (
                                            <div className={`absolute top-2 right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                                                day.event.type === 'holiday' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                                            }`}></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* AGENDA SECTION (Sidebar on Desktop, Bottom on Mobile) */}
                <div className={`w-full lg:w-96 shrink-0 flex flex-col gap-6`}>
                    <div className={`${theme.cardBg} backdrop-blur-md rounded-3xl border ${theme.cardBorder} p-6 shadow-xl h-full flex flex-col`}>
                        <h3 className={`text-lg font-bold ${theme.accent} mb-4 flex items-center gap-2 uppercase tracking-widest`}>
                            <span>📅</span> Agenda Bulan Ini
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {calendarData.activeEvents.length > 0 ? (
                                calendarData.activeEvents.map((evt, idx) => (
                                    <div key={idx} className={`group p-4 rounded-2xl border transition-all hover:translate-x-1 ${
                                        evt.type === 'holiday' 
                                            ? `${theme.id === 'subuh' ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-red-900/20 border-red-900/30 hover:bg-red-900/30'}` 
                                            : `${theme.id === 'subuh' ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100' : 'bg-emerald-900/20 border-emerald-900/30 hover:bg-emerald-900/30'}`
                                    }`}>
                                        <div className="flex items-start justify-between mb-1">
                                            <span className={`font-arabic text-lg ${evt.type === 'holiday' ? 'text-red-500' : 'text-emerald-500'}`}>{evt.hijriDate}</span>
                                            <span className={`text-xs font-mono opacity-50 ${theme.textMain}`}>{evt.date}</span>
                                        </div>
                                        <p className={`font-medium ${theme.textMain}`}>{evt.title}</p>
                                    </div>
                                ))
                            ) : (
                                <div className={`text-center py-10 ${theme.textMuted} italic opacity-50 flex flex-col items-center`}>
                                    <span className="text-4xl mb-2">✨</span>
                                    Tidak ada agenda penting.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

             </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;