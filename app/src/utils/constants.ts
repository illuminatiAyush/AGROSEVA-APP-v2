// App Constants
export const APP_NAME = 'AgroSeva';
export const APP_VERSION = '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  SOIL_DATA: 'soil_data',
  WEATHER_DATA: 'weather_data',
  RECOMMENDATIONS: 'recommendations',
  RESOURCE_USAGE: 'resource_usage',
  SETTINGS: 'settings',
  LANGUAGE: 'language',
  CROP_IMAGES: 'crop_images',
  DRL_HISTORY: 'drl_history',
  FARM_SETUP: 'farm_setup',
  CROP_STANDARDS: 'crop_standards',
  FARM_DECISIONS: 'farm_decisions',
  SENSOR_PLANNER: 'sensor_planner',
} as const;

// Zone Configuration
export const ZONES = [
  { id: 'zone_1', name: 'Zone 1 - North Field' },
  { id: 'zone_2', name: 'Zone 2 - South Field' },
  { id: 'zone_3', name: 'Zone 3 - East Field' },
  { id: 'zone_4', name: 'Zone 4 - West Field' },
] as const;

// Thresholds
export const THRESHOLDS = {
  SOIL_MOISTURE: {
    LOW: 30,
    OPTIMAL_MIN: 40,
    OPTIMAL_MAX: 70,
    HIGH: 80,
  },
  PH: {
    ACIDIC: 6.0,
    OPTIMAL_MIN: 6.5,
    OPTIMAL_MAX: 7.5,
    ALKALINE: 8.0,
  },
  TEMPERATURE: {
    MIN: 10,
    OPTIMAL_MIN: 18,
    OPTIMAL_MAX: 28,
    MAX: 35,
  },
} as const;

// API Endpoints (for future use)
export const API_ENDPOINTS = {
  SOIL_MONITORING: '/api/soil',
  WEATHER: '/api/weather',
  RECOMMENDATIONS: '/api/recommendations',
} as const;
