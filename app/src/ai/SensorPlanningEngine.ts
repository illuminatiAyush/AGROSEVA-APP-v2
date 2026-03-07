/**
 * Sensor Planning Engine
 * Pure TypeScript rules engine for calculating sensor requirements based on crop type and farm area.
 * No UI logic - only business rules and calculations.
 */

import { t } from '@/utils/i18n';

export type CropType = 'Rice' | 'Wheat' | 'Vegetables';

export type SensorType = 'Soil' | 'pH' | 'NPK' | 'Moisture' | 'Temperature' | 'Arduino' | 'ESP32';

export interface SensorRequirement {
  type: SensorType;
  required: number;
  isRequired: boolean; // Whether this sensor is mandatory for the crop
}

export interface SensorStatus {
  type: SensorType;
  required: number;
  installed: number;
  status: string; // Localized status
}

export interface ZoneVerdict {
  overall: string; // Localized overall status
  accuracy: number; // 0-95%
  accuracyLabel: string; // Localized label
  totalCost: number;
  sensorStatuses: SensorStatus[];
}

export interface SensorCosts {
  Soil: number;
  pH: number;
  NPK: number;
  Moisture: number;
  Temperature: number;
  Arduino: number;
  ESP32: number;
}

// Fixed sensor costs (in ₹)
export const SENSOR_COSTS: SensorCosts = {
  Soil: 2000,
  pH: 1500,
  NPK: 3000,
  Moisture: 1800, // Soil moisture probe
  Temperature: 1200, // Ambient/soil temperature probe
  Arduino: 1200,  // Microcontroller
  ESP32: 800,     // WiFi Microcontroller
};

/**
 * Calculate required sensors based on crop type and area
 */
export function calculateRequiredSensors(
  cropType: CropType,
  areaInAcres: number,
  zoneCount: number = 1
): SensorRequirement[] {
  const requirements: SensorRequirement[] = [];

  switch (cropType) {
    case 'Wheat':
      // Soil: 2 per acre — monitors root-zone moisture retention
      requirements.push({ type: 'Soil', required: Math.ceil(2 * areaInAcres), isRequired: true });
      // pH: 1 per zone — wheat is pH-sensitive (6.0–7.5 ideal)
      requirements.push({ type: 'pH', required: 1, isRequired: true });
      // NPK: optional for wheat (rain-fed)
      requirements.push({ type: 'NPK', required: 0, isRequired: false });
      // Moisture: 1 per acre — dry spells hurt wheat yield significantly
      requirements.push({ type: 'Moisture', required: Math.ceil(1 * areaInAcres), isRequired: true });
      // Temperature: 1 per zone — frost & heat stress detection
      requirements.push({ type: 'Temperature', required: 1, isRequired: true });
      break;

    case 'Rice':
      // Soil: 3 per acre — paddy fields need dense soil monitoring
      requirements.push({ type: 'Soil', required: Math.ceil(3 * areaInAcres), isRequired: true });
      // pH: 1 per zone — rice grows best at pH 5.5–6.5
      requirements.push({ type: 'pH', required: 1, isRequired: true });
      // NPK: 1 per zone — nitrogen-heavy crop
      requirements.push({ type: 'NPK', required: 1, isRequired: true });
      // Moisture: 2 per acre — rice is water-intensive; critical sensor
      requirements.push({ type: 'Moisture', required: Math.ceil(2 * areaInAcres), isRequired: true });
      // Temperature: 1 per zone — cold nights reduce germination rate
      requirements.push({ type: 'Temperature', required: 1, isRequired: true });
      break;

    case 'Vegetables':
      // Soil: 3 per acre — frequent tilling needs continuous monitoring
      requirements.push({ type: 'Soil', required: Math.ceil(3 * areaInAcres), isRequired: true });
      // pH: 1 per zone — most vegetables prefer pH 6.0–7.0
      requirements.push({ type: 'pH', required: 1, isRequired: true });
      // NPK: 0.5 per acre — fertiliser-heavy crops
      requirements.push({ type: 'NPK', required: Math.ceil(0.5 * areaInAcres), isRequired: true });
      // Moisture: 1 per acre — consistent watering needed for yield
      requirements.push({ type: 'Moisture', required: Math.ceil(1 * areaInAcres), isRequired: true });
      // Temperature: 1 per zone — cold/heat stress shows quickly in vegetables
      requirements.push({ type: 'Temperature', required: 1, isRequired: true });
      break;
  }

  return requirements;
}

