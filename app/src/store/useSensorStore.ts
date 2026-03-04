import { create } from 'zustand';
import { SensorService } from '@/services/SensorService';

interface SensorState {
  temperature: number | null;
  humidity: number | null;
  pH: number | null;
  fetchSensors: () => Promise<void>;
}

export const useSensorStore = create<SensorState>((set) => ({
  temperature: null,
  humidity: null,
  pH: null,

  fetchSensors: async () => {
    const data = await SensorService.fetchLiveSensors();
    set({
      temperature: data.temperature,
      humidity: data.humidity,
      pH: data.pH,
    });
  },
}));
