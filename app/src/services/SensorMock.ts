// src/services/SensorMock.ts
import { useStore } from '@/store/useStore';

let intervalId: NodeJS.Timeout | null = null;

// Helper to get random number between min/max
const randomRange = (min: number, max: number) => 
  Math.random() * (max - min) + min;

export const SensorMock = {
  start: () => {
    if (intervalId) return;

    // Update every 3 seconds
    intervalId = setInterval(() => {
      const { soilData, weather, updateSoilData, setWeather } = useStore.getState();

      // 1. Simulate Moisture Fluctuation (Dry out slowly, then rain)
      // Small random drift +/- 2%
      let newMoisture = soilData.moisture + randomRange(-2, 1.5);
      // Clamp between 0 and 100
      newMoisture = Math.max(10, Math.min(90, newMoisture));

      // 2. Simulate Temperature (Day/Night cycle drift)
      let newTemp = weather.temp + randomRange(-0.5, 0.5);

      // 3. Update the Store (Triggers UI update)
      updateSoilData({ 
        moisture: parseFloat(newMoisture.toFixed(1)),
        ph: parseFloat((soilData.ph + randomRange(-0.1, 0.1)).toFixed(1))
      });

      setWeather({
        temp: parseFloat(newTemp.toFixed(1))
      });

    }, 3000); // 3 seconds
  },

  stop: () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};