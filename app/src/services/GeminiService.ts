// Gemini AI Service for Crop Standards
// Calls Gemini API once per crop to get standard agronomic data

interface GeminiResponse {
  optimalMoistureMin: number;
  optimalMoistureMax: number;
  optimalTempMin: number;
  optimalTempMax: number;
  idealPHMin: number;
  idealPHMax: number;
  rootDepth: number;
  waterRequirementPerIrrigation: number;
  npkRequirements: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

class GeminiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  constructor() {
    // In production, get API key from environment or secure storage
    // For hackathon, you can set it here or use environment variable
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
  }

  /**
   * Fetch crop standards from Gemini AI
   * Only called once per crop, results are cached
   */
  async getCropStandards(cropName: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      // Fallback to mock data if API key not configured
      console.warn('Gemini API key not configured, using mock data');
      return this.getMockCropStandards(cropName);
    }

    try {
      const prompt = `For ${cropName} crop grown in Indian farming conditions, provide standard agronomic data in JSON format with these exact fields:
{
  "optimalMoistureMin": number (percentage, 0-100),
  "optimalMoistureMax": number (percentage, 0-100),
  "optimalTempMin": number (celsius),
  "optimalTempMax": number (celsius),
  "idealPHMin": number (pH scale 0-14),
  "idealPHMax": number (pH scale 0-14),
  "rootDepth": number (centimeters),
  "waterRequirementPerIrrigation": number (millimeters),
  "npkRequirements": {
    "nitrogen": number (kg per acre),
    "phosphorus": number (kg per acre),
    "potassium": number (kg per acre)
  }
}
Return ONLY valid JSON, no additional text.`;

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text || '';

      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const cropStandards = JSON.parse(jsonMatch[0]) as GeminiResponse;

      // Validate required fields
      this.validateCropStandards(cropStandards);

      return cropStandards;
    } catch (error: any) {
      console.error('Gemini API error:', error);
      // Fallback to mock data on error
      return this.getMockCropStandards(cropName);
    }
  }

  /**
   * Mock crop standards for development/testing
   */
  private getMockCropStandards(cropName: string): GeminiResponse {
    // Common Indian crops with realistic values
    const cropData: Record<string, GeminiResponse> = {
      'wheat': {
        optimalMoistureMin: 50,
        optimalMoistureMax: 70,
        optimalTempMin: 15,
        optimalTempMax: 25,
        idealPHMin: 6.0,
        idealPHMax: 7.5,
        rootDepth: 120,
        waterRequirementPerIrrigation: 50,
        npkRequirements: { nitrogen: 120, phosphorus: 60, potassium: 40 },
      },
      'rice': {
        optimalMoistureMin: 80,
        optimalMoistureMax: 100,
        optimalTempMin: 20,
        optimalTempMax: 35,
        idealPHMin: 5.5,
        idealPHMax: 7.0,
        rootDepth: 30,
        waterRequirementPerIrrigation: 75,
        npkRequirements: { nitrogen: 100, phosphorus: 50, potassium: 50 },
      },
      'cotton': {
        optimalMoistureMin: 50,
        optimalMoistureMax: 70,
        optimalTempMin: 21,
        optimalTempMax: 30,
        idealPHMin: 5.8,
        idealPHMax: 8.0,
        rootDepth: 150,
        waterRequirementPerIrrigation: 60,
        npkRequirements: { nitrogen: 80, phosphorus: 40, potassium: 40 },
      },
      'sugarcane': {
        optimalMoistureMin: 60,
        optimalMoistureMax: 80,
        optimalTempMin: 26,
        optimalTempMax: 32,
        idealPHMin: 6.0,
        idealPHMax: 7.5,
        rootDepth: 180,
        waterRequirementPerIrrigation: 100,
        npkRequirements: { nitrogen: 200, phosphorus: 100, potassium: 100 },
      },
      'maize': {
        optimalMoistureMin: 50,
        optimalMoistureMax: 70,
        optimalTempMin: 18,
        optimalTempMax: 27,
        idealPHMin: 6.0,
        idealPHMax: 7.0,
        rootDepth: 90,
        waterRequirementPerIrrigation: 50,
        npkRequirements: { nitrogen: 150, phosphorus: 60, potassium: 60 },
      },
    };

    const lowerCropName = cropName.toLowerCase();
    const matchedCrop = Object.keys(cropData).find(
      key => lowerCropName.includes(key) || key.includes(lowerCropName)
    );

    if (matchedCrop) {
      return cropData[matchedCrop];
    }

    // Default values for unknown crops
    return {
      optimalMoistureMin: 50,
      optimalMoistureMax: 70,
      optimalTempMin: 20,
      optimalTempMax: 30,
      idealPHMin: 6.0,
      idealPHMax: 7.5,
      rootDepth: 100,
      waterRequirementPerIrrigation: 50,
      npkRequirements: { nitrogen: 100, phosphorus: 50, potassium: 50 },
    };
  }

  private validateCropStandards(standards: any): void {
    const required = [
      'optimalMoistureMin', 'optimalMoistureMax',
      'optimalTempMin', 'optimalTempMax',
      'idealPHMin', 'idealPHMax',
      'rootDepth', 'waterRequirementPerIrrigation',
      'npkRequirements',
    ];

    for (const field of required) {
      if (standards[field] === undefined || standards[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!standards.npkRequirements.nitrogen || !standards.npkRequirements.phosphorus || !standards.npkRequirements.potassium) {
      throw new Error('NPK requirements incomplete');
    }
  }
}

export const geminiService = new GeminiService();

