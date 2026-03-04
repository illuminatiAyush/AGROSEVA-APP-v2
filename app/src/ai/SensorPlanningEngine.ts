/**
 * Sensor Planning Engine
 * Pure TypeScript rules engine for calculating sensor requirements based on crop type and farm area.
 * No UI logic - only business rules and calculations.
 */

export type CropType = 'Rice' | 'Wheat' | 'Vegetables';

export type SensorType = 'Soil' | 'pH' | 'NPK';

export interface SensorRequirement {
  type: SensorType;
  required: number;
  isRequired: boolean; // Whether this sensor is mandatory for the crop
}

export interface SensorStatus {
  type: SensorType;
  required: number;
  installed: number;
  status: 'NEEDS MORE' | 'OPTIMAL' | 'EXTRA';
}

export interface ZoneVerdict {
  overall: 'OPTIMAL' | 'NEEDS MORE' | 'OVER-PLANNED';
  accuracy: number; // 0-95%
  accuracyLabel: 'Low' | 'Medium' | 'High';
  totalCost: number;
  sensorStatuses: SensorStatus[];
}

export interface SensorCosts {
  Soil: number;
  pH: number;
  NPK: number;
}

// Fixed sensor costs (in ₹)
export const SENSOR_COSTS: SensorCosts = {
  Soil: 2000,
  pH: 1500,
  NPK: 3000,
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
      requirements.push({
        type: 'Soil',
        required: Math.ceil(2 * areaInAcres), // 2 sensors per acre (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'pH',
        required: 1, // 1 per zone (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'NPK',
        required: 0, // Optional
        isRequired: false,
      });
      break;

    case 'Rice':
      requirements.push({
        type: 'Soil',
        required: Math.ceil(3 * areaInAcres), // 3 sensors per acre (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'pH',
        required: 1, // 1 per zone (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'NPK',
        required: 1, // 1 per zone (REQUIRED)
        isRequired: true,
      });
      break;

    case 'Vegetables':
      requirements.push({
        type: 'Soil',
        required: Math.ceil(3 * areaInAcres), // 3 sensors per acre (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'pH',
        required: 1, // 1 per zone (REQUIRED)
        isRequired: true,
      });
      requirements.push({
        type: 'NPK',
        required: Math.ceil(0.5 * areaInAcres), // 0.5 per acre (REQUIRED)
        isRequired: true,
      });
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
): 'NEEDS MORE' | 'OPTIMAL' | 'EXTRA' {
  if (installed < required) return 'NEEDS MORE';
  if (installed === required) return 'OPTIMAL';
  return 'EXTRA';
}

/**
 * Calculate overall zone verdict
 */
export function calculateZoneVerdict(
  sensorStatuses: SensorStatus[]
): 'OPTIMAL' | 'NEEDS MORE' | 'OVER-PLANNED' {
  const hasNeedsMore = sensorStatuses.some(s => s.status === 'NEEDS MORE');
  const hasExtra = sensorStatuses.some(s => s.status === 'EXTRA');

  if (hasNeedsMore) return 'NEEDS MORE';
  if (hasExtra) return 'OVER-PLANNED';
  return 'OPTIMAL';
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
        contribution = coverage * 25; // Soil sensors are most important
        break;
      case 'pH':
        contribution = coverage * 15; // pH is important
        break;
      case 'NPK':
        contribution = coverage * 10; // NPK adds precision
        break;
    }

    // Apply diminishing returns (extra sensors don't help)
    if (installed > required) {
      contribution = (required / installed) * contribution;
    }

    baseAccuracy += contribution;
  });

  // Cap at 95%
  return Math.min(Math.round(baseAccuracy), 95);
}

/**
 * Get accuracy label from percentage
 */
export function getAccuracyLabel(accuracy: number): 'Low' | 'Medium' | 'High' {
  if (accuracy < 70) return 'Low';
  if (accuracy < 85) return 'Medium';
  return 'High';
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

