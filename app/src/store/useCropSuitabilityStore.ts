// Crop Suitability Store
// Manages crop selection and suitability analysis state using weather intelligence

import { create } from 'zustand';
import { Season } from '@/data/cropStandards';
import { calculateCropSuitability, SensorInput, WeatherInput, CropSuitabilityResult } from '@/ai/CropSuitabilityEngine';
import { getWeatherTrend, getLastUsedCity, WeatherTrend } from '@/services/WeatherTrendService';
import { useStore } from './useStore';
import { useSensorStore } from './useSensorStore';

interface CropSuitabilityState {
  cityInput: string;
  selectedSeason: Season | null;
  weatherTrend: WeatherTrend | null;
  cropResults: CropSuitabilityResult[];
  isLoading: boolean;
  error: string | null;
  cityError: string | null;
  setCity: (city: string) => void;
  setSeason: (season: Season) => void;
  loadLastCity: () => Promise<void>;
  generateCropSuitability: () => Promise<void>;
}

export const useCropSuitabilityStore = create<CropSuitabilityState>((set) => ({
  cityInput: '',
  selectedSeason: null,
  weatherTrend: null,
  cropResults: [],
  isLoading: false,
  error: null,
  cityError: null,

  setCity: (city: string) => {
    set({ cityInput: city, cityError: null });
  },

  setSeason: (season: Season) => {
    set({ selectedSeason: season });
  },

  loadLastCity: async () => {
    try {
      const lastCity = await getLastUsedCity();
      if (lastCity) {
        set({ cityInput: lastCity });
      }
    } catch (error) {
      // Ignore errors
    }
  },

  generateCropSuitability: async () => {
    const state = useCropSuitabilityStore.getState();
    
    // Validate city input
    if (!state.cityInput || state.cityInput.trim() === '') {
      set({ cityError: 'Please enter your city name' });
      return;
    }
    
    if (!state.selectedSeason) {
      set({ error: 'Please select season', cityError: null });
      return;
    }
    
    set({ isLoading: true, error: null, cityError: null });
    
    try {
      // Fetch weather trend for user-entered city
      const weatherTrend = await getWeatherTrend(state.cityInput.trim());
      
      // Get current sensor data from stores
      const sensorStore = useSensorStore.getState();
      const appStore = useStore.getState();
      
      // Prepare sensor input (no temperature/humidity from sensors, use weather trend)
      const sensorInput: SensorInput = {
        soilMoisture: appStore.soilData.moisture,
        pH: sensorStore.pH ?? appStore.soilData.ph,
        nitrogen: appStore.soilData.nitrogen,
        phosphorus: appStore.soilData.phosphorus,
        potassium: appStore.soilData.potassium,
      };
      
      // Prepare weather input
      const weatherInput: WeatherInput = {
        avgTemp: weatherTrend.avgTemp,
        avgHumidity: weatherTrend.avgHumidity,
        rainfallTrend: weatherTrend.rainfallTrend,
      };
      
      // Calculate suitability
      const results = calculateCropSuitability(
        state.selectedSeason,
        weatherInput,
        sensorInput
      );
      
      set({
        weatherTrend,
        cropResults: results,
        isLoading: false,
        error: results.length === 0 ? 'No suitable crops found for selected season' : null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to generate crop suitability',
        cropResults: [],
        weatherTrend: null,
      });
    }
  },
}));

