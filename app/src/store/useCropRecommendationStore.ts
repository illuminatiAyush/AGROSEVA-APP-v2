// Crop Recommendation Store
// Manages crop recommendation state and generation

import { create } from 'zustand';
import { recommendCrop, SensorInput, CropRecommendation } from '@/ai/CropRecommendationEngine';
import { useStore } from './useStore';
import { useSensorStore } from './useSensorStore';

interface CropRecommendationState {
  recommendation: CropRecommendation | null;
  isLoading: boolean;
  error: string | null;
  generateRecommendation: () => void;
}

export const useCropRecommendationStore = create<CropRecommendationState>((set) => ({
  recommendation: null,
  isLoading: false,
  error: null,

  generateRecommendation: () => {
    set({ isLoading: true, error: null });
    
    try {
      // Get current sensor data from stores
      const sensorStore = useSensorStore.getState();
      const appStore = useStore.getState();
      
      // Prepare sensor input
      const input: SensorInput = {
        soilMoisture: appStore.soilData.moisture,
        pH: sensorStore.pH ?? appStore.soilData.ph,
        temperature: sensorStore.temperature ?? (typeof appStore.weather.temp === 'number' ? appStore.weather.temp : 25),
        humidity: sensorStore.humidity ?? appStore.weather.humidity,
        nitrogen: appStore.soilData.nitrogen,
        phosphorus: appStore.soilData.phosphorus,
        potassium: appStore.soilData.potassium,
      };
      
      // Generate recommendation
      const recommendation = recommendCrop(input);
      
      set({
        recommendation,
        isLoading: false,
        error: recommendation ? null : 'No suitable crops found for current season',
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to generate crop recommendation',
        recommendation: null,
      });
    }
  },
}));



