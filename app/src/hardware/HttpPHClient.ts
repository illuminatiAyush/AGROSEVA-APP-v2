// HTTP pH Client Implementation
// Ready for ESP32/Arduino HTTP endpoint integration
// No ESP32 logic here - just the HTTP structure

import { HardwareClient } from './HardwareClient';
import { clampPH } from '@/models/PHData';

/**
 * HTTP pH Client
 * 
 * Connects to ESP32/Arduino via HTTP endpoint.
 * 
 * Expected ESP32 endpoint:
 *   GET http://<esp32-ip>/ph
 *   Response: { "pH": number, "timestamp": number }
 * 
 * TODO: When ESP32 is ready:
 * 1. Set ESP32_IP_ADDRESS in HardwareConfig
 * 2. Ensure ESP32 serves /ph endpoint
 * 3. Set USE_REAL_HARDWARE = true
 * 
 * No refactoring needed - just switch the config flag!
 */
export class HttpPHClient implements HardwareClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getPH(): Promise<{ pH: number; timestamp: number }> {
    const url = `${this.baseUrl}/ph`;
  
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
  
      if (typeof data.pH !== 'number' || typeof data.timestamp !== 'number') {
        throw new Error('Invalid response format from sensor');
      }
  
      const clampedPH = clampPH(data.pH);
  
      return {
        pH: Math.round(clampedPH * 10) / 10,
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
