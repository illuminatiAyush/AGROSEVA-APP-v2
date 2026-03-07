import { create } from 'zustand';
import { SensorService } from '@/services/SensorService';

interface SensorState {
  temperature: number | null;
  humidity: number | null;
  pH: number | null;

  fetchSensors: () => Promise<void>;
  startPolling: () => () => void;
}

export const useSensorStore = create<SensorState>((set, get) => {
  let interval: ReturnType<typeof setInterval>;

  return {
    temperature: null,
    humidity: null,
    pH: null,

    fetchSensors: async () => {
      try {
        const data = await SensorService.fetchLiveSensors();

        console.log("📡 Updating Store:", data);

        set({
          temperature: data.temperature ?? null,
          humidity: data.humidity ?? null,
          pH: data.pH ?? null,
        });

      } catch (error) {
        console.log("Sensor fetch error:", error);
      }
    },

    startPolling: () => {
      get().fetchSensors();

      interval = setInterval(() => {
        get().fetchSensors();
      }, 2000);

      return () => clearInterval(interval);
    }
  };
});
