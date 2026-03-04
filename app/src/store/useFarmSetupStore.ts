// Farm Setup and Crop Standards Store
// Manages zone configurations and crop standards from Gemini AI

import { create } from 'zustand';
import { ZoneSetup, CropStandards, FarmDecision } from '@/models/FarmSetup';
import { geminiService } from '@/services/GeminiService';
import { storageService } from '@/services/StorageService';
import { STORAGE_KEYS } from '@/utils/constants';

interface FarmSetupState {
  zones: ZoneSetup[];
  decisions: FarmDecision[];
  loading: boolean;
  error: string | null;

  // Actions
  addZone: (zone: Omit<ZoneSetup, 'cropStandards' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  fetchCropStandards: (zoneId: string, cropName: string) => Promise<void>;
  updateZone: (zoneId: string, updates: Partial<ZoneSetup>) => Promise<void>;
  deleteZone: (zoneId: string) => Promise<void>;
  getZone: (zoneId: string) => ZoneSetup | null;
  getCropStandards: (cropName: string) => CropStandards | null;
  setDecision: (decision: FarmDecision) => Promise<void>;
  getLatestDecision: (zoneId: string) => FarmDecision | null;
  loadFromStorage: () => Promise<void>;
  clearError: () => void;
}

export const useFarmSetupStore = create<FarmSetupState>((set, get) => ({
  zones: [],
  decisions: [],
  loading: false,
  error: null,

  addZone: async (zoneData) => {
    set({ loading: true, error: null });
    try {
      const newZone: ZoneSetup = {
        ...zoneData,
        cropStandards: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const zones = [...get().zones, newZone];
      set({ zones, loading: false });

      // Fetch crop standards from Gemini (only if not already cached)
      if (zoneData.cropName) {
        await get().fetchCropStandards(newZone.zoneId, zoneData.cropName);
      }

      // Save to storage
      await storageService.set(STORAGE_KEYS.FARM_SETUP, zones);
    } catch (error: any) {
      set({ error: error.message || 'Failed to add zone', loading: false });
    }
  },

  fetchCropStandards: async (zoneId: string, cropName: string) => {
    set({ loading: true, error: null });
    try {
      // Check if standards already exist for this crop
      const existingStandards = get().getCropStandards(cropName);
      if (existingStandards) {
        // Update zone with existing standards
        await get().updateZone(zoneId, { cropStandards: existingStandards });
        set({ loading: false });
        return;
      }

      // Call Gemini API to get crop standards
      const geminiResponse = await geminiService.getCropStandards(cropName);

      const cropStandards: CropStandards = {
        ...geminiResponse,
        cropName,
        timestamp: new Date(),
      };

      // Update zone with crop standards
      await get().updateZone(zoneId, { cropStandards });

      // Cache crop standards by crop name
      const cachedStandards = await storageService.get<Record<string, CropStandards>>(
        STORAGE_KEYS.CROP_STANDARDS
      ) || {};
      cachedStandards[cropName.toLowerCase()] = cropStandards;
      await storageService.set(STORAGE_KEYS.CROP_STANDARDS, cachedStandards);

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch crop standards', loading: false });
    }
  },

  updateZone: async (zoneId: string, updates: Partial<ZoneSetup>) => {
    try {
      const zones = get().zones.map(zone =>
        zone.zoneId === zoneId
          ? { ...zone, ...updates, updatedAt: new Date() }
          : zone
      );
      set({ zones });

      // Save to storage
      await storageService.set(STORAGE_KEYS.FARM_SETUP, zones);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update zone' });
    }
  },

  deleteZone: async (zoneId: string) => {
    try {
      const zones = get().zones.filter(zone => zone.zoneId !== zoneId);
      set({ zones });

      // Save to storage
      await storageService.set(STORAGE_KEYS.FARM_SETUP, zones);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete zone' });
    }
  },

  getZone: (zoneId: string) => {
    return get().zones.find(zone => zone.zoneId === zoneId) || null;
  },

  getCropStandards: (cropName: string) => {
    const zone = get().zones.find(z => 
      z.cropName.toLowerCase() === cropName.toLowerCase() && z.cropStandards
    );
    return zone?.cropStandards || null;
  },

  setDecision: async (decision: FarmDecision) => {
    try {
      const decisions = get().decisions.filter(d => d.zoneId !== decision.zoneId);
      decisions.push(decision);
      set({ decisions });

      // Save to storage
      await storageService.set(STORAGE_KEYS.FARM_DECISIONS, decisions);
    } catch (error: any) {
      console.error('Failed to save decision:', error);
    }
  },

  getLatestDecision: (zoneId: string) => {
    return get().decisions.find(d => d.zoneId === zoneId) || null;
  },

  loadFromStorage: async () => {
    try {
      const zones = await storageService.get<ZoneSetup[]>(STORAGE_KEYS.FARM_SETUP) || [];
      const decisions = await storageService.get<FarmDecision[]>(STORAGE_KEYS.FARM_DECISIONS) || [];
      set({ zones, decisions });
    } catch (error: any) {
      console.error('Failed to load from storage:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

