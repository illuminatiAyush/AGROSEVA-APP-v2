// Crop Suitability Engine
// Calculates crop suitability based on weather trends, season, and sensor data

import { cropStandards, Season, CropStandard } from '@/data/cropStandards';
import { WeatherTrend } from '@/services/WeatherTrendService';

export interface SensorInput {
  soilMoisture: number;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface WeatherInput {
  avgTemp: number;
  avgHumidity: number;
  rainfallTrend: 'low' | 'medium' | 'high';
}

export interface ParameterMatch {
  parameter: string;
  status: 'match' | 'warning' | 'unsuitable';
  current: number | string;
  ideal: string;
  score: number;
}

export interface CropSuitabilityResult {
  crop: string;
  accuracy: number;
  status: 'excellent' | 'good' | 'average' | 'notRecommended';
  parameterMatches: ParameterMatch[];
  explanation: string;
  weatherMatch: {
    temp: number;
    humidity: number;
    rainfall: string;
  };
}

/**
 * Calculate parameter match score (0-100)
 */
function calculateParameterScore(
  current: number,
  ideal: { min: number; max: number }
): { score: number; status: 'match' | 'warning' | 'unsuitable' } {
  if (current >= ideal.min && current <= ideal.max) {
    return { score: 100, status: 'match' };
  }
  
  const range = ideal.max - ideal.min;
  const deviation = current < ideal.min 
    ? ideal.min - current 
    : current - ideal.max;
  
  const deviationPercent = (deviation / range) * 100;
  
  if (deviationPercent <= 15) {
    return { score: 75, status: 'warning' };
  } else if (deviationPercent <= 30) {
    return { score: 50, status: 'warning' };
  } else {
    return { score: 20, status: 'unsuitable' };
  }
}

/**
 * Calculate rainfall trend match score
 */
function calculateRainfallScore(
  trend: 'low' | 'medium' | 'high',
  requirement: 'Low' | 'Medium' | 'High'
): { score: number; status: 'match' | 'warning' | 'unsuitable' } {
  const trendMap = { low: 0, medium: 1, high: 2 };
  const reqMap = { Low: 0, Medium: 1, High: 2 };
  
  const diff = Math.abs(trendMap[trend] - reqMap[requirement]);
  
  if (diff === 0) {
    return { score: 100, status: 'match' };
  } else if (diff === 1) {
    return { score: 70, status: 'warning' };
  } else {
    return { score: 40, status: 'unsuitable' };
  }
}

/**
 * Generate parameter matches for a crop
 */
function generateParameterMatches(
  crop: CropStandard,
  sensorInput: SensorInput,
  weatherInput: WeatherInput
): ParameterMatch[] {
  const matches: ParameterMatch[] = [];
  
  // Weather Parameters (40% weight)
  const tempScore = calculateParameterScore(weatherInput.avgTemp, crop.temperature);
  matches.push({
    parameter: 'Temperature (15-day avg)',
    status: tempScore.status,
    current: weatherInput.avgTemp,
    ideal: `${crop.temperature.min}-${crop.temperature.max}°C`,
    score: tempScore.score,
  });
  
  const humidityScore = calculateParameterScore(weatherInput.avgHumidity, crop.humidity);
  matches.push({
    parameter: 'Humidity (15-day avg)',
    status: humidityScore.status,
    current: weatherInput.avgHumidity,
    ideal: `${crop.humidity.min}-${crop.humidity.max}%`,
    score: humidityScore.score,
  });
  
  const rainfallScore = calculateRainfallScore(weatherInput.rainfallTrend, crop.waterRequirement);
  matches.push({
    parameter: 'Rainfall Trend',
    status: rainfallScore.status,
    current: weatherInput.rainfallTrend,
    ideal: crop.waterRequirement,
    score: rainfallScore.score,
  });
  
  // Soil Parameters (40% weight)
  const moistureScore = calculateParameterScore(sensorInput.soilMoisture, crop.soilMoisture);
  matches.push({
    parameter: 'Soil Moisture',
    status: moistureScore.status,
    current: sensorInput.soilMoisture,
    ideal: `${crop.soilMoisture.min}-${crop.soilMoisture.max}%`,
    score: moistureScore.score,
  });
  
  const phScore = calculateParameterScore(sensorInput.pH, crop.pH);
  matches.push({
    parameter: 'pH',
    status: phScore.status,
    current: sensorInput.pH,
    ideal: `${crop.pH.min}-${crop.pH.max}`,
    score: phScore.score,
  });
  
  // Nutrient Parameters (20% weight)
  const nScore = calculateParameterScore(sensorInput.nitrogen, crop.npk.nitrogen);
  matches.push({
    parameter: 'Nitrogen',
    status: nScore.status,
    current: sensorInput.nitrogen,
    ideal: `${crop.npk.nitrogen.min}-${crop.npk.nitrogen.max} ppm`,
    score: nScore.score,
  });
  
  const pScore = calculateParameterScore(sensorInput.phosphorus, crop.npk.phosphorus);
  matches.push({
    parameter: 'Phosphorus',
    status: pScore.status,
    current: sensorInput.phosphorus,
    ideal: `${crop.npk.phosphorus.min}-${crop.npk.phosphorus.max} ppm`,
    score: pScore.score,
  });
  
  const kScore = calculateParameterScore(sensorInput.potassium, crop.npk.potassium);
  matches.push({
    parameter: 'Potassium',
    status: kScore.status,
    current: sensorInput.potassium,
    ideal: `${crop.npk.potassium.min}-${crop.npk.potassium.max} ppm`,
    score: kScore.score,
  });
  
  return matches;
}

/**
 * Generate explanation text with weather context
 */
function generateExplanation(
  crop: CropStandard,
  matches: ParameterMatch[],
  accuracy: number,
  weatherInput: WeatherInput
): string {
  const matchCount = matches.filter(m => m.status === 'match').length;
  const warningCount = matches.filter(m => m.status === 'warning').length;
  const unsuitableCount = matches.filter(m => m.status === 'unsuitable').length;
  
  let explanation = `${crop.name} is `;
  
  if (accuracy >= 85) {
    explanation += 'highly suitable. ';
  } else if (accuracy >= 70) {
    explanation += 'suitable. ';
  } else if (accuracy >= 50) {
    explanation += 'moderately suitable. ';
  } else {
    explanation += 'not recommended. ';
  }
  
  // Add weather context
  explanation += `Last 15 days weather shows ${weatherInput.rainfallTrend} rainfall, `;
  explanation += `avg temperature ${weatherInput.avgTemp}°C, `;
  explanation += `and ${weatherInput.avgHumidity}% humidity. `;
  
  if (matchCount > 0) {
    explanation += `${matchCount} parameters match ideal conditions. `;
  }
  
  if (warningCount > 0) {
    explanation += `${warningCount} parameters need attention. `;
  }
  
  if (unsuitableCount > 0) {
    explanation += `${unsuitableCount} parameters are outside acceptable range. `;
  }
  
  return explanation.trim();
}

/**
 * Calculate crop suitability for given season, weather trend, and sensor data
 */
export function calculateCropSuitability(
  season: Season,
  weatherInput: WeatherInput,
  sensorInput: SensorInput
): CropSuitabilityResult[] {
  // Filter crops by season compatibility only (city removed)
  const suitableCrops = cropStandards.filter(crop =>
    crop.seasons.includes(season)
  );
  
  if (suitableCrops.length === 0) {
    return [];
  }
  
  // Calculate suitability for each crop
  const results: CropSuitabilityResult[] = suitableCrops.map(crop => {
    const matches = generateParameterMatches(crop, sensorInput, weatherInput);
    
    // New weighted calculation: Weather 40%, Soil 40%, Nutrients 20%
    const weights = {
      // Weather (40%)
      temperature: 0.15,
      humidity: 0.10,
      rainfall: 0.15,
      // Soil (40%)
      soilMoisture: 0.20,
      pH: 0.20,
      // Nutrients (20%)
      nitrogen: 0.07,
      phosphorus: 0.07,
      potassium: 0.06,
    };
    
    const scores = {
      temperature: matches.find(m => m.parameter === 'Temperature (15-day avg)')?.score || 0,
      humidity: matches.find(m => m.parameter === 'Humidity (15-day avg)')?.score || 0,
      rainfall: matches.find(m => m.parameter === 'Rainfall Trend')?.score || 0,
      soilMoisture: matches.find(m => m.parameter === 'Soil Moisture')?.score || 0,
      pH: matches.find(m => m.parameter === 'pH')?.score || 0,
      nitrogen: matches.find(m => m.parameter === 'Nitrogen')?.score || 0,
      phosphorus: matches.find(m => m.parameter === 'Phosphorus')?.score || 0,
      potassium: matches.find(m => m.parameter === 'Potassium')?.score || 0,
    };
    
    const accuracy =
      scores.temperature * weights.temperature +
      scores.humidity * weights.humidity +
      scores.rainfall * weights.rainfall +
      scores.soilMoisture * weights.soilMoisture +
      scores.pH * weights.pH +
      scores.nitrogen * weights.nitrogen +
      scores.phosphorus * weights.phosphorus +
      scores.potassium * weights.potassium;
    
    const roundedAccuracy = Math.round(accuracy);
    
    // Determine status
    let status: 'excellent' | 'good' | 'average' | 'notRecommended';
    if (roundedAccuracy >= 85) {
      status = 'excellent';
    } else if (roundedAccuracy >= 70) {
      status = 'good';
    } else if (roundedAccuracy >= 50) {
      status = 'average';
    } else {
      status = 'notRecommended';
    }
    
    const explanation = generateExplanation(crop, matches, roundedAccuracy, weatherInput);
    
    return {
      crop: crop.name,
      accuracy: roundedAccuracy,
      status,
      parameterMatches: matches,
      explanation,
      weatherMatch: {
        temp: weatherInput.avgTemp,
        humidity: weatherInput.avgHumidity,
        rainfall: weatherInput.rainfallTrend,
      },
    };
  });
  
  // Sort by accuracy (descending)
  results.sort((a, b) => b.accuracy - a.accuracy);
  
  return results;
}
