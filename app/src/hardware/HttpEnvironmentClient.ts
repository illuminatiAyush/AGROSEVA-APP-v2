// HTTP Environment Client Implementation
// Ready for ESP32/Arduino HTTP endpoint integration
// No ESP32 logic here - just the HTTP structure

/**
 * HTTP Environment Client
 * 
 * Connects to ESP32/Arduino via HTTP endpoint to fetch temperature and humidity.
 * 
 * Expected ESP32 endpoint:
 *   GET http://<esp32-ip>/environment
 *   Response: { "temperature": number, "humidity": number, "timestamp": number }
 * 
 * TODO: When ESP32 is ready:
 * 1. Set ESP32_IP_ADDRESS in HardwareConfig
 * 2. Ensure ESP32 serves /environment endpoint
 * 3. Use this client in SensorService
 * 
 * Follows the same pattern as HttpPHClient for consistency.
 */
export class HttpEnvironmentClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getEnvironment(): Promise<{ temperature: number; humidity: number; timestamp: number }> {
    const url = `${this.baseUrl}/environment`;
  
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
  
      if (!response.ok) {
        if (response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Sensor data not available yet');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      if (
        typeof data.temperature !== 'number' ||
        typeof data.humidity !== 'number' ||
        typeof data.timestamp !== 'number'
      ) {
        throw new Error('Invalid response format from sensor');
      }
  
      return {
        temperature: Math.round(data.temperature * 10) / 10,
        humidity: Math.round(data.humidity * 10) / 10,
        timestamp: data.timestamp,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Hardware request timed out');
      }
      throw new Error(`Hardware sensor error: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
}

