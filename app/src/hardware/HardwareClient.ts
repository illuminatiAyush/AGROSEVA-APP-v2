// Hardware Client Interface
// This abstraction allows seamless switching between mock and real hardware
// When ESP32/Arduino is ready, just implement this interface - no UI/state refactoring needed

import { PHData } from '@/models/PHData';

/**
 * Hardware Client Interface
 * 
 * All hardware clients (mock, HTTP, Bluetooth, etc.) must implement this interface.
 * This ensures the app can switch between data sources without refactoring.
 * 
 * Future sensors (moisture, NPK, etc.) will follow the same pattern.
 */
export interface HardwareClient {
  /**
   * Fetch pH reading from the sensor
   * @returns Promise with pH value and timestamp
   * @throws Error if sensor read fails
   */
  getPH(): Promise<{ pH: number; timestamp: number }>;
}

