// AI-Based Decision Engine

import { IrrigationRecommendation, FertilizerRecommendation, ZoneDecision } from '@/models/Recommendations';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';
import { THRESHOLDS } from '@/utils/constants';

class DecisionEngine {
  // Generate irrigation recommendation based on soil and weather data
  generateIrrigationRecommendation(
    zone: string,
    soilData: SoilData,
    weatherData: WeatherData
  ): IrrigationRecommendation {
    const { moisture } = soilData;
    const { temperature, humidity, rainfall } = weatherData;

    let action: 'irrigate' | 'skip' | 'reduce' = 'skip';
    let amount = 0;
    let duration = 0;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
    let reasoning = '';
    let confidence = 80;

    // Decision logic
    if (moisture.value < THRESHOLDS.SOIL_MOISTURE.LOW) {
      action = 'irrigate';
      amount = (THRESHOLDS.SOIL_MOISTURE.OPTIMAL_MIN - moisture.value) * 10; // Liters
      duration = Math.ceil(amount / 5); // Minutes (5L per minute)
      priority = moisture.value < 20 ? 'urgent' : 'high';
      reasoning = `Soil moisture is critically low (${moisture.value.toFixed(1)}%). Immediate irrigation needed to prevent crop stress.`;
      confidence = 95;
    } else if (moisture.value < THRESHOLDS.SOIL_MOISTURE.OPTIMAL_MIN) {
      action = 'irrigate';
      amount = (THRESHOLDS.SOIL_MOISTURE.OPTIMAL_MIN - moisture.value) * 8;
      duration = Math.ceil(amount / 5);
      priority = 'medium';
      reasoning = `Soil moisture is below optimal range. Recommended irrigation to maintain healthy crop growth.`;
      confidence = 85;
    } else if (moisture.value > THRESHOLDS.SOIL_MOISTURE.HIGH) {
      action = 'skip';
      reasoning = `Soil moisture is adequate (${moisture.value.toFixed(1)}%). No irrigation needed.`;
      confidence = 90;
    } else {
      action = 'skip';
      reasoning = `Soil moisture is within optimal range. Current weather conditions are favorable.`;
      confidence = 75;
    }

    // Adjust based on weather
    if (rainfall > 5 && action === 'irrigate') {
      action = 'reduce';
      amount = amount * 0.5;
      reasoning += ` Reduced irrigation due to expected rainfall (${rainfall.toFixed(1)}mm).`;
    }

    if (temperature > THRESHOLDS.TEMPERATURE.MAX && action === 'skip') {
      action = 'irrigate';
      amount = 20; // Base amount for heat stress
      duration = 4;
      priority = 'high';
      reasoning = `High temperature detected. Additional irrigation recommended to prevent heat stress.`;
    }

    return {
      zone,
      action,
      amount: Math.round(amount),
      duration,
      priority,
      reasoning,
      confidence,
      timestamp: new Date(),
    };
  }

  // Generate fertilizer recommendation based on NPK levels
  generateFertilizerRecommendation(
    zone: string,
    soilData: SoilData
  ): FertilizerRecommendation {
    const { npk } = soilData;
    const avgNPK = (npk.nitrogen + npk.phosphorus + npk.potassium) / 3;

    let type: 'nitrogen' | 'phosphorus' | 'potassium' | 'balanced' = 'balanced';
    let amount = 0;
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
    let reasoning = '';
    let confidence = 80;

    // Determine which nutrient is most deficient
    const deficiencies = {
      nitrogen: 50 - npk.nitrogen,
      phosphorus: 50 - npk.phosphorus,
      potassium: 50 - npk.potassium,
    };

    const maxDeficiency = Math.max(
      deficiencies.nitrogen,
      deficiencies.phosphorus,
      deficiencies.potassium
    );

    if (maxDeficiency > 30) {
      if (deficiencies.nitrogen === maxDeficiency) {
        type = 'nitrogen';
        amount = Math.round(deficiencies.nitrogen * 0.5);
        priority = 'high';
        reasoning = `Severe nitrogen deficiency detected (${npk.nitrogen.toFixed(1)}%). Immediate application recommended.`;
      } else if (deficiencies.phosphorus === maxDeficiency) {
        type = 'phosphorus';
        amount = Math.round(deficiencies.phosphorus * 0.5);
        priority = 'high';
        reasoning = `Severe phosphorus deficiency detected (${npk.phosphorus.toFixed(1)}%). Immediate application recommended.`;
      } else {
        type = 'potassium';
        amount = Math.round(deficiencies.potassium * 0.5);
        priority = 'high';
        reasoning = `Severe potassium deficiency detected (${npk.potassium.toFixed(1)}%). Immediate application recommended.`;
      }
      confidence = 90;
    } else if (maxDeficiency > 15) {
      type = 'balanced';
      amount = Math.round(maxDeficiency * 0.3);
      priority = 'medium';
      reasoning = `Moderate nutrient deficiency detected. Balanced fertilizer application recommended.`;
      confidence = 80;
    } else {
      type = 'balanced';
      amount = 0;
      priority = 'low';
      reasoning = `NPK levels are within acceptable range. No immediate fertilizer application needed.`;
      confidence = 75;
    }

    return {
      zone,
      type,
      amount,
      applicationMethod: 'spread',
      priority,
      reasoning,
      confidence,
      timestamp: new Date(),
    };
  }

  // Generate complete zone decision
  generateZoneDecision(
    zoneId: string,
    zoneName: string,
    soilData: SoilData,
    weatherData: WeatherData
  ): ZoneDecision {
    const irrigation = this.generateIrrigationRecommendation(zoneId, soilData, weatherData);
    const fertilizer = this.generateFertilizerRecommendation(zoneId, soilData);

    // Determine overall status
    let overallStatus: 'healthy' | 'needs_attention' | 'critical' = 'healthy';
    if (irrigation.priority === 'urgent' || fertilizer.priority === 'urgent') {
      overallStatus = 'critical';
    } else if (irrigation.priority === 'high' || fertilizer.priority === 'high') {
      overallStatus = 'needs_attention';
    }

    return {
      zoneId,
      zoneName,
      irrigation,
      fertilizer,
      overallStatus,
      timestamp: new Date(),
    };
  }
}

export const decisionEngine = new DecisionEngine();

