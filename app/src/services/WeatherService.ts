// src/services/WeatherService.ts

export interface DailyForecast {
  day: string;
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Storm';
}

export const WeatherService = {
  // Get 5-day forecast for the UI
  getForecast: (): DailyForecast[] => {
    return [
      { day: 'Today', temp: 29, condition: 'Sunny' },
      { day: 'Tom', temp: 28, condition: 'Cloudy' },
      { day: 'Fri', temp: 24, condition: 'Rainy' }, // <--- Rain is coming!
      { day: 'Sat', temp: 23, condition: 'Rainy' },
      { day: 'Sun', temp: 26, condition: 'Cloudy' },
    ];
  },

  // CRITICAL: This is the "Intelligence" input for our AI
  // We force this to 'true' so we can DEMO the "Smart Water Saving" feature.
  willRainSoon: (): boolean => {
    return true; 
  },

  getAlerts: (): string | null => {
    return "Heavy rainfall expected in 48 hours. Irrigation paused.";
  }
};