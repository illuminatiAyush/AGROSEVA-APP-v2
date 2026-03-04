// Zustand Store for Soil Data

import { create } from 'zustand';
import { ZoneSoilData } from '@/models/SoilData';
import { soilService } from '@/services/SoilService';
import { storageService } from '@/services/StorageService';

interface SoilState {
  zones: ZoneSoilData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  fetchSoilData: (zoneId?: string) => Promise<void>;
  refreshSoilData: () => Promise<void>;
  clearError: () => void;
}

export const useSoilStore = create<SoilState>((set, get) => ({
  zones: [],
  loading: false,
  error: null,
  lastUpdated: null,

  fetchSoilData: async (zoneId?: string) => {
    set({ loading: true, error: null });
    try {
      // Try to load from cache first
      const cached = await storageService.getSoilData();
      if (cached) {
        set({ zones: cached, loading: false });
      }

      // Fetch fresh data
      const data = await soilService.getSoilData(zoneId);
      set({ 
        zones: data, 
        loading: false, 
        lastUpdated: new Date() 
      });

      // Cache the data
      await storageService.setSoilData(data);
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch soil data',
        loading: false 
      });
    }
  },

  refreshSoilData: async () => {
    await get().fetchSoilData();
  },

  clearError: () => {
    set({ error: null });
  },
}));

