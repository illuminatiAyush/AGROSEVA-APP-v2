// Farm Decision Service
// Priority-based decision engine that considers all parameters together

import { ZoneSetup, CropStandards, FarmDecision } from '@/models/FarmSetup';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';
import { irrigationCalculator } from './IrrigationCalculator';
import { WeatherService } from './WeatherService';

interface DecisionContext {
  zoneSetup: ZoneSetup;
  soilData: SoilData;
  weatherData: WeatherData;
  cropStandards: CropStandards;
}

class FarmDecisionService {
  /**
   * Generate farm decision using priority-based logic
   * Priority order:
   * 1. Soil moisture & water stress
   * 2. Rain forecast
   * 3. Soil pH
   * 4. NPK nutrients
   * 5. Temperature (affects quantity, not action)
   */
  generateDecision(context: DecisionContext): FarmDecision {
    const { zoneSetup, soilData, weatherData, cropStandards } = context;
    const { moisture, pH, npk } = soilData;
    const { temperature } = weatherData;

    // Check rain forecast
    const rainExpected = WeatherService.willRainSoon();

    // Priority 1: Soil Moisture & Water Stress
    const moistureStatus = this.checkMoistureStatus(
      moisture.value,
      cropStandards.optimalMoistureMin,
      cropStandards.optimalMoistureMax
    );

    // Priority 2: Rain Forecast (can override irrigation)
    const shouldWaitForRain = rainExpected && moistureStatus !== 'critical';

    // Priority 3: Soil pH
    const pHStatus = this.checkPHStatus(pH.value, cropStandards.idealPHMin, cropStandards.idealPHMax);

    // Priority 4: NPK Nutrients
    const npkStatus = this.checkNPKStatus(npk, cropStandards.npkRequirements);

    // Decision Logic (Priority-based)
    let action: 'IRRIGATE' | 'FERTILIZE' | 'SOIL_CORRECTION' | 'WAIT';
    let confidence = 0;
    let irrigationQuantity: FarmDecision['irrigationQuantity'] | undefined;
    let fertilizerQuantity: FarmDecision['fertilizerQuantity'] | undefined;

    // Priority 1: Critical moisture - IRRIGATE (unless rain coming)
    if (moistureStatus === 'critical' && !shouldWaitForRain) {
      action = 'IRRIGATE';
      confidence = 95;

      // Calculate irrigation quantity
      const irrigation = irrigationCalculator.calculate({
        soilData,
        weatherData,
        cropStandards,
        soilType: zoneSetup.soilType,
        farmArea: zoneSetup.farmArea,
        rainExpected,
      });

      irrigationQuantity = {
        mm: irrigation.mm,
        litersPerAcre: irrigation.litersPerAcre,
        totalLiters: irrigation.totalLiters,
      };
    }
    // Priority 1: Low moisture but rain coming - WAIT
    else if (moistureStatus === 'low' && shouldWaitForRain) {
      action = 'WAIT';
      confidence = 90;
    }
    // Priority 1: Low moisture, no rain - IRRIGATE
    else if (moistureStatus === 'low' && !shouldWaitForRain) {
      action = 'IRRIGATE';
      confidence = 85;

      const irrigation = irrigationCalculator.calculate({
        soilData,
        weatherData,
        cropStandards,
        soilType: zoneSetup.soilType,
        farmArea: zoneSetup.farmArea,
        rainExpected,
      });

      irrigationQuantity = {
        mm: irrigation.mm,
        litersPerAcre: irrigation.litersPerAcre,
        totalLiters: irrigation.totalLiters,
      };
    }
    // Priority 3: pH out of range - SOIL_CORRECTION
    else if (pHStatus === 'out_of_range') {
      action = 'SOIL_CORRECTION';
      confidence = 80;
    }
    // Priority 4: NPK deficiency - FERTILIZE
    else if (npkStatus === 'deficient') {
      action = 'FERTILIZE';
      confidence = 85;

      // Determine which nutrient is most deficient
      const deficiencies = {
        nitrogen: cropStandards.npkRequirements.nitrogen - npk.nitrogen,
        phosphorus: cropStandards.npkRequirements.phosphorus - npk.phosphorus,
        potassium: cropStandards.npkRequirements.potassium - npk.potassium,
      };

      const maxDeficiency = Math.max(
        deficiencies.nitrogen,
        deficiencies.phosphorus,
        deficiencies.potassium
      );

      let fertilizerType: 'nitrogen' | 'phosphorus' | 'potassium' | 'balanced' = 'balanced';
      if (deficiencies.nitrogen === maxDeficiency && maxDeficiency > 0) {
        fertilizerType = 'nitrogen';
      } else if (deficiencies.phosphorus === maxDeficiency && maxDeficiency > 0) {
        fertilizerType = 'phosphorus';
      } else if (deficiencies.potassium === maxDeficiency && maxDeficiency > 0) {
        fertilizerType = 'potassium';
      }

      fertilizerQuantity = {
        type: fertilizerType,
        amount: Math.max(0, Math.round(maxDeficiency * 0.5)), // kg/acre
      };
    }
    // All parameters optimal - WAIT
    else {
      action = 'WAIT';
      confidence = 90;
    }

    return {
      zoneId: zoneSetup.zoneId,
      zoneName: zoneSetup.zoneName,
      action,
      confidence,
      irrigationQuantity,
      fertilizerQuantity,
      explanation: [], // Will be filled by XAIEngine
      timestamp: new Date(),
    };
  }

  private checkMoistureStatus(
    current: number,
    optimalMin: number,
    optimalMax: number
  ): 'critical' | 'low' | 'optimal' | 'high' {
    if (current < optimalMin * 0.7) return 'critical';
    if (current < optimalMin) return 'low';
    if (current > optimalMax) return 'high';
    return 'optimal';
  }

  private checkPHStatus(current: number, idealMin: number, idealMax: number): 'optimal' | 'out_of_range' {
    if (current >= idealMin && current <= idealMax) return 'optimal';
    return 'out_of_range';
  }

  private checkNPKStatus(
    current: { nitrogen: number; phosphorus: number; potassium: number },
    required: { nitrogen: number; phosphorus: number; potassium: number }
  ): 'optimal' | 'deficient' {
    const threshold = 0.8; // 80% of required is considered sufficient
    if (
      current.nitrogen >= required.nitrogen * threshold &&
      current.phosphorus >= required.phosphorus * threshold &&
      current.potassium >= required.potassium * threshold
    ) {
      return 'optimal';
    }
    return 'deficient';
  }
}

export const farmDecisionService = new FarmDecisionService();

