// Farm Setup and Crop Standards Data Models

export type SoilType = 'sandy' | 'loamy' | 'clay';

export interface CropStandards {
  // Optimal soil moisture range (%)
  optimalMoistureMin: number;
  optimalMoistureMax: number;
  
  // Optimal temperature range (°C)
  optimalTempMin: number;
  optimalTempMax: number;
  
  // Ideal pH range
  idealPHMin: number;
  idealPHMax: number;
  
  // Root depth (cm)
  rootDepth: number;
  
  // Water requirement per irrigation (mm)
  waterRequirementPerIrrigation: number;
  
  // NPK requirements (kg/acre)
  npkRequirements: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  
  // Metadata
  cropName: string;
  timestamp: Date;
}

export interface ZoneSetup {
  zoneId: string;
  zoneName: string;
  cropName: string;
  farmArea: number; // acres
  soilType: SoilType;
  cropStandards: CropStandards | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmDecision {
  zoneId: string;
  zoneName: string;
  action: 'IRRIGATE' | 'FERTILIZE' | 'SOIL_CORRECTION' | 'WAIT';
  confidence: number; // 0-100
  irrigationQuantity?: {
    mm: number;
    litersPerAcre: number;
    totalLiters: number;
  };
  fertilizerQuantity?: {
    type: 'nitrogen' | 'phosphorus' | 'potassium' | 'balanced';
    amount: number; // kg/acre
  };
  explanation: string[]; // XAI bullet points
  timestamp: Date;
}

