import { DailyData } from './types';

export const DEFAULT_LOCATION = {
  lat: -6.2088, // Jakarta
  lng: 106.8456
};

// Fallback data if API fails or loading
export const FALLBACK_DATA: DailyData = {
  // Latin format estimation for 13 Rajab 1447 (Approx Jan 2, 2026)
  gregorianDate: "Jumat, 2 Januari 2026", 
  hijri: {
    day: 13,
    month: "Rajab",
    year: 1447,
    dayNameArabic: "الجمعة", // Arabic for Friday
    fullString: "١٣ رجب ١٤٤٧" // 13 Rajab 1447
  },
  prayers: [
    { name: "Fajr", nameArabic: "الفجر", time: "04:15" },
    { name: "Shuruq", nameArabic: "الشروق", time: "05:35" },
    { name: "Duha", nameArabic: "الضحى", time: "06:00" },
    { name: "Dhuhr", nameArabic: "الظهر", time: "11:55" },
    { name: "Asr", nameArabic: "العصر", time: "15:20" },
    { name: "Maghrib", nameArabic: "المغرب", time: "18:05" },
    { name: "Isha", nameArabic: "العشاء", time: "19:20" },
    { name: "Midnight", nameArabic: "نصف الليل", time: "23:45" },
    { name: "LastThird", nameArabic: "الثلث الأخير", time: "01:15" }
  ],
  city: "Jakarta (Default)",
  quote: "Memuat data terkini..."
};

export const PRAYER_NAMES_ID = {
  Fajr: "Subuh",
  Shuruq: "Terbit",
  Duha: "Dhuha",
  Dhuhr: "Dhuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya",
  Midnight: "Tengah Malam",
  LastThird: "1/3 Malam Terakhir"
};