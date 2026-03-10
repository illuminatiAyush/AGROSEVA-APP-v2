import { create } from "zustand";

export interface SensorData {
  moisture: number;
  ph: number;
  npk: number;
  temperature: number;
  humidity: number;
}

export interface Recommendation {
  irrigation: number;
  fertilizer: string;
  confidence: number;
  reason: string;
}

interface FarmState {
  zone: string;
  sensorData: SensorData | null;
  recommendation: Recommendation | null;

  setZone: (zone: string) => void;
  setSensorData: (data: SensorData) => void;
  setRecommendation: (rec: Recommendation) => void;
}

export const useFarmStore = create<FarmState>((set) => ({
  zone: "Zone A",
  sensorData: null,
  recommendation: null,

  setZone: (zone) => set({ zone }),
  setSensorData: (data) => set({ sensorData: data }),
  setRecommendation: (rec) => set({ recommendation: rec }),
}));
