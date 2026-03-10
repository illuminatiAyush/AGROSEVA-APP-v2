// Crop / Leaf Image Analysis Models

export interface CropImage {
  id: string;
  uri: string;
  zone: string;
  timestamp: Date;
  analysis?: ImageAnalysis;
}

export interface ImageAnalysis {
  stressLevel: 'none' | 'low' | 'medium' | 'high' | 'severe';
  classification: 'healthy' | 'nutrient_deficiency' | 'disease' | 'pest_damage' | 'water_stress';
  confidence: number; // 0-100
  detectedIssues: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface CropAnalysisResult {
  cropId: string;
  imageUri: string;
  analysis: ImageAnalysis;
  timestamp: Date;
}

