// Resource Usage Tracking Models

export interface WaterUsage {
  zone: string;
  amount: number; // Liters
  date: Date;
  efficiency: number; // Percentage (0-100)
}

export interface FertilizerUsage {
  zone: string;
  type: string;
  amount: number; // kg
  date: Date;
  efficiency: number; // Percentage (0-100)
}

export interface SoilBalance {
  zone: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
  timestamp: Date;
}

export interface CropStress {
  zone: string;
  level: 'none' | 'low' | 'medium' | 'high' | 'severe';
  indicators: string[];
  timestamp: Date;
}

export interface ResourceTracking {
  waterUsage: WaterUsage[];
  fertilizerUsage: FertilizerUsage[];
  soilBalance: SoilBalance;
  cropStress: CropStress;
  period: {
    start: Date;
    end: Date;
  };
}

