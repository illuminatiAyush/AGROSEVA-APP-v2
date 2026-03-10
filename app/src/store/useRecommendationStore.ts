// Zustand Store for AI Recommendations

import { create } from 'zustand';
import { ZoneDecision } from '@/models/Recommendations';
import { decisionEngine } from '@/ai/DecisionEngine';
import { useSoilStore } from './useSoilStore';
import { useWeatherStore } from './useWeatherStore';
import { storageService } from '@/services/StorageService';

interface RecommendationState {
  decisions: ZoneDecision[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  generateRecommendations: () => Promise<void>;
  getZoneDecision: (zoneId: string) => ZoneDecision | null;
  clearError: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  decisions: [],
  loading: false,
  error: null,
  lastUpdated: null,

  generateRecommendations: async () => {
    set({ loading: true, error: null });
    try {
      const soilZones = useSoilStore.getState().zones;
      const weather = useWeatherStore.getState().current;

      if (!weather) {
        throw new Error('Weather data not available');
      }

      const decisions: ZoneDecision[] = soilZones.map(zone => {
        return decisionEngine.generateZoneDecision(
          zone.zoneId,
          zone.zoneName,
          zone.soilData,
          weather
        );
      });

      set({ 
        decisions, 
        loading: false, 
        lastUpdated: new Date() 
      });

      // Cache recommendations
      await storageService.setRecommendations(decisions);
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to generate recommendations',
        loading: false 
      });
    }
  },

  getZoneDecision: (zoneId: string) => {
    return get().decisions.find(d => d.zoneId === zoneId) || null;
  },

  clearError: () => {
    set({ error: null });
  },
}));

