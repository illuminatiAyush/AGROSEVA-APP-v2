// AI-Based Decision Engine Models

export interface IrrigationRecommendation {
  zone: string;
  action: 'irrigate' | 'skip' | 'reduce';
  amount: number; // Liters
  duration: number; // Minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string; // Explainable AI reasoning
  confidence: number; // 0-100
  timestamp: Date;
}

export interface FertilizerRecommendation {
  zone: string;
  type: 'nitrogen' | 'phosphorus' | 'potassium' | 'balanced';
  amount: number; // kg
  applicationMethod: 'spread' | 'liquid' | 'foliar';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string; // Explainable AI reasoning
  confidence: number; // 0-100
  timestamp: Date;
}

export interface ZoneDecision {
  zoneId: string;
  zoneName: string;
  irrigation: IrrigationRecommendation;
  fertilizer: FertilizerRecommendation;
  overallStatus: 'healthy' | 'needs_attention' | 'critical';
  timestamp: Date;
}

