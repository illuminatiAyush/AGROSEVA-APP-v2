// Explainable AI Engine - Human-readable reasoning

import { IrrigationRecommendation, FertilizerRecommendation } from '@/models/Recommendations';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';
import { FarmDecision, CropStandards, ZoneSetup } from '@/models/FarmSetup';
import { WeatherService } from '@/services/WeatherService';

class XAIEngine {
  // Generate human-readable explanation for irrigation decision
  explainIrrigationDecision(
    recommendation: IrrigationRecommendation,
    soilData: SoilData,
    weatherData: WeatherData
  ): string {
    const explanations: string[] = [];

    // Soil moisture explanation
    const moisture = soilData.moisture.value;
    if (moisture < 30) {
      explanations.push(`Soil moisture is critically low at ${moisture.toFixed(1)}%, which can cause severe crop stress.`);
    } else if (moisture < 40) {
      explanations.push(`Soil moisture is below optimal range (${moisture.toFixed(1)}%), indicating the need for irrigation.`);
    } else if (moisture > 80) {
      explanations.push(`Soil moisture is high (${moisture.toFixed(1)}%), so irrigation is not recommended to avoid waterlogging.`);
    } else {
      explanations.push(`Soil moisture is within acceptable range (${moisture.toFixed(1)}%).`);
    }

    // Weather impact explanation
    if (weatherData.rainfall > 5) {
      explanations.push(`Expected rainfall of ${weatherData.rainfall.toFixed(1)}mm will contribute to soil moisture.`);
    }

    if (weatherData.temperature > 35) {
      explanations.push(`High temperature (${weatherData.temperature.toFixed(1)}°C) increases water evaporation, requiring additional irrigation.`);
    }

    if (weatherData.humidity < 40) {
      explanations.push(`Low humidity (${weatherData.humidity.toFixed(1)}%) increases transpiration rate, affecting water needs.`);
    }

    // Action explanation
    if (recommendation.action === 'irrigate') {
      explanations.push(`Recommended irrigation: ${recommendation.amount}L over ${recommendation.duration} minutes to restore optimal moisture levels.`);
    } else if (recommendation.action === 'reduce') {
      explanations.push(`Reduced irrigation recommended due to expected rainfall.`);
    } else {
      explanations.push(`No irrigation needed at this time.`);
    }

    // Confidence explanation
    if (recommendation.confidence > 85) {
      explanations.push(`High confidence (${recommendation.confidence}%) in this recommendation based on current conditions.`);
    } else {
      explanations.push(`Moderate confidence (${recommendation.confidence}%) - monitor conditions closely.`);
    }

    return explanations.join(' ');
  }

  // Generate human-readable explanation for fertilizer decision
  explainFertilizerDecision(
    recommendation: FertilizerRecommendation,
    soilData: SoilData
  ): string {
    const explanations: string[] = [];

    const npk = soilData.npk;

    // NPK analysis
    explanations.push(`Current NPK levels: N=${npk.nitrogen.toFixed(1)}%, P=${npk.phosphorus.toFixed(1)}%, K=${npk.potassium.toFixed(1)}%.`);

    // Deficiency identification
    if (npk.nitrogen < 40) {
      explanations.push(`Nitrogen is below optimal level, which affects leaf growth and overall plant vigor.`);
    }
    if (npk.phosphorus < 40) {
      explanations.push(`Phosphorus deficiency detected, impacting root development and flowering.`);
    }
    if (npk.potassium < 40) {
      explanations.push(`Potassium levels are low, affecting disease resistance and fruit quality.`);
    }

    // Recommendation explanation
    if (recommendation.amount > 0) {
      explanations.push(`Recommended ${recommendation.type} fertilizer application: ${recommendation.amount}kg using ${recommendation.applicationMethod} method.`);
    } else {
      explanations.push(`NPK levels are balanced. No immediate fertilizer application needed.`);
    }

    // Priority explanation
    if (recommendation.priority === 'urgent') {
      explanations.push(`URGENT: Immediate action required to prevent crop damage.`);
    } else if (recommendation.priority === 'high') {
      explanations.push(`High priority: Address nutrient deficiency soon to maintain crop health.`);
    }

    // Confidence
    explanations.push(`Confidence level: ${recommendation.confidence}% based on current soil analysis.`);

    return explanations.join(' ');
  }

  // Generate comprehensive explanation for zone decision
  explainZoneDecision(
    irrigation: IrrigationRecommendation,
    fertilizer: FertilizerRecommendation,
    soilData: SoilData,
    weatherData: WeatherData
  ): string {
    const irrigationExplanation = this.explainIrrigationDecision(irrigation, soilData, weatherData);
    const fertilizerExplanation = this.explainFertilizerDecision(fertilizer, soilData);

    return `IRRIGATION: ${irrigationExplanation}\n\nFERTILIZER: ${fertilizerExplanation}`;
  }

