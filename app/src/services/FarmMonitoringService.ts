// Farm Monitoring Service
// Compares real-time sensor data with crop standards every 3 seconds

import { useFarmSetupStore } from '@/store/useFarmSetupStore';
import { useStore } from '@/store/useStore';
import { useSoilStore } from '@/store/useSoilStore';
import { farmDecisionService } from './FarmDecisionService';
import { xaiEngine } from '@/ai/XAIEngine';
import { FarmDecision } from '@/models/FarmSetup';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';

class FarmMonitoringService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start monitoring - compares sensor data with standards every 3 seconds
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Run immediately
    this.checkAndUpdate();

    // Then run every 3 seconds
    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, 3000);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Check all zones and update decisions
   */
  private async checkAndUpdate() {
    const farmStore = useFarmSetupStore.getState();
    const mainStore = useStore.getState();
    const soilStore = useSoilStore.getState();

    // Get all configured zones
    const zones = farmStore.zones.filter(zone => zone.cropStandards !== null);

    if (zones.length === 0) {
      // No zones configured yet
      return;
    }

    // Get current sensor data
    const soilData: SoilData = {
      moisture: {
        value: mainStore.soilData.moisture,
        zone: 'current',
        timestamp: new Date(),
      },
      pH: {
        value: mainStore.soilData.ph,
        zone: 'current',
        timestamp: new Date(),
      },
      npk: {
        nitrogen: mainStore.soilData.nitrogen,
        phosphorus: mainStore.soilData.phosphorus,
        potassium: mainStore.soilData.potassium,
        zone: 'current',
        timestamp: new Date(),
      },
      zone: 'current',
      timestamp: new Date(),
    };

    // Get weather data
    const weatherData: WeatherData = {
      temperature: mainStore.weather.temp,
      humidity: mainStore.weather.humidity,
      rainfall: 0, // Can be enhanced with actual forecast
      windSpeed: 0,
      timestamp: new Date(),
    };

    // Process each zone
    for (const zone of zones) {
      if (!zone.cropStandards) continue;

      try {
        // Generate decision
        const decision = farmDecisionService.generateDecision({
          zoneSetup: zone,
          soilData,
          weatherData,
          cropStandards: zone.cropStandards,
        });

        // Generate XAI explanations
        const explanations = xaiEngine.explainFarmDecision(
          decision,
          zone,
          zone.cropStandards,
          soilData,
          weatherData
        );

        // Attach explanations to decision
        const finalDecision: FarmDecision = {
          ...decision,
          explanation: explanations,
        };

        // Store decision
        await farmStore.setDecision(finalDecision);
      } catch (error) {
        console.error(`Error processing zone ${zone.zoneId}:`, error);
      }
    }
  }
}

export const farmMonitoringService = new FarmMonitoringService();

