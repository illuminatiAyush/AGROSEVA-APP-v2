// EC Temperature Analysis Service
// Analyzes temperature-based stress using crop-specific and life-stage-specific rules
// This is an ADDITIVE feature on top of EC Risk Assessment

export type TemperatureRiskLevel = 
  | 'Safe' 
  | 'Mild Stress' 
  | 'Moderate Stress' 
  | 'High Stress' 
  | 'Severe Stress' 
  | 'Extreme Stress';

export interface ECTemperatureAnalysisInput {
  cropName: string;
  cropStage: string;
  realTimeTemperature: number;
}

export interface ECTemperatureAnalysisResult {
  temperatureRiskScore: number; // 0-100
  temperatureRiskLevel: TemperatureRiskLevel;
  explanation: string;
  irrigationAdvice: string;
  fertilizerAdvice: string;
}

/**
 * Crop-stage-specific optimal temperature ranges
 * Based on agricultural reference document for temperature management
 * Structure: cropName -> cropStage -> { min, max }
 */
const CROP_STAGE_TEMPERATURE_RANGES: Record<
  string,
  Record<string, { min: number; max: number }>
> = {
  // Rice
  Rice: {
    'Germination': { min: 20, max: 30 },
    'Seedling': { min: 22, max: 32 },
    'Tillering': { min: 24, max: 33 },
    'Panicle Initiation': { min: 25, max: 35 },
    'Flowering': { min: 26, max: 33 },
    'Grain Filling': { min: 24, max: 32 },
    'Maturity': { min: 20, max: 30 },
  },
  // Wheat
  Wheat: {
    'Germination': { min: 12, max: 20 },
    'Seedling': { min: 15, max: 22 },
    'Tillering': { min: 15, max: 25 },
    'Stem Elongation': { min: 18, max: 25 },
    'Heading': { min: 20, max: 25 },
    'Flowering': { min: 18, max: 24 },
    'Grain Filling': { min: 20, max: 25 },
    'Maturity': { min: 15, max: 22 },
  },
  // Cotton
  Cotton: {
    'Germination': { min: 20, max: 28 },
    'Seedling': { min: 21, max: 30 },
    'Vegetative': { min: 23, max: 30 },
    'Flowering': { min: 24, max: 30 },
    'Boll Development': { min: 25, max: 30 },
    'Boll Opening': { min: 22, max: 28 },
    'Maturity': { min: 20, max: 28 },
  },
  // Maize
  Maize: {
    'Germination': { min: 18, max: 25 },
    'Seedling': { min: 18, max: 27 },
    'Vegetative': { min: 20, max: 27 },
    'Tasseling': { min: 22, max: 27 },
    'Silking': { min: 22, max: 27 },
    'Grain Filling': { min: 20, max: 26 },
    'Maturity': { min: 18, max: 25 },
  },
  // Sugarcane
  Sugarcane: {
    'Germination': { min: 26, max: 32 },
    'Tillering': { min: 27, max: 32 },
    'Grand Growth': { min: 28, max: 32 },
    'Maturity': { min: 26, max: 30 },
  },
  // Vegetables (generic)
  Vegetables: {
    'Germination': { min: 18, max: 28 },
    'Seedling': { min: 18, max: 30 },
    'Vegetative': { min: 20, max: 30 },
    'Flowering': { min: 22, max: 28 },
    'Fruit Development': { min: 20, max: 28 },
    'Maturity': { min: 18, max: 26 },
  },
};

/**
 * Calculate temperature risk score based on deviation from optimal range
 * Scoring rules:
 * - Within optimal → 0
 * - ±1–2°C → 20
 * - ±3–4°C → 40
 * - ±5–6°C → 60
 * - ±7–8°C → 80
 * - >8°C deviation → 100
 */
function calculateTemperatureRiskScore(
  currentTemp: number,
  optimalMin: number,
  optimalMax: number
): number {
  // Check if within optimal range
  if (currentTemp >= optimalMin && currentTemp <= optimalMax) {
    return 0;
  }

  // Calculate deviation
  let deviation: number;
  if (currentTemp < optimalMin) {
    deviation = optimalMin - currentTemp;
  } else {
    deviation = currentTemp - optimalMax;
  }

  // Assign score based on deviation
  if (deviation <= 2) {
    return 20;
  } else if (deviation <= 4) {
    return 40;
  } else if (deviation <= 6) {
    return 60;
  } else if (deviation <= 8) {
    return 80;
  } else {
    return 100;
  }
}

/**
 * Determine temperature risk level from score
 */
function getTemperatureRiskLevel(score: number): TemperatureRiskLevel {
  if (score === 0) {
    return 'Safe';
  } else if (score <= 20) {
    return 'Mild Stress';
  } else if (score <= 40) {
    return 'Moderate Stress';
  } else if (score <= 60) {
    return 'High Stress';
  } else if (score <= 80) {
    return 'Severe Stress';
  } else {
    return 'Extreme Stress';
  }
}

/**
 * Generate farmer-friendly explanation
 */
