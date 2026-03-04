import { SensorData } from '@/models/SensorData';
import { hardwareClient } from '@/hardware/HardwareConfig';
import { HttpEnvironmentClient } from '@/hardware/HttpEnvironmentClient';
import { hardwareConfig } from '@/hardware/HardwareConfig';

const environmentClient = new HttpEnvironmentClient(hardwareConfig.esp32Address || 'http://localhost:3000');

export class SensorService {
  static async fetchLiveSensors(): Promise<SensorData> {
    // Fetch pH from existing pH client (unchanged)
    const phData = await hardwareClient.getPH();
    
    // Fetch temperature and humidity from environment client
    try {
      const envData = await environmentClient.getEnvironment();
      return {
        pH: phData.pH,
        temperature: envData.temperature,
        humidity: envData.humidity,
        timestamp: phData.timestamp,
      };
    } catch (error) {
      // Fallback to defaults if environment sensor is unavailable
      return {
        pH: phData.pH,
        temperature: 25,
        humidity: 60,
        timestamp: phData.timestamp,
      };
    }
  }
}