/**
 * Calculate sensor status for each type
 */
export function calculateSensorStatus(
  required: number,
  installed: number
): string {
  if (installed < required) return t('needsMore');
  if (installed === required) return t('optimalStatus');
  return t('extra');
}

/**
 * Calculate overall zone verdict
 */
export function calculateZoneVerdict(
  sensorStatuses: SensorStatus[]
): string {
  const hasNeedsMore = sensorStatuses.some(s => s.status === t('needsMore'));
  const hasExtra = sensorStatuses.some(s => s.status === t('extra'));

  if (hasNeedsMore) return t('needsMore');
  if (hasExtra) return t('overPlanned');
  return t('optimalStatus');
}

/**
 * Calculate accuracy based on sensor installation
 * Uses diminishing returns, capped at 95%
 */
export function calculateAccuracy(
  sensorStatuses: SensorStatus[],
  cropType: CropType
): number {
  let baseAccuracy = 50; // Starting accuracy

  // Calculate accuracy contribution from each sensor type
  sensorStatuses.forEach(status => {
    const { type, required, installed } = status;

    if (required === 0) return; // Skip optional sensors for accuracy

    // Calculate coverage ratio (how many required sensors are installed)
    const coverage = Math.min(installed / required, 1); // Cap at 1.0

    // Different sensor types contribute differently
    let contribution = 0;
    switch (type) {
      case 'Soil':
        contribution = coverage * 20; // Root-zone health — high importance
        break;
      case 'pH':
        contribution = coverage * 12; // pH balance — important
        break;
      case 'NPK':
        contribution = coverage * 8;  // Nutrient levels — adds precision
        break;
      case 'Moisture':
        contribution = coverage * 10; // Water stress prevention — significant
        break;
      case 'Temperature':
        contribution = coverage * 5;  // Climate advisory — supplementary
        break;
    }

    // Apply diminishing returns (extra sensors don't help)
    if (installed > required) {
      contribution = (required / installed) * contribution;
    }

    baseAccuracy += contribution;
  });

  // Cap at 95% — no sensor network can achieve perfect certainty
  return Math.min(Math.round(baseAccuracy), 95);
}

/**
 * Get accuracy label from percentage
 */
export function getAccuracyLabel(accuracy: number): string {
  if (accuracy < 70) return t('low');
  if (accuracy < 85) return t('medium');
  return t('high');
}

/**
 * Calculate total cost of installed sensors
 */
export function calculateTotalCost(installedSensors: Record<SensorType, number>): number {
  let total = 0;
  (Object.keys(installedSensors) as SensorType[]).forEach(type => {
    total += installedSensors[type] * SENSOR_COSTS[type];
  });
  return total;
}

/**
 * Main function: Calculate complete zone verdict
 */
export function calculateZoneVerdictComplete(
  cropType: CropType,
  areaInAcres: number,
  installedSensors: Record<SensorType, number>,
  zoneCount: number = 1
): ZoneVerdict {
  // 1. Calculate required sensors
  const requirements = calculateRequiredSensors(cropType, areaInAcres, zoneCount);

  // 2. Build sensor statuses
  const sensorStatuses: SensorStatus[] = requirements.map(req => ({
    type: req.type,
    required: req.required,
    installed: installedSensors[req.type] || 0,
    status: calculateSensorStatus(req.required, installedSensors[req.type] || 0),
  }));

  // 3. Calculate overall verdict
  const overall = calculateZoneVerdict(sensorStatuses);

  // 4. Calculate accuracy
  const accuracy = calculateAccuracy(sensorStatuses, cropType);
  const accuracyLabel = getAccuracyLabel(accuracy);

  // 5. Calculate total cost
  const totalCost = calculateTotalCost(installedSensors);

  return {
    overall,
    accuracy,
    accuracyLabel,
    totalCost,
    sensorStatuses,
  };
}