function generateExplanation(
  currentTemp: number,
  cropName: string,
  cropStage: string,
  optimalMin: number,
  optimalMax: number,
  riskLevel: TemperatureRiskLevel
): string {
  const isBelow = currentTemp < optimalMin;
  const isAbove = currentTemp > optimalMax;
  const deviation = isBelow 
    ? (optimalMin - currentTemp).toFixed(1)
    : (currentTemp - optimalMax).toFixed(1);

  if (riskLevel === 'Safe') {
    return `Temperature is optimal for ${cropName} at ${cropStage} stage. Current temperature (${currentTemp.toFixed(1)}°C) is within the ideal range of ${optimalMin}–${optimalMax}°C.`;
  } else if (isBelow) {
    return `Temperature is too low for ${cropName} at ${cropStage} stage. Current temperature (${currentTemp.toFixed(1)}°C) is ${deviation}°C below the optimal range of ${optimalMin}–${optimalMax}°C. This can slow growth and delay development.`;
  } else {
    return `Temperature is too high for ${cropName} at ${cropStage} stage. Current temperature (${currentTemp.toFixed(1)}°C) is ${deviation}°C above the optimal range of ${optimalMin}–${optimalMax}°C. This can cause heat stress and reduce yield.`;
  }
}

/**
 * Generate irrigation advice based on temperature stress
 */
function generateIrrigationAdvice(
  riskLevel: TemperatureRiskLevel,
  currentTemp: number,
  optimalMin: number,
  optimalMax: number
): string {
  const isAbove = currentTemp > optimalMax;
  const isBelow = currentTemp < optimalMin;

  if (riskLevel === 'Safe') {
    return 'Maintain normal irrigation schedule. Temperature conditions are optimal.';
  } else if (isAbove) {
    if (riskLevel === 'Extreme Stress' || riskLevel === 'Severe Stress') {
      return 'Increase irrigation frequency immediately. Water in early morning or evening to reduce heat stress. Consider overhead sprinkling for cooling effect.';
    } else if (riskLevel === 'High Stress') {
      return 'Increase irrigation frequency. Water during cooler parts of the day to help plants cope with heat stress.';
    } else {
      return 'Monitor soil moisture closely. Consider slightly increasing irrigation frequency during hot periods.';
    }
  } else {
    // Below optimal
    if (riskLevel === 'Extreme Stress' || riskLevel === 'Severe Stress') {
      return 'Reduce irrigation frequency to prevent waterlogging. Cold stress reduces water uptake. Ensure good drainage.';
    } else {
      return 'Adjust irrigation schedule. Cold temperatures reduce water needs. Avoid overwatering.';
    }
  }
}

/**
 * Generate fertilizer advice based on temperature stress
 */
function generateFertilizerAdvice(
  riskLevel: TemperatureRiskLevel,
  currentTemp: number,
  optimalMin: number,
  optimalMax: number
): string {
  const isAbove = currentTemp > optimalMax;
  const isBelow = currentTemp < optimalMin;

  if (riskLevel === 'Safe') {
    return 'Continue normal fertilizer application schedule. Temperature conditions support nutrient uptake.';
  } else if (isAbove) {
    if (riskLevel === 'Extreme Stress' || riskLevel === 'Severe Stress') {
      return 'Avoid fertilizer application during extreme heat. Wait for cooler temperatures. If needed, use foliar application with extra water.';
    } else if (riskLevel === 'High Stress') {
      return 'Reduce fertilizer application during hot periods. Apply in early morning with adequate irrigation.';
    } else {
      return 'Monitor plant response to fertilizer. High temperatures can affect nutrient uptake efficiency.';
    }
  } else {
    // Below optimal
    if (riskLevel === 'Extreme Stress' || riskLevel === 'Severe Stress') {
      return 'Avoid fertilizer application during cold stress. Plants have reduced nutrient uptake. Wait for warmer conditions.';
    } else {
      return 'Reduce fertilizer application. Cold temperatures slow nutrient uptake. Apply when temperatures improve.';
    }
  }
}

/**
 * Analyze temperature-based stress for EC Risk Assessment
 * 
 * @param input - Crop name, crop stage, and real-time temperature
 * @returns Temperature stress analysis with score, level, explanation, and advice
 */
export function analyzeECTemperature(
  input: ECTemperatureAnalysisInput
): ECTemperatureAnalysisResult | null {
  const { cropName, cropStage, realTimeTemperature } = input;

  // Validate inputs
  if (!cropName || !cropStage || realTimeTemperature == null) {
    return null;
  }

  // Get optimal temperature range for crop-stage combination
  const cropRanges = CROP_STAGE_TEMPERATURE_RANGES[cropName];
  if (!cropRanges) {
    // Crop not found in database
    return null;
  }

  const stageRange = cropRanges[cropStage];
  if (!stageRange) {
    // Stage not found for this crop
    return null;
  }

  const { min: optimalMin, max: optimalMax } = stageRange;

  // Calculate temperature risk score
  const temperatureRiskScore = calculateTemperatureRiskScore(
    realTimeTemperature,
    optimalMin,
    optimalMax
  );

  // Determine risk level
  const temperatureRiskLevel = getTemperatureRiskLevel(temperatureRiskScore);

  // Generate explanation
  const explanation = generateExplanation(
    realTimeTemperature,
    cropName,
    cropStage,
    optimalMin,
    optimalMax,
    temperatureRiskLevel
  );

  // Generate advice
  const irrigationAdvice = generateIrrigationAdvice(
    temperatureRiskLevel,
    realTimeTemperature,
    optimalMin,
    optimalMax
  );

  const fertilizerAdvice = generateFertilizerAdvice(
    temperatureRiskLevel,
    realTimeTemperature,
    optimalMin,
    optimalMax
  );

  return {
    temperatureRiskScore,
    temperatureRiskLevel,
    explanation,
    irrigationAdvice,
    fertilizerAdvice,
  };
}

