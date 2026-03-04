// Soil Monitoring Service
// Fetches LIVE data from Irrigation Brain backend - NO mocks

import { SoilData, ZoneSoilData } from '@/models/SoilData';
import { ZONES } from '@/utils/constants';
import { IRRIGATION_BRAIN_API } from '@/config/api';

class SoilService {
  /**
   * Fetch live sensor data from backend /status endpoint
   * Returns real moisture, pH, temperature from Arduino
   */
  private async fetchLiveSensorData(): Promise<{
    moisture: number | null;
    ph: number | null;
    temperature: number | null;
    timestamp: number | null;
  }> {
    try {
      const response = await fetch(IRRIGATION_BRAIN_API.STATUS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Backend returns: { moisture, ph, temperature, irrigation, explanation, timestamp }
      return {
        moisture: data.moisture ?? null,
        ph: data.ph ?? null,
        temperature: data.temperature ?? null,
        timestamp: data.timestamp ?? null,
      };
    } catch (error) {
      console.warn('[SoilService] Failed to fetch live sensor data:', error);
      // Return null values on error (graceful degradation)
      return {
        moisture: null,
        ph: null,
        temperature: null,
        timestamp: null,
      };
    }
  }

  /**
   * Convert live sensor data to SoilData format
   */
  private convertToSoilData(
    zoneId: string,
    sensorData: {
      moisture: number | null;
      ph: number | null;
      temperature: number | null;
      timestamp: number | null;
    }
  ): SoilData {
    const now = new Date();
    const timestamp = sensorData.timestamp 
      ? new Date(sensorData.timestamp * 1000) 
      : now;

    return {
      moisture: {
        value: sensorData.moisture ?? 0,
        zone: zoneId,
        timestamp,
      },
      pH: {
        value: sensorData.ph ?? 0,
        zone: zoneId,
        timestamp,
      },
      npk: {
        // NPK not available from backend - set to 0 or use defaults
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        zone: zoneId,
        timestamp,
      },
      zone: zoneId,
      timestamp,
    };
  }

  /**
   * Get soil data for all zones or a specific zone
   * Fetches LIVE data from backend
   */
  async getSoilData(zoneId?: string): Promise<ZoneSoilData[]> {
    try {
      // Fetch live sensor data from backend
      const sensorData = await this.fetchLiveSensorData();

      if (zoneId) {
        const zone = ZONES.find(z => z.id === zoneId);
        if (!zone) throw new Error(`Zone ${zoneId} not found`);

        return [{
          zoneId: zone.id,
          zoneName: zone.name,
          soilData: this.convertToSoilData(zone.id, sensorData),
          lastUpdated: new Date(),
        }];
      }

      // Return data for all zones (using same live data for all)
      return ZONES.map(zone => ({
        zoneId: zone.id,
        zoneName: zone.name,
        soilData: this.convertToSoilData(zone.id, sensorData),
        lastUpdated: new Date(),
      }));
    } catch (error) {
      console.error('[SoilService] Error fetching soil data:', error);
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  /**
   * Get latest soil data for a specific zone
   * Fetches LIVE data from backend
   */
  async getLatestSoilData(zoneId: string): Promise<SoilData> {
    try {
      const sensorData = await this.fetchLiveSensorData();
      return this.convertToSoilData(zoneId, sensorData);
    } catch (error) {
      console.error('[SoilService] Error fetching latest soil data:', error);
      // Return empty data on error (graceful degradation)
      const now = new Date();
      return {
        moisture: { value: 0, zone: zoneId, timestamp: now },
        pH: { value: 0, zone: zoneId, timestamp: now },
        npk: { nitrogen: 0, phosphorus: 0, potassium: 0, zone: zoneId, timestamp: now },
        zone: zoneId,
        timestamp: now,
      };
    }
  }
}

export const soilService = new SoilService();

