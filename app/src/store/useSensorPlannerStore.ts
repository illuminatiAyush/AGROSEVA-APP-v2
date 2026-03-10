/**
 * Sensor Planner Store
 * Zustand store for managing sensor planner state per zone.
 * Stores drag & drop state, inputs, and calculations.
 */

import { create } from 'zustand';
import { CropType, SensorType, ZoneVerdict, calculateZoneVerdictComplete } from '@/ai/SensorPlanningEngine';
import { storageService } from '@/services/StorageService';
import { STORAGE_KEYS } from '@/utils/constants';

export interface InstalledSensor {
  id: string;
  type: SensorType;
  position: { x: number; y: number };
}

export interface ZonePlannerState {
  zoneId: string;
  cropType: CropType | null;
  areaInAcres: number;
  zoneName: string;
  installedSensors: InstalledSensor[];
  verdict: ZoneVerdict | null;
  lastUpdated: Date;
}

interface SensorPlannerState {
  // State per zone
  zones: Record<string, ZonePlannerState>;

  // Current active zone
  activeZoneId: string | null;

  // Actions
  initializeZone: (zoneId: string, zoneName: string) => void;
  setCropType: (zoneId: string, cropType: CropType) => void;
  setArea: (zoneId: string, areaInAcres: number) => void;
  setZoneName: (zoneId: string, zoneName: string) => void;
  addSensor: (zoneId: string, sensorType: SensorType, position: { x: number; y: number }) => void;
  removeSensor: (zoneId: string, sensorId: string) => void;
  updateSensorPosition: (zoneId: string, sensorId: string, position: { x: number; y: number }) => void;
  clearZone: (zoneId: string) => void;
  setActiveZone: (zoneId: string | null) => void;
  getZoneState: (zoneId: string) => ZonePlannerState | null;
  recalculateVerdict: (zoneId: string) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useSensorPlannerStore = create<SensorPlannerState>((set, get) => ({
  zones: {},
  activeZoneId: null,

  initializeZone: (zoneId: string, zoneName: string) => {
    const state = get();
    if (!state.zones[zoneId]) {
      set({
        zones: {
          ...state.zones,
          [zoneId]: {
            zoneId,
            cropType: null,
            areaInAcres: 0,
            zoneName,
            installedSensors: [],
            verdict: null,
            lastUpdated: new Date(),
          },
        },
      });
    }
  },

  setCropType: (zoneId: string, cropType: CropType) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      zone.cropType = cropType;
      zone.lastUpdated = new Date();
      state.recalculateVerdict(zoneId);
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  setArea: (zoneId: string, areaInAcres: number) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      zone.areaInAcres = areaInAcres;
      zone.lastUpdated = new Date();
      state.recalculateVerdict(zoneId);
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  setZoneName: (zoneId: string, zoneName: string) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      zone.zoneName = zoneName;
      zone.lastUpdated = new Date();
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  addSensor: (zoneId: string, sensorType: SensorType, position: { x: number; y: number }) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      const newSensor: InstalledSensor = {
        id: `${sensorType}-${Date.now()}-${Math.random()}`,
        type: sensorType,
        position,
      };
      zone.installedSensors.push(newSensor);
      zone.lastUpdated = new Date();
      state.recalculateVerdict(zoneId);
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  removeSensor: (zoneId: string, sensorId: string) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      zone.installedSensors = zone.installedSensors.filter(s => s.id !== sensorId);
      zone.lastUpdated = new Date();
      state.recalculateVerdict(zoneId);
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  updateSensorPosition: (zoneId: string, sensorId: string, position: { x: number; y: number }) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      const sensor = zone.installedSensors.find(s => s.id === sensorId);
      if (sensor) {
        sensor.position = position;
        zone.lastUpdated = new Date();
        set({ zones: { ...state.zones, [zoneId]: zone } });
        state.saveToStorage();
      }
    }
  },

  clearZone: (zoneId: string) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (zone) {
      zone.installedSensors = [];
      zone.lastUpdated = new Date();
      state.recalculateVerdict(zoneId);
      set({ zones: { ...state.zones, [zoneId]: zone } });
      state.saveToStorage();
    }
  },

  setActiveZone: (zoneId: string | null) => {
    set({ activeZoneId: zoneId });
  },

  getZoneState: (zoneId: string) => {
    return get().zones[zoneId] || null;
  },

  recalculateVerdict: (zoneId: string) => {
    const state = get();
    const zone = state.zones[zoneId];
    if (!zone || !zone.cropType || zone.areaInAcres <= 0) {
      zone.verdict = null;
      return;
    }

    // Count installed sensors by type
    const installedSensors: Record<SensorType, number> = {
      Soil: 0,
      pH: 0,
      NPK: 0,
      Moisture: 0,
      Temperature: 0,
      Arduino: 0,
      ESP32: 0,
    };

    zone.installedSensors.forEach(sensor => {
      installedSensors[sensor.type]++;
    });

    // Calculate verdict
    zone.verdict = calculateZoneVerdictComplete(
      zone.cropType,
      zone.areaInAcres,
      installedSensors,
      1 // zoneCount
    );
  },

  loadFromStorage: async () => {
    try {
      const stored = await storageService.get<Record<string, ZonePlannerState>>(
        STORAGE_KEYS.SENSOR_PLANNER
      );
      if (stored) {
        // Convert date strings back to Date objects
        const zones: Record<string, ZonePlannerState> = {};
        Object.keys(stored).forEach(zoneId => {
          const zone = stored[zoneId];
          zones[zoneId] = {
            ...zone,
            lastUpdated: new Date(zone.lastUpdated),
          };
        });
        set({ zones });
      }
    } catch (error) {
      console.error('Failed to load sensor planner from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      await storageService.set(
        STORAGE_KEYS.SENSOR_PLANNER,
        get().zones
      );
    } catch (error) {
      console.error('Failed to save sensor planner to storage:', error);
    }
  },
}));

