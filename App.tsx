import React, { useEffect, useState } from 'react';
import { DailyData, GeoLocation, WeatherData } from './types';
import { DEFAULT_LOCATION, FALLBACK_DATA } from './constants';
import { fetchDailyIslamicData } from './services/geminiService';
import { fetchWeatherData } from './services/weatherService';
import { ThemeProvider, useTheme, ThemeId } from './contexts/ThemeContext';
import AnalogClock from './components/AnalogClock';
import HijriCalendar from './components/HijriCalendar';
import PrayerSchedule from './components/PrayerSchedule';
import WeatherWidget from './components/WeatherWidget';
import MonthlyCalendar from './components/MonthlyCalendar';

const AppContent: React.FC = () => {
  const { theme, setTheme, currentThemeId } = useTheme();
  // Initialize with FALLBACK_DATA so the user sees the 13 Rajab 1447 date immediately
  const [data, setData] = useState<DailyData | null>(FALLBACK_DATA);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Helper to determine next prayer based on current time
  // ONLY highlights if selectedDate is TODAY
  const markNextPrayer = (data: DailyData, targetDate: Date): DailyData => {
    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();

    // If viewing a different day, do not highlight any prayer as "Next"
    if (!isToday) {
        return { 
            ...data, 
            prayers: data.prayers.map(p => ({ ...p, isNext: false })) 
        };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let nextPrayerIndex = -1;
    let minDiff = Infinity;

    // Find Maghrib time to determine "night" boundary
    // Use flexible matching for 'Maghrib'
    const maghrib = data.prayers.find(p => 
        p.name.toLowerCase() === 'maghrib' || p.nameArabic.includes('المغرب')
    );
    
    let maghribMinutes = 18 * 60; // Default fallback
    if (maghrib) {
      const [mh, mm] = maghrib.time.split(':').map(Number);
      maghribMinutes = mh * 60 + mm;
    }

    data.prayers.forEach((p, idx) => {
        const [h, m] = p.time.split(':').map(Number);
        let prayerMinutes = h * 60 + m;
        
        // Logic for Midnight and LastThird:
        // These times can theoretically be "tomorrow" (e.g. 01:00 AM) relative to the Gregorian date of the schedule,
        // but are part of the "Current Night".
        // Ensure we check multiple possible name variations
        const isNightPrayer = 
            ['Midnight', 'LastThird', 'Isha'].includes(p.name) || 
            ['نصف الليل', 'الثلث الأخير', 'العشاء'].some(n => p.nameArabic.includes(n));

        // If the prayer is a night prayer and its time is numerically smaller than Maghrib (e.g. 01:00 < 18:00),
        // it means it belongs to the next day (crossing midnight).
        if (isNightPrayer && prayerMinutes < maghribMinutes) {
            prayerMinutes += 24 * 60;
        }

        // Check if prayer is in the future today (or early tomorrow for night prayers)
        // Note: This logic assumes we are looking for the next prayer in the supplied list.
        if (prayerMinutes > currentMinutes) {
            const diff = prayerMinutes - currentMinutes;
            if (diff < minDiff) {
                minDiff = diff;
                nextPrayerIndex = idx;
            }
        }
    });

    // If no prayer left today/tonight found, next is Fajr (index 0) tomorrow
    if (nextPrayerIndex === -1) nextPrayerIndex = 0;

    const updatedPrayers = data.prayers.map((p, idx) => ({
        ...p,
        isNext: idx === nextPrayerIndex
    }));

    return { ...data, prayers: updatedPrayers };
  };

  const loadData = async (loc: GeoLocation, date: Date) => {
    setLoading(true);
    // Only reload weather if location changes significantly (omitted for simplicity here, just reloading)
    // Or if we want to separate logic. For now, we only fetch weather once on mount usually, 
    // but here we just keep it simple. Weather is usually 'current' weather, not forecast for that day.
    if (!weather) {
        setLoadingWeather(true);
        fetchWeatherData(loc.lat, loc.lng)
        .then(wData => setWeather(wData))
        .catch(e => console.error("Weather load failed", e))
        .finally(() => setLoadingWeather(false));
    }

    setError(null);
    
    try {
      const result = await fetchDailyIslamicData(loc, date);
      setData(markNextPrayer(result, date));
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data jadwal sholat. Menggunakan data fallback.");
      // Use fallback but try to mark next prayer roughly
      setData(markNextPrayer(FALLBACK_DATA, date));
    } finally {
      setLoading(false);
    }
  };

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
    if (location) {
        loadData(location, newDate);
    }
  };

  useEffect(() => {
    // Attempt Geolocation with High Accuracy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log("GPS Precision Obtained:", loc);
          setLocation(loc);
          // Initial load for today
          const now = new Date();
          setSelectedDate(now);
          loadData(loc, now);
        },
        (err) => {
          console.warn("Geolocation denied or failed", err);
          setLocation(DEFAULT_LOCATION);
          const now = new Date();
          setSelectedDate(now);
          loadData(DEFAULT_LOCATION, now);
        },
        {
          enableHighAccuracy: true, // Force GPS hardware use
          timeout: 10000,           // Wait up to 10s for satellite lock
          maximumAge: 0             // Do not use cached position
        }
      );
    } else {
      setLocation(DEFAULT_LOCATION);
      const now = new Date();
      setSelectedDate(now);
      loadData(DEFAULT_LOCATION, now);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update next prayer marker every minute only if selected date is today
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
        setData(prev => prev ? markNextPrayer(prev, selectedDate) : null);
    }, 60000);
    return () => clearInterval(interval);
  }, [data, selectedDate]);

  return (
    <div className={`min-h-screen relative ${theme.appBg} transition-colors duration-500 flex items-center justify-center p-4 overflow-hidden`}>
      
      {/* Decorative Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-600 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-emerald-600 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Clock & Title */}
        <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in lg:sticky lg:top-8">
          <div className="text-center space-y-2 max-w-md mx-auto">
            <h1 className={`text-3xl md:text-4xl lg:text-5xl font-arabic font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme.id === 'subuh' ? 'from-emerald-600 to-amber-600' : 'from-amber-200 to-orange-500'} drop-shadow-md pb-2 leading-relaxed`}>
              المعهد الإسلامي السلفي رياضة الطلاب
            </h1>
            <p className={`text-sm md:text-base ${theme.id === 'subuh' ? 'text-emerald-700' : 'text-amber-400'} font-medium tracking-widest uppercase`}>
              Riyadlatut Thullab
            </p>
          </div>
          
          <div className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r from-emerald-600 to-emerald-900 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000`}></div>
            {data && <AnalogClock prayers={data.prayers} />}
          </div>

          <div className={`text-center text-xs ${theme.textMuted} space-y-1`}>
            <p>
              Lokasi Terdeteksi: 
              <span className={`${theme.textMain} font-medium text-sm block md:inline md:ml-1`}>
                {data?.city || 'Memuat wilayah...'}
              </span>
            </p>
            {data?.timezone && (
                <p className={`${theme.accent} opacity-80 font-mono text-[10px] tracking-wide`}>
                    Zona Waktu: {data.timezone}
                </p>
            )}
            {location && (
               <p className="font-mono text-[10px] opacity-60">
                 GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
               </p>
            )}
          </div>
        </div>

        {/* Right Column: Calendar & Schedule */}
        <div className="space-y-6">
            
          {/* Main Card */}
          <div className={`${theme.cardBg} backdrop-blur-xl border ${theme.cardBorder} rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-colors duration-500`}>
            {/* Subtle sheen on card */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

            {/* THEME SWITCHER CENTERED ABOVE CONTENT */}
            <div className="flex justify-center mb-4 pt-2 relative z-20">
              <div className={`flex items-center gap-3 p-1.5 rounded-full backdrop-blur-md border shadow-sm transition-colors duration-300 ${theme.id === 'subuh' ? 'bg-slate-100/50 border-slate-200/50' : 'bg-black/20 border-white/10'}`}>
                {[
                  { id: 'subuh', color: 'bg-sky-200', label: 'Subuh' },
                  { id: 'maghrib', color: 'bg-purple-500', label: 'Maghrib' },
                  { id: 'midnight', color: 'bg-slate-900', label: 'Midnight' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ThemeId)}
                    className={`w-6 h-6 rounded-full transition-all duration-300 border-2 ${t.color} ${
                      currentThemeId === t.id 
                        ? 'scale-110 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                        : 'opacity-50 hover:opacity-100 border-transparent scale-90'
                    }`}
                    title={`Tema ${t.label}`}
                    aria-label={`Ganti tema ke ${t.label}`}
                  />
                ))}
              </div>
            </div>

            {loading && !data ? (
               <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className={`w-12 h-12 border-4 ${theme.id === 'subuh' ? 'border-amber-600' : 'border-amber-500'} border-t-transparent rounded-full animate-spin`}></div>
                  <p className={`${theme.id === 'subuh' ? 'text-amber-700' : 'text-amber-400'} font-arabic animate-pulse`}>جاري التحميل...</p>
               </div>
            ) : data ? (
              <>
                <HijriCalendar hijri={data.hijri} gregorian={data.gregorianDate} />
                
                {/* Buttons: Calendar Only */}
                <div className="flex justify-center -mt-2 mb-4">
                  <button 
                    onClick={() => setIsCalendarOpen(true)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full ${theme.id === 'subuh' ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800/50 hover:bg-slate-700/50'} border ${theme.cardBorder} text-sm ${theme.accent} hover:opacity-80 transition-all duration-300 group shadow-lg`}
                  >
                    <span>📅</span>
                    <span className="font-medium">Buka Kalender</span>
                  </button>
                </div>
                
                <div className={`my-6 border-t ${theme.cardBorder}`}></div>
                
                <WeatherWidget weather={weather} loading={loadingWeather} />

                <PrayerSchedule 
                  prayers={data.prayers} 
                  onPrevDay={() => changeDay(-1)}
                  onNextDay={() => changeDay(1)}
                  isLoading={loading}
                />

                {data.quote && (
                  <div className={`mt-8 text-center ${theme.id === 'subuh' ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-950/30 border-emerald-900/50'} p-4 rounded-xl border`}>
                    <p className={`font-arabic text-lg ${theme.id === 'subuh' ? 'text-emerald-800' : 'text-emerald-200'} mb-2 leading-loose`}>
                      {data.quote.split('\n')[0]}
                    </p>
                    <p className={`text-xs ${theme.textMuted} italic`}>
                      {data.quote.split('\n').slice(1).join(' ')}
                    </p>
                  </div>
                )}
              </>
            ) : (
                <div className="text-center text-red-400">
                    <p>{error || "Terjadi kesalahan."}</p>
                    <button 
                        onClick={() => location && loadData(location, new Date())}
                        className={`mt-4 px-4 py-2 ${theme.id === 'subuh' ? 'bg-slate-200 hover:bg-slate-300' : 'bg-slate-800 hover:bg-slate-700'} rounded transition`}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}
            
          </div>
        </div>
      </div>
      
      {/* Modal Overlay Components */}
      <MonthlyCalendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
      
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;