  /**
   * Generate bullet-point explanations for farm decision
   * Returns array of explanation strings
   */
  explainFarmDecision(
    decision: FarmDecision,
    zoneSetup: ZoneSetup,
    cropStandards: CropStandards,
    soilData: SoilData,
    weatherData: WeatherData
  ): string[] {
    const explanations: string[] = [];

    // 1. Crop and standards
    explanations.push(`Crop: ${zoneSetup.cropName} (${zoneSetup.zoneName})`);
    explanations.push(`Optimal standards: Moisture ${cropStandards.optimalMoistureMin}-${cropStandards.optimalMoistureMax}%, pH ${cropStandards.idealPHMin}-${cropStandards.idealPHMax}, Temp ${cropStandards.optimalTempMin}-${cropStandards.optimalTempMax}°C`);

    // 2. Current sensor readings
    explanations.push(`Current readings: Moisture ${soilData.moisture.value.toFixed(1)}%, pH ${soilData.pH.value.toFixed(1)}, Temp ${weatherData.temperature.toFixed(1)}°C`);
    explanations.push(`NPK levels: N=${soilData.npk.nitrogen.toFixed(1)}kg/acre, P=${soilData.npk.phosphorus.toFixed(1)}kg/acre, K=${soilData.npk.potassium.toFixed(1)}kg/acre`);

    // 3. Parameters out of range
    const outOfRange: string[] = [];
    
    if (soilData.moisture.value < cropStandards.optimalMoistureMin) {
      outOfRange.push(`Moisture ${soilData.moisture.value.toFixed(1)}% is below optimal (${cropStandards.optimalMoistureMin}-${cropStandards.optimalMoistureMax}%)`);
    } else if (soilData.moisture.value > cropStandards.optimalMoistureMax) {
      outOfRange.push(`Moisture ${soilData.moisture.value.toFixed(1)}% is above optimal (${cropStandards.optimalMoistureMin}-${cropStandards.optimalMoistureMax}%)`);
    }

    if (soilData.pH.value < cropStandards.idealPHMin || soilData.pH.value > cropStandards.idealPHMax) {
      outOfRange.push(`pH ${soilData.pH.value.toFixed(1)} is outside ideal range (${cropStandards.idealPHMin}-${cropStandards.idealPHMax})`);
    }

    if (soilData.npk.nitrogen < cropStandards.npkRequirements.nitrogen * 0.8) {
      outOfRange.push(`Nitrogen ${soilData.npk.nitrogen.toFixed(1)}kg/acre is below required ${cropStandards.npkRequirements.nitrogen}kg/acre`);
    }
    if (soilData.npk.phosphorus < cropStandards.npkRequirements.phosphorus * 0.8) {
      outOfRange.push(`Phosphorus ${soilData.npk.phosphorus.toFixed(1)}kg/acre is below required ${cropStandards.npkRequirements.phosphorus}kg/acre`);
    }
    if (soilData.npk.potassium < cropStandards.npkRequirements.potassium * 0.8) {
      outOfRange.push(`Potassium ${soilData.npk.potassium.toFixed(1)}kg/acre is below required ${cropStandards.npkRequirements.potassium}kg/acre`);
    }

    if (outOfRange.length > 0) {
      explanations.push('Parameters out of range:');
      outOfRange.forEach(item => explanations.push(`  • ${item}`));
    } else {
      explanations.push('All parameters are within optimal range');
    }

    // 4. Why this action was chosen
    explanations.push(`Selected action: ${decision.action}`);
    
    switch (decision.action) {
      case 'IRRIGATE':
        if (soilData.moisture.value < cropStandards.optimalMoistureMin * 0.7) {
          explanations.push('Reason: Critical moisture deficit detected - immediate irrigation needed to prevent crop stress');
        } else {
          explanations.push('Reason: Soil moisture is below optimal range for this crop');
        }
        if (WeatherService.willRainSoon()) {
          explanations.push('Note: Rain is expected, but moisture is too low to wait');
        }
        break;
      
      case 'WAIT':
        if (WeatherService.willRainSoon() && soilData.moisture.value < cropStandards.optimalMoistureMin) {
          explanations.push('Reason: Moisture is low, but rain is forecasted soon - waiting to save water');
        } else {
          explanations.push('Reason: All parameters are within acceptable range - no action needed');
        }
        break;
      
      case 'FERTILIZE':
        explanations.push('Reason: NPK nutrient levels are below crop requirements');
        if (decision.fertilizerQuantity) {
          explanations.push(`Deficient nutrient: ${decision.fertilizerQuantity.type} (${decision.fertilizerQuantity.amount}kg/acre needed)`);
        }
        break;
      
      case 'SOIL_CORRECTION':
        explanations.push('Reason: Soil pH is outside ideal range for this crop');
        if (soilData.pH.value < cropStandards.idealPHMin) {
          explanations.push('Action needed: Apply lime to raise pH');
        } else {
          explanations.push('Action needed: Apply sulfur or acidifying agents to lower pH');
        }
        break;
    }

    // 5. Water quantity calculation (if irrigation)
    if (decision.action === 'IRRIGATE' && decision.irrigationQuantity) {
      explanations.push('Water quantity calculation:');
      explanations.push(`  • Moisture deficit: ${(cropStandards.optimalMoistureMax - soilData.moisture.value).toFixed(1)}%`);
      explanations.push(`  • Root depth factor: ${cropStandards.rootDepth}cm (deeper roots need more water)`);
      explanations.push(`  • Soil type factor: ${zoneSetup.soilType} (affects water retention)`);
      explanations.push(`  • Temperature adjustment: ${weatherData.temperature}°C (affects evaporation)`);
      if (WeatherService.willRainSoon()) {
        explanations.push('  • Rain forecast: Reduced by 50% due to expected rainfall');
      }
      explanations.push(`  • Final quantity: ${decision.irrigationQuantity.mm.toFixed(1)}mm = ${decision.irrigationQuantity.litersPerAcre.toFixed(0)}L/acre`);
      explanations.push(`  • Total for ${zoneSetup.farmArea} acres: ${decision.irrigationQuantity.totalLiters.toFixed(0)}L`);
    }

    // 6. Confidence
    explanations.push(`Confidence: ${decision.confidence}% (based on rule-based priority logic)`);

    return explanations;
  }
}

export const xaiEngine = new XAIEngine();

