// src/store/useStore.ts
import { create } from 'zustand';

// Define the Forecast Type locally
export type DailyForecast = { day: string; temp: number; condition: string };

interface AppState {
  // User Settings
  language: 'en' | 'hi' | 'mr';
  setLanguage: (lang: 'en' | 'hi' | 'mr') => void;

  // Soil Data
  soilData: {
    moisture: number;
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  updateSoilData: (data: Partial<AppState['soilData']>) => void;

  // Weather Data
  weather: {
    temp: number;
    condition: string;
    humidity: number;
    forecast: DailyForecast[]; // <--- Defined as Array
    alert: string | null;      // <--- Defined as String or Null
  };
  setWeather: (data: Partial<AppState['weather']>) => void;
}

export const useStore = create<AppState>((set) => ({
  // 1. Defaults
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  // 2. Initial Sensor Values (NPK only - moisture and pH come from real sensors)
  // Note: moisture and pH should be fetched from useMoistureStore and usePHStore
  soilData: {
    moisture: 0, // Deprecated - use useMoistureStore instead
    ph: 0, // Deprecated - use usePHStore instead
    nitrogen: 140, // NPK data (can be static for now, or from backend if available)
    phosphorus: 45,
    potassium: 180,
  },
  updateSoilData: (newData) =>
    set((state) => ({
      soilData: { ...state.soilData, ...newData },
    })),

  // 3. Initial Weather
  weather: {
    temp: 29,
    condition: 'Sunny',
    humidity: 52,
    forecast: [], // <--- FIXED: Now an empty array, not a string
    alert: null,  // <--- FIXED: Initialized as null
  },
  setWeather: (newWeather) =>
    set((state) => ({
      weather: { ...state.weather, ...newWeather },
    })),
}));