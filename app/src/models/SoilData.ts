// Soil Monitoring Data Models

export interface SoilMoisture {
  value: number; // Percentage (0-100)
  zone: string;
  timestamp: Date;
}

export interface SoilPH {
  value: number; // pH level (0-14)
  zone: string;
  timestamp: Date;
}

export interface NPKLevels {
  nitrogen: number; // Percentage
  phosphorus: number; // Percentage
  potassium: number; // Percentage
  zone: string;
  timestamp: Date;
}

export interface SoilData {
  moisture: SoilMoisture;
  pH: SoilPH;
  npk: NPKLevels;
  zone: string;
  timestamp: Date;
}

export interface ZoneSoilData {
  zoneId: string;
  zoneName: string;
  soilData: SoilData;
  lastUpdated: Date;
}

