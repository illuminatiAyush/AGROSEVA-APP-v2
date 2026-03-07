// Crop Recommendation Engine
// Rule-based AI for crop suitability analysis

import { cropStandards, Season, CropStandard } from '@/data/cropStandards';
import { t } from '@/utils/i18n';

export interface SensorInput {
  soilMoisture: number;
  pH: number;
  temperature: number;
  humidity: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

export interface ParameterMatch {
  parameter: string;
  match: 'excellent' | 'good' | 'fair' | 'poor';
  current: number;
  ideal: string;
  score: number;
}

export interface CropRecommendation {
  crop: string;
  season: Season;
  suitabilityScore: number;
  confidence: number;
  explanation: string;
  parameterMatches: ParameterMatch[];
  waterRequirement: string;
}

/**
 * Detect current farming season based on month
 */
export function detectSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 6 && month <= 10) {
    return 'Kharif'; // Jun-Oct
  } else if (month >= 11 || month <= 3) {
    return 'Rabi'; // Oct-Mar (Nov, Dec, Jan, Feb, Mar)
  } else {
    return 'Zaid'; // Mar-Jun (Apr, May)
  }
}

/**
 * Calculate parameter match score (0-100)
 */
function calculateParameterScore(
  current: number,
  ideal: { min: number; max: number }
): { score: number; match: 'excellent' | 'good' | 'fair' | 'poor' } {
  if (current >= ideal.min && current <= ideal.max) {
    return { score: 100, match: 'excellent' };
  }

  const range = ideal.max - ideal.min;
  const deviation = current < ideal.min
    ? ideal.min - current
    : current - ideal.max;

  const deviationPercent = (deviation / range) * 100;

  if (deviationPercent <= 10) {
    return { score: 85, match: 'good' };
  } else if (deviationPercent <= 25) {
    return { score: 60, match: 'fair' };
  } else {
    return { score: 30, match: 'poor' };
  }
}

/**
 * Generate parameter match details
 */
function generateParameterMatches(
  crop: CropStandard,
  input: SensorInput
): ParameterMatch[] {
  const matches: ParameterMatch[] = [];

  // Soil Moisture
  const moistureScore = calculateParameterScore(input.soilMoisture, crop.soilMoisture);
  matches.push({
    parameter: t('moisture'),
    match: moistureScore.match,
    current: input.soilMoisture,
    ideal: `${crop.soilMoisture.min}-${crop.soilMoisture.max}%`,
    score: moistureScore.score,
  });

  // pH
  const phScore = calculateParameterScore(input.pH, crop.pH);
  matches.push({
    parameter: t('phLevel'),
    match: phScore.match,
    current: input.pH,
    ideal: `${crop.pH.min}-${crop.pH.max}`,
    score: phScore.score,
  });

  // Temperature
  const tempScore = calculateParameterScore(input.temperature, crop.temperature);
  matches.push({
    parameter: t('temperature'),
    match: tempScore.match,
    current: input.temperature,
    ideal: `${crop.temperature.min}-${crop.temperature.max}°C`,
    score: tempScore.score,
  });

  // Humidity
  const humidityScore = calculateParameterScore(input.humidity, crop.humidity);
  matches.push({
    parameter: t('humidity'),
    match: humidityScore.match,
    current: input.humidity,
    ideal: `${crop.humidity.min}-${crop.humidity.max}%`,
    score: humidityScore.score,
  });

  // NPK
  const nScore = calculateParameterScore(input.nitrogen, crop.npk.nitrogen);
  matches.push({
    parameter: t('nitrogen'),
    match: nScore.match,
    current: input.nitrogen,
    ideal: `${crop.npk.nitrogen.min}-${crop.npk.nitrogen.max} ppm`,
    score: nScore.score,
  });

  const pScore = calculateParameterScore(input.phosphorus, crop.npk.phosphorus);
  matches.push({
    parameter: t('phosphorus'),
    match: pScore.match,
    current: input.phosphorus,
    ideal: `${crop.npk.phosphorus.min}-${crop.npk.phosphorus.max} ppm`,
    score: pScore.score,
  });

  const kScore = calculateParameterScore(input.potassium, crop.npk.potassium);
  matches.push({
    parameter: t('potassium'),
    match: kScore.match,
    current: input.potassium,
    ideal: `${crop.npk.potassium.min}-${crop.npk.potassium.max} ppm`,
    score: kScore.score,
  });

  return matches;
}

