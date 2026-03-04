// src/services/AIDecisionEngine.ts
import { useStore } from '@/store/useStore';

export interface AIRecommendation {
  action: 'IRRIGATE' | 'FERTILIZE' | 'WAIT' | 'SAFE';
  confidence: number; // 0-100%
  reason: string;
  details: string;
}

export const AIDecisionEngine = {
  analyze: (): AIRecommendation => {
    const { soilData, weather } = useStore.getState();
    const { moisture, nitrogen, phosphorus, potassium } = soilData;

    // 1. Check Weather (Smart Water Saving)
    const rainComing = weather.forecast.some((d, index) => index < 2 && d.condition === 'Rainy');

    // RULE 1: SMART WAIT (Moisture low, but rain is coming)
    if (moisture < 40 && rainComing) {
      return {
        action: 'WAIT',
        confidence: 92,
        reason: 'Rain Forecasted Soon',
        details: 'Soil is dry (40%), but rain is expected in 24h. Skipping irrigation to save water.',
      };
    }

    // RULE 2: IRRIGATION NEEDED (Dry and no rain)
    if (moisture < 35) {
      return {
        action: 'IRRIGATE',
        confidence: 98,
        reason: 'Critical Soil Moisture',
        details: `Moisture is critical (${moisture.toFixed(1)}%). No rain forecast. Pump activation recommended.`,
      };
    }

    // RULE 3: FERTILIZER (NPK check)
    if (nitrogen < 120 || phosphorus < 30 || potassium < 150) {
      return {
        action: 'FERTILIZE',
        confidence: 85,
        reason: 'Nutrient Deficiency',
        details: 'N-P-K levels are below optimal range. Recommended NPK 19:19:19 blend.',
      };
    }

    // RULE 4: ALL GOOD
    return {
      action: 'SAFE',
      confidence: 100,
      reason: 'Optimal Conditions',
      details: 'Soil moisture and nutrient levels are healthy. No action required.',
    };
  }
};