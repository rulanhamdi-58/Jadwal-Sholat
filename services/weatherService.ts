import { WeatherData } from '../types';

export const fetchWeatherData = async (lat: number, lng: number): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const data = await response.json();
    
    return {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      windSpeed: data.current.wind_speed_10m
    };
  } catch (error) {
    console.error("Weather Service Error:", error);
    throw error;
  }
};

export const getWeatherDescription = (code: number): string => {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return "Cerah";
  if (code === 1) return "Cerah Berawan";
  if (code === 2) return "Berawan";
  if (code === 3) return "Mendung";
  if (code >= 45 && code <= 48) return "Berkabut";
  if (code >= 51 && code <= 55) return "Gerimis";
  if (code >= 61 && code <= 65) return "Hujan";
  if (code >= 80 && code <= 82) return "Hujan Lebat";
  if (code >= 95) return "Badai Petir";
  return "Tidak Diketahui";
};

export const getWeatherIcon = (code: number, isDay: boolean): string => {
   if (code === 0) return isDay ? "☀️" : "🌙";
   if (code === 1) return isDay ? "🌤️" : "☁️";
   if (code === 2) return "⛅";
   if (code === 3) return "☁️";
   if (code >= 45 && code <= 48) return "🌫️";
   if (code >= 51 && code <= 67) return "🌧️";
   if (code >= 71 && code <= 77) return "❄️";
   if (code >= 80 && code <= 82) return "⛈️";
   if (code >= 95) return "⚡";
   return "🌡️";
};
