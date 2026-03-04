// EC Risk Assessment Service
// Calculates EC (Electrical Conductivity) risk score based on agronomic thresholds
// This is a SEPARATE feature from Advanced Soil Risk Score

export type ECRiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface ECRiskInput {
  waterPH: number; // pH value
  avgSoilMoisture: number; // % (average of all soil moisture sensors)
  temperature: number; // °C
  humidity: number; // %
}

export interface ECRiskBreakdown {
  phScore: number;
  moistureScore: number;
  temperatureScore: number;
  humidityScore: number;
}

export interface ECRiskResult {
  score: number; // 0-100
  level: ECRiskLevel;
  breakdown: ECRiskBreakdown;
  reasons: string[];
  farmerAdvice: string[];
}

/**
 * Calculate Water pH Risk Score (0-25)
 * Based on EC-related agronomic thresholds
 */
function calculatePHRisk(pH: number): number {
  if (pH >= 6.5 && pH <= 7.5) {
    return 0; // Optimal range
  } else if (pH > 7.5 && pH <= 8.0) {
    return 10; // Slightly alkaline
  } else if (pH > 8.0 && pH <= 8.5) {
    return 18; // Alkaline
  } else if (pH > 8.5 || pH < 5.5) {
    return 25; // Extreme pH
  } else if (pH >= 5.5 && pH < 6.5) {
    return 15; // Slightly acidic (between 5.5-6.5)
  } else {
    return 25; // Fallback for any other case
  }
}

/**
 * Calculate Soil Moisture Risk Score (0-25)
 * Based on EC-related agronomic thresholds
 */
function calculateMoistureRisk(moisture: number): number {
  if (moisture >= 35 && moisture <= 60) {
    return 0; // Optimal range
  } else if (moisture > 60 && moisture <= 75) {
    return 10; // Slightly high
  } else if (moisture > 75) {
    return 15; // High moisture
  } else if (moisture < 30) {
    return 10; // Low moisture
  } else {
    return 10; // Fallback (30-35 range)
  }
}

/**
 * Calculate Temperature Risk Score (0-25)
 * Based on EC-related agronomic thresholds
 */
function calculateTemperatureRisk(temperature: number): number {
  if (temperature < 30) {
    return 0; // Normal
  } else if (temperature >= 30 && temperature < 35) {
    return 10; // Moderate heat
  } else if (temperature >= 35 && temperature < 40) {
    return 18; // High heat
  } else {
    return 25; // >40, extreme heat
  }
}

/**
 * Calculate Humidity Risk Score (0-25)
 * Based on EC-related agronomic thresholds
 */
function calculateHumidityRisk(humidity: number): number {
  if (humidity > 65) {
    return 0; // High humidity, low evaporation
  } else if (humidity >= 50 && humidity <= 65) {
    return 10; // Moderate
  } else if (humidity >= 35 && humidity < 50) {
    return 18; // Low humidity, high evaporation
  } else {
    return 25; // <35, very low humidity
  }
}

/**
 * Determine EC Risk Level from total score
 */
function getECRiskLevel(score: number): ECRiskLevel {
  if (score >= 0 && score <= 25) {
    return 'Low';
  } else if (score >= 26 && score <= 50) {
    return 'Moderate';
  } else if (score >= 51 && score <= 75) {
    return 'High';
  } else {
    return 'Severe';
  }
}

/**
 * Generate explainable reasons for EC risk
 */
function generateECReasons(
  breakdown: ECRiskBreakdown,
  input: ECRiskInput
): string[] {
  const reasons: string[] = [];

  if (breakdown.phScore > 0) {
    if (input.waterPH > 8.5 || input.waterPH < 5.5) {
      reasons.push('Extreme water pH affects salt accumulation');
    } else if (input.waterPH > 8.0) {
      reasons.push('Alkaline water pH increases EC risk');
    } else if (input.waterPH < 6.5) {
      reasons.push('Acidic water pH may affect salt solubility');
    }
  }

  if (breakdown.moistureScore > 0) {
    if (input.avgSoilMoisture > 75) {
      reasons.push('High soil moisture can lead to salt buildup');
    } else if (input.avgSoilMoisture < 30) {
      reasons.push('Low soil moisture concentrates salts');
    } else if (input.avgSoilMoisture > 60) {
      reasons.push('Elevated soil moisture affects salt distribution');
    }
  }

  if (breakdown.temperatureScore > 0) {
    if (input.temperature >= 40) {
      reasons.push('Extreme temperature increases salt stress');
    } else if (input.temperature >= 35) {
      reasons.push('High temperature accelerates salt accumulation');
    } else if (input.temperature >= 30) {
      reasons.push('Moderate heat affects salt dynamics');
    }
  }

  if (breakdown.humidityScore > 0) {
    if (input.humidity < 35) {
      reasons.push('Very low humidity increases salt concentration');
    } else if (input.humidity < 50) {
      reasons.push('Low humidity promotes salt buildup');
    } else if (input.humidity < 65) {
      reasons.push('Moderate humidity affects salt movement');
    }
  }

  if (reasons.length === 0) {
    reasons.push('All parameters within optimal EC range');
  }

  return reasons;
}

