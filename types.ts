export interface PrayerTime {
  name: string;
  nameArabic: string;
  time: string; // HH:mm format (24h)
  isNext?: boolean;
}

export interface HijriDateInfo {
  day: number;
  month: string; // Arabic name
  year: number;
  dayNameArabic: string;
  fullString: string;
}

export interface DailyData {
  gregorianDate: string;
  hijri: HijriDateInfo;
  prayers: PrayerTime[];
  city: string;
  timezone?: string; // Added timezone field
  quote?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
}