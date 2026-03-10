// Crop Standards Dataset
// Defines ideal conditions for each crop type

export type Season = 'Kharif' | 'Rabi' | 'Zaid';
export type WaterRequirement = 'Low' | 'Medium' | 'High';

export type City = 'Pune' | 'Nashik' | 'Nagpur' | 'Kolhapur';

export interface CropStandard {
  name: string;
  seasons: Season[];
  suitableCities: City[];
  soilMoisture: { min: number; max: number };
  pH: { min: number; max: number };
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  npk: {
    nitrogen: { min: number; max: number };
    phosphorus: { min: number; max: number };
    potassium: { min: number; max: number };
  };
  waterRequirement: WaterRequirement;
}

export const cropStandards: CropStandard[] = [
  {
    name: 'Rice',
    seasons: ['Kharif'],
    suitableCities: ['Pune', 'Nashik', 'Kolhapur'],
    soilMoisture: { min: 60, max: 90 },
    pH: { min: 5.5, max: 7.0 },
    temperature: { min: 20, max: 35 },
    humidity: { min: 60, max: 90 },
    npk: {
      nitrogen: { min: 100, max: 200 },
      phosphorus: { min: 30, max: 60 },
      potassium: { min: 100, max: 200 },
    },
    waterRequirement: 'High',
  },
  {
    name: 'Wheat',
    seasons: ['Rabi'],
    suitableCities: ['Pune', 'Nashik', 'Nagpur', 'Kolhapur'],
    soilMoisture: { min: 40, max: 60 },
    pH: { min: 6.0, max: 7.5 },
    temperature: { min: 15, max: 25 },
    humidity: { min: 40, max: 60 },
    npk: {
      nitrogen: { min: 120, max: 180 },
      phosphorus: { min: 40, max: 80 },
      potassium: { min: 120, max: 200 },
    },
    waterRequirement: 'Medium',
  },
  {
    name: 'Cotton',
    seasons: ['Kharif'],
    suitableCities: ['Nagpur', 'Pune'],
    soilMoisture: { min: 50, max: 70 },
    pH: { min: 5.5, max: 8.0 },
    temperature: { min: 21, max: 30 },
    humidity: { min: 50, max: 70 },
    npk: {
      nitrogen: { min: 80, max: 150 },
      phosphorus: { min: 30, max: 60 },
      potassium: { min: 80, max: 150 },
    },
    waterRequirement: 'Medium',
  },
  {
    name: 'Maize',
    seasons: ['Kharif', 'Rabi'],
    suitableCities: ['Pune', 'Nashik', 'Nagpur', 'Kolhapur'],
    soilMoisture: { min: 50, max: 75 },
    pH: { min: 5.5, max: 7.5 },
    temperature: { min: 18, max: 27 },
    humidity: { min: 50, max: 70 },
    npk: {
      nitrogen: { min: 100, max: 180 },
      phosphorus: { min: 35, max: 70 },
      potassium: { min: 100, max: 180 },
    },
    waterRequirement: 'Medium',
  },
  {
    name: 'Sugarcane',
    seasons: ['Kharif'],
    suitableCities: ['Kolhapur', 'Pune', 'Nashik'],
    soilMoisture: { min: 60, max: 80 },
    pH: { min: 6.0, max: 7.5 },
    temperature: { min: 26, max: 32 },
    humidity: { min: 60, max: 80 },
    npk: {
      nitrogen: { min: 120, max: 200 },
      phosphorus: { min: 40, max: 80 },
      potassium: { min: 150, max: 250 },
    },
    waterRequirement: 'High',
  },
  {
    name: 'Vegetables',
    seasons: ['Rabi', 'Zaid'],
    suitableCities: ['Pune', 'Nashik', 'Nagpur', 'Kolhapur'],
    soilMoisture: { min: 50, max: 70 },
    pH: { min: 6.0, max: 7.0 },
    temperature: { min: 18, max: 30 },
    humidity: { min: 50, max: 70 },
    npk: {
      nitrogen: { min: 100, max: 180 },
      phosphorus: { min: 40, max: 80 },
      potassium: { min: 120, max: 200 },
    },
    waterRequirement: 'Medium',
  },
];

