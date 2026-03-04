// Irrigation Quantity Calculator
// Calculates water quantity based on multiple factors

import { CropStandards, SoilType } from '@/models/FarmSetup';
import { SoilData } from '@/models/SoilData';
import { WeatherData } from '@/models/WeatherData';

interface IrrigationCalculationParams {
  soilData: SoilData;
  weatherData: WeatherData;
  cropStandards: CropStandards;
  soilType: SoilType;
  farmArea: number; // acres
  rainExpected: boolean;
}

interface IrrigationResult {
  mm: number;
  litersPerAcre: number;
  totalLiters: number;
  calculationSteps: string[];
}

class IrrigationCalculator {
  /**
   * Calculate irrigation quantity considering all factors
   */
  calculate(params: IrrigationCalculationParams): IrrigationResult {
    const { soilData, weatherData, cropStandards, soilType, farmArea, rainExpected } = params;
    const steps: string[] = [];

    // Step 1: Calculate moisture deficit
    const currentMoisture = soilData.moisture.value;
    const targetMoisture = cropStandards.optimalMoistureMax;
    const moistureDeficit = Math.max(0, targetMoisture - currentMoisture);
    steps.push(`Moisture deficit: ${currentMoisture.toFixed(1)}% → ${targetMoisture}% = ${moistureDeficit.toFixed(1)}%`);

    // Step 2: Base water requirement (mm) from crop standards
    let baseWater = cropStandards.waterRequirementPerIrrigation;
    steps.push(`Base water requirement: ${baseWater}mm (from crop standards)`);

    // Step 3: Adjust for moisture deficit
    // If deficit is high, increase water; if low, reduce
    const deficitFactor = moistureDeficit > 20 ? 1.5 : moistureDeficit > 10 ? 1.2 : 1.0;
    baseWater = baseWater * deficitFactor;
    steps.push(`Adjusted for moisture deficit (factor ${deficitFactor.toFixed(1)}): ${baseWater.toFixed(1)}mm`);

    // Step 4: Adjust for root depth
    // Deeper roots need more water to reach all roots
    const rootDepthFactor = cropStandards.rootDepth / 100; // Normalize to 100cm
    baseWater = baseWater * (0.7 + 0.3 * rootDepthFactor);
    steps.push(`Adjusted for root depth ${cropStandards.rootDepth}cm (factor ${(0.7 + 0.3 * rootDepthFactor).toFixed(2)}): ${baseWater.toFixed(1)}mm`);

    // Step 5: Adjust for soil type
    // Sandy: high infiltration, needs more water
    // Clay: low infiltration, needs less water
    // Loamy: balanced
    const soilTypeFactors: Record<SoilType, number> = {
      sandy: 1.3,
      loamy: 1.0,
      clay: 0.8,
    };
    const soilFactor = soilTypeFactors[soilType];
    baseWater = baseWater * soilFactor;
    steps.push(`Adjusted for ${soilType} soil (factor ${soilFactor}): ${baseWater.toFixed(1)}mm`);

    // Step 6: Adjust for temperature
    // Higher temperature = more evaporation = need more water
    const temp = weatherData.temperature;
    const optimalTemp = (cropStandards.optimalTempMin + cropStandards.optimalTempMax) / 2;
    const tempDeviation = temp - optimalTemp;
    const tempFactor = tempDeviation > 5 ? 1.2 : tempDeviation > 0 ? 1.1 : 1.0;
    baseWater = baseWater * tempFactor;
    steps.push(`Adjusted for temperature ${temp}°C (factor ${tempFactor.toFixed(1)}): ${baseWater.toFixed(1)}mm`);

    // Step 7: Reduce if rain expected
    if (rainExpected) {
      const rainReduction = 0.5; // Reduce by 50% if rain expected
      baseWater = baseWater * rainReduction;
      steps.push(`Reduced by 50% due to expected rain: ${baseWater.toFixed(1)}mm`);
    }

    // Step 8: Convert mm to liters per acre
    // 1mm = 10,000 liters per hectare = 4,047 liters per acre
    // Actually: 1mm = 10 m³/ha = 10,000 L/ha = 4,047 L/acre
    const litersPerAcre = baseWater * 4047; // 1mm = 4047 liters per acre
    const totalLiters = litersPerAcre * farmArea;

    steps.push(`Final calculation: ${baseWater.toFixed(1)}mm = ${litersPerAcre.toFixed(0)}L/acre`);
    steps.push(`Total for ${farmArea} acres: ${totalLiters.toFixed(0)}L`);

    return {
      mm: Math.round(baseWater * 10) / 10,
      litersPerAcre: Math.round(litersPerAcre),
      totalLiters: Math.round(totalLiters),
      calculationSteps: steps,
    };
  }

  /**
   * Calculate moisture deficit percentage
   */
  getMoistureDeficit(current: number, optimal: number): number {
    return Math.max(0, optimal - current);
  }
}

export const irrigationCalculator = new IrrigationCalculator();