/**
 * Generate explanation text
 */
function generateExplanation(
  crop: CropStandard,
  season: Season,
  matches: ParameterMatch[],
  score: number
): string {
  const excellentMatches = matches.filter(m => m.match === 'excellent').length;
  const goodMatches = matches.filter(m => m.match === 'good').length;
  const fairMatches = matches.filter(m => m.match === 'fair').length;
  const poorMatches = matches.filter(m => m.match === 'poor').length;

  let matchExplanation = '';

  if (excellentMatches >= 5) {
    matchExplanation = t('excellentMatch');
  } else if (excellentMatches >= 3) {
    matchExplanation = t('goodMatch');
  } else if (goodMatches > 0) {
    matchExplanation = t('fairMatch');
  } else if (poorMatches > 0) {
    matchExplanation = t('poorMatch');
  }

  return t('cropRecommendationExpl', {
    crop: crop.name,
    season: t(season.toLowerCase() as any), // kharif, rabi, zaid keys are lowercase in translations.ts
    matchExplanation,
    score: Math.round(score)
  });
}

/**
 * Recommend best crop based on current sensor data and season
 */
export function recommendCrop(input: SensorInput): CropRecommendation | null {
  const currentSeason = detectSeason();

  // Filter crops suitable for current season
  const suitableCrops = cropStandards.filter(crop =>
    crop.seasons.includes(currentSeason)
  );

  if (suitableCrops.length === 0) {
    return null;
  }

  // Calculate suitability score for each crop
  const recommendations: CropRecommendation[] = suitableCrops.map(crop => {
    const matches = generateParameterMatches(crop, input);

    // Calculate weighted average score
    const weights = {
      soilMoisture: 0.20,
      pH: 0.20,
      temperature: 0.15,
      humidity: 0.10,
      nitrogen: 0.12,
      phosphorus: 0.12,
      potassium: 0.11,
    };

    const scores = {
      soilMoisture: matches.find(m => m.parameter === t('moisture'))?.score || 0,
      pH: matches.find(m => m.parameter === t('phLevel'))?.score || 0,
      temperature: matches.find(m => m.parameter === t('temperature'))?.score || 0,
      humidity: matches.find(m => m.parameter === t('humidity'))?.score || 0,
      nitrogen: matches.find(m => m.parameter === t('nitrogen'))?.score || 0,
      phosphorus: matches.find(m => m.parameter === t('phosphorus'))?.score || 0,
      potassium: matches.find(m => m.parameter === t('potassium'))?.score || 0,
    };

    const suitabilityScore =
      scores.soilMoisture * weights.soilMoisture +
      scores.pH * weights.pH +
      scores.temperature * weights.temperature +
      scores.humidity * weights.humidity +
      scores.nitrogen * weights.nitrogen +
      scores.phosphorus * weights.phosphorus +
      scores.potassium * weights.potassium;

    const explanation = generateExplanation(crop, currentSeason, matches, suitabilityScore);

    // Confidence based on score and number of excellent matches
    const excellentCount = matches.filter(m => m.match === 'excellent').length;
    const confidence = Math.min(100, suitabilityScore + (excellentCount * 5));

    return {
      crop: crop.name,
      season: currentSeason,
      suitabilityScore: Math.round(suitabilityScore),
      confidence: Math.round(confidence),
      explanation,
      parameterMatches: matches,
      waterRequirement: crop.waterRequirement,
    };
  });

  // Sort by suitability score (descending)
  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  // Return top recommendation
  return recommendations[0] || null;
}
