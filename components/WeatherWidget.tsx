import React from 'react';
import { WeatherData } from '../types';
import { getWeatherDescription, getWeatherIcon } from '../services/weatherService';
import { useTheme } from '../contexts/ThemeContext';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, loading }) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className={`animate-pulse flex items-center justify-center gap-3 p-4 ${theme.id === 'subuh' ? 'bg-slate-200' : 'bg-slate-800/30'} rounded-xl mb-6`}>
        <div className={`w-8 h-8 ${theme.id === 'subuh' ? 'bg-slate-300' : 'bg-slate-700'} rounded-full`}></div>
        <div className={`h-4 w-24 ${theme.id === 'subuh' ? 'bg-slate-300' : 'bg-slate-700'} rounded`}></div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className={`flex items-center justify-between ${theme.id === 'subuh' ? 'bg-gradient-to-r from-white/50 to-sky-100/50' : 'bg-gradient-to-r from-slate-800/50 to-emerald-900/20'} backdrop-blur-md border ${theme.cardBorder} p-4 rounded-xl mb-6 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className="text-4xl filter drop-shadow-md animate-bounce-slow">
            {getWeatherIcon(weather.weatherCode, weather.isDay)}
        </div>
        <div>
          <div className={`${theme.textMain} font-medium text-lg`}>
            {getWeatherDescription(weather.weatherCode)}
          </div>
          <div className={`${theme.textMuted} text-xs flex items-center gap-1`}>
             <span className="opacity-70">Angin:</span> {weather.windSpeed} km/h
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className={`text-3xl font-bold text-transparent bg-clip-text ${theme.id === 'subuh' ? 'bg-gradient-to-b from-slate-600 to-slate-900' : 'bg-gradient-to-b from-slate-100 to-slate-400'} font-mono`}>
          {Math.round(weather.temperature)}°C
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;