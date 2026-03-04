// Advanced Soil Risk Assessment Service
// Calculates soil risk score based on scientific thresholds using real sensor data

export type RiskLevel = 'Healthy' | 'Mild Stress' | 'High Stress' | 'Severe Stress';

export interface SoilRiskInput {
  soilMoisture: number; // %
  temperature: number; // °C
  humidity: number; // %
  waterPH: number; // pH value
}

export interface StressBreakdown {
  moistureScore: number;
  heatScore: number;
  humidityScore: number;
  pHScore: number;
}

export interface AdvancedSoilRiskResult {
  score: number; // 0-100
  level: RiskLevel;
  breakdown: StressBreakdown;
  reasons: string[];
  farmerAdvice: string[];
}

/**
 * Calculate Soil Moisture Stress Score (0-30)
 */
function calculateMoistureStress(moisture: number): number {
  if (moisture >= 35 && moisture <= 60) {
    return 0; // Optimal range
  } else if (moisture > 60 && moisture <= 75) {
    return 10; // Slightly high
  } else if (moisture > 75 && moisture <= 85) {
    return 15; // High
  } else if (moisture < 30) {
    return 20; // Too dry
  } else {
    return 30; // >85, waterlogged
  }
}

/**
 * Calculate Heat Stress Score (0-25)
 */
function calculateHeatStress(temperature: number): number {
  if (temperature < 30) {
    return 0; // Normal
  } else if (temperature >= 30 && temperature < 35) {
    return 8; // Moderate heat
  } else if (temperature >= 35 && temperature < 40) {
    return 18; // High heat
  } else {
    return 25; // >40, extreme heat
  }
}

/**
 * Calculate Humidity Evaporation Stress Score (0-20)
 */
function calculateHumidityStress(humidity: number): number {
  if (humidity > 65) {
    return 0; // High humidity, low evaporation
  } else if (humidity >= 50 && humidity <= 65) {
    return 6; // Moderate
  } else if (humidity >= 35 && humidity < 50) {
    return 14; // Low humidity, high evaporation
  } else {
    return 20; // <35, very low humidity
  }
}

/**
 * Calculate Water pH Risk Score (0-25)
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
    return 15; // Slightly acidic
  } else {
    return 25; // Fallback for any other case
  }
}

/**
 * Determine risk level from total score
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= 0 && score <= 25) {
    return 'Healthy';
  } else if (score >= 26 && score <= 50) {
    return 'Mild Stress';
  } else if (score >= 51 && score <= 75) {
    return 'High Stress';
  } else {
    return 'Severe Stress';
  }
}

/**
 * Generate explainable reasons for the risk score
 */
function generateReasons(
  breakdown: StressBreakdown,
  input: SoilRiskInput
): string[] {
  const reasons: string[] = [];

  if (breakdown.moistureScore > 0) {
    if (input.soilMoisture < 30) {
      reasons.push('Soil moisture too low');
    } else if (input.soilMoisture > 85) {
      reasons.push('Soil moisture too high (waterlogged)');
    } else if (input.soilMoisture > 75) {
      reasons.push('High soil moisture');
    } else if (input.soilMoisture > 60) {
      reasons.push('Slightly elevated soil moisture');
    }
  }

  if (breakdown.heatScore > 0) {
    if (input.temperature >= 40) {
      reasons.push('Extreme temperature');
    } else if (input.temperature >= 35) {
      reasons.push('High temperature');
    } else if (input.temperature >= 30) {
      reasons.push('Moderate heat stress');
    }
  }

  if (breakdown.humidityScore > 0) {
    if (input.humidity < 35) {
      reasons.push('Very low humidity');
    } else if (input.humidity < 50) {
      reasons.push('Low humidity (high evaporation)');
    } else if (input.humidity < 65) {
      reasons.push('Moderate humidity');
    }
  }

  if (breakdown.pHScore > 0) {
    if (input.waterPH > 8.5 || input.waterPH < 5.5) {
      reasons.push('Extreme pH level');
    } else if (input.waterPH > 8.0) {
      reasons.push('Alkaline pH');
    } else if (input.waterPH < 6.5) {
      reasons.push('Acidic pH');
    } else if (input.waterPH > 7.5) {
      reasons.push('Slightly alkaline pH');
    }
  }

  if (reasons.length === 0) {
    reasons.push('All parameters within optimal range');
  }

  return reasons;
}

/**
 * Generate farmer-friendly actionable advice
 */
function generateFarmerAdvice(
  breakdown: StressBreakdown,
  input: SoilRiskInput,
  level: RiskLevel
): string[] {
  const advice: string[] = [];

  // Moisture advice
  if (breakdown.moistureScore >= 20) {
    if (input.soilMoisture < 30) {
      advice.push('Irrigate immediately to increase soil moisture');
    } else if (input.soilMoisture > 85) {
      advice.push('Improve drainage to reduce waterlogging');
    }
  } else if (breakdown.moistureScore > 0) {
    advice.push('Monitor soil moisture closely');
  }

  // Temperature advice
  if (breakdown.heatScore >= 18) {
    advice.push('Provide shade or increase irrigation to cool soil');
  } else if (breakdown.heatScore > 0) {
    advice.push('Monitor temperature and increase watering frequency');
  }

  // Humidity advice
  if (breakdown.humidityScore >= 14) {
    advice.push('Increase irrigation frequency due to high evaporation');
  } else if (breakdown.humidityScore > 0) {
    advice.push('Consider mulching to reduce evaporation');
  }

  // pH advice
  if (breakdown.pHScore >= 18) {
    if (input.waterPH > 8.5) {
      advice.push('Apply acidic amendments to lower pH');
    } else if (input.waterPH < 5.5) {
      advice.push('Apply lime or alkaline amendments to raise pH');
    }
  } else if (breakdown.pHScore > 0) {
    advice.push('Monitor pH and consider soil correction if needed');
  }

  // General advice based on risk level
  if (level === 'Severe Stress') {
    advice.push('Take immediate action to prevent crop damage');
  } else if (level === 'High Stress') {
    advice.push('Address stress factors within 24-48 hours');
  } else if (level === 'Mild Stress') {
    advice.push('Continue monitoring and adjust practices as needed');
  } else {
    advice.push('Maintain current practices - conditions are optimal');
  }

  return advice;
}

/**
 * Calculate Advanced Soil Risk Assessment
 * 
 * @param input - Sensor data (moisture, temperature, humidity, pH)
 * @returns Complete risk assessment with score, level, breakdown, reasons, and advice
 */
export function calculateAdvancedSoilRisk(
  input: SoilRiskInput
): AdvancedSoilRiskResult {
  // Calculate individual stress scores
  const moistureScore = calculateMoistureStress(input.soilMoisture);
  const heatScore = calculateHeatStress(input.temperature);
  const humidityScore = calculateHumidityStress(input.humidity);
  const pHScore = calculatePHRisk(input.waterPH);

  const breakdown: StressBreakdown = {
    moistureScore,
    heatScore,
    humidityScore,
    pHScore,
  };

  // Calculate total score (0-100)
  const totalScore = moistureScore + heatScore + humidityScore + pHScore;

  // Determine risk level
  const level = getRiskLevel(totalScore);

  // Generate explainable output
  const reasons = generateReasons(breakdown, input);
  const farmerAdvice = generateFarmerAdvice(breakdown, input, level);

  return {
    score: totalScore,
    level,
    breakdown,
    reasons,
    farmerAdvice,
  };
}