/**
 * Generate farmer-friendly EC-specific advice
 */
function generateECAdvice(
  breakdown: ECRiskBreakdown,
  input: ECRiskInput,
  level: ECRiskLevel
): string[] {
  const advice: string[] = [];

  // pH advice (EC-specific)
  if (breakdown.phScore >= 18) {
    if (input.waterPH > 8.5) {
      advice.push('Treat water to reduce alkalinity and prevent salt buildup');
    } else if (input.waterPH < 5.5) {
      advice.push('Adjust water pH to optimal range to manage salt levels');
    }
  } else if (breakdown.phScore > 0) {
    advice.push('Monitor water pH regularly to prevent EC issues');
  }

  // Moisture advice (EC-specific)
  if (breakdown.moistureScore >= 15) {
    if (input.avgSoilMoisture > 75) {
      advice.push('Improve drainage to prevent salt accumulation in waterlogged soil');
    } else if (input.avgSoilMoisture < 30) {
      advice.push('Increase irrigation to prevent salt concentration in dry soil');
    }
  } else if (breakdown.moistureScore > 0) {
    advice.push('Maintain optimal soil moisture to manage salt distribution');
  }

  // Temperature advice (EC-specific)
  if (breakdown.temperatureScore >= 18) {
    advice.push('Provide shade or increase irrigation frequency to reduce salt stress from heat');
  } else if (breakdown.temperatureScore > 0) {
    advice.push('Monitor temperature and adjust irrigation to prevent salt buildup');
  }

  // Humidity advice (EC-specific)
  if (breakdown.humidityScore >= 18) {
    advice.push('Increase irrigation frequency due to high evaporation and salt concentration');
  } else if (breakdown.humidityScore > 0) {
    advice.push('Consider mulching to reduce evaporation and salt accumulation');
  }

  // General EC advice based on risk level
  if (level === 'Severe') {
    advice.push('Immediate action required: Test soil EC and apply leaching if needed');
  } else if (level === 'High') {
    advice.push('Monitor soil EC levels closely and prepare for salt management');
  } else if (level === 'Moderate') {
    advice.push('Continue monitoring EC parameters and maintain good irrigation practices');
  } else {
    advice.push('EC conditions are optimal - maintain current practices');
  }

  return advice;
}

/**
 * Calculate EC Risk Assessment
 * 
 * @param input - Sensor data (water pH, average soil moisture, temperature, humidity)
 * @returns Complete EC risk assessment with score, level, breakdown, reasons, and advice
 */
export function calculateECRisk(input: ECRiskInput): ECRiskResult {
  // Calculate individual component scores
  const phScore = calculatePHRisk(input.waterPH);
  const moistureScore = calculateMoistureRisk(input.avgSoilMoisture);
  const temperatureScore = calculateTemperatureRisk(input.temperature);
  const humidityScore = calculateHumidityRisk(input.humidity);

  const breakdown: ECRiskBreakdown = {
    phScore,
    moistureScore,
    temperatureScore,
    humidityScore,
  };

  // Calculate total EC Risk Score (0-100)
  const totalScore = phScore + moistureScore + temperatureScore + humidityScore;

  // Determine risk level
  const level = getECRiskLevel(totalScore);

  // Generate explainable output
  const reasons = generateECReasons(breakdown, input);
  const farmerAdvice = generateECAdvice(breakdown, input, level);

  return {
    score: totalScore,
    level,
    breakdown,
    reasons,
    farmerAdvice,
  };
}


