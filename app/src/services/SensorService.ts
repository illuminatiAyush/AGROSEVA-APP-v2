import { SensorData } from '@/models/SensorData';

const API_URL = 'http://192.168.0.100:8000/sensor';

export class SensorService {
  static async fetchLiveSensors(): Promise<SensorData> {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();

      console.log("🌡 SENSOR API RESPONSE:", data); // ⭐ ADD THIS

      return {
        pH: typeof data.pH === 'number' ? data.pH : 0,
        temperature: typeof data.temperature === 'number' ? data.temperature : 25,
        humidity: typeof data.humidity === 'number' ? data.humidity : 60,
        timestamp: data.timestamp ?? Date.now(),
      };

    } catch (error) {
      console.log('Sensor fetch error:', error);

      return {
        pH: 0,
        temperature: 25,
        humidity: 60,
        timestamp: Date.now(),
      };
    }
  }
}