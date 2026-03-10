/**
 * Disease Detection Service
 * 
 * Calls the backend POST /disease endpoint.
 * Backend handles both offline (ESP32 TinyML) and online (accurate model + Groq LLM).
 */
import { IRRIGATION_BRAIN_API } from '@/config/api';

export interface DiseaseResult {
  // Common fields
  status: 'healthy' | 'diseased' | 'error';
  confidence: number;
  method: 'esp32_tinyml' | 'accurate_model' | 'tinyml_local' | 'backend_tflite' | 'none' | 'error';
  
  // Online mode (accurate model)
  disease_name?: string;
  raw_class?: string;
  is_healthy?: boolean;
  all_predictions?: Record<string, number>;
  
  // Offline result (preserved when online enhances it)
  offline_result?: {
    status: string;
    confidence: number;
    method: string;
  };
  
  // Groq LLM diagnosis (online only)
  diagnosis?: {
    disease_name: string;
    severity: string;
    description: string;
    symptoms: string[];
    causes: string[];
    treatment_steps: string[];
    prevention: string[];
    organic_options: string[];
  };
  
  // Error / info
  message?: string;
  diagnosis_note?: string;
  inference_time_ms?: number;
}

export const DiseaseDetectionService = {
  /**
   * Send a plant image to the backend for disease detection.
   * 
   * @param imageUri - Local file URI from camera/gallery
   * @returns DiseaseResult with diagnosis
   */
  scanForDisease: async (imageUri: string): Promise<DiseaseResult> => {
    console.log('[DiseaseService] Sending image to backend...');
    
    const formData = new FormData();
    
    // Create file object from URI
    const filename = imageUri.split('/').pop() || 'plant.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);
    
    try {
      const response = await fetch(IRRIGATION_BRAIN_API.DISEASE, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[DiseaseService] Result:', JSON.stringify(data).substring(0, 200));
      return data as DiseaseResult;
    } catch (error: any) {
      console.error('[DiseaseService] Error:', error.message);
      
      // Check if it's a network error (backend not running)
      if (error.message.includes('Network request failed')) {
        throw new Error('Cannot reach backend server. Make sure the server is running and your IP is correct in api.ts');
      }
      throw error;
    }
  },

  /**
   * Check if the backend is reachable.
   */
  checkBackendHealth: async (): Promise<boolean> => {
    try {
      const response = await fetch(IRRIGATION_BRAIN_API.HEALTH, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) 
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
