// Mock pH Client Implementation
// Returns realistic pH values for development/testing
// This will be replaced by HttpPHClient when ESP32 is connected

import { HardwareClient } from './HardwareClient';
import { clampPH } from '@/models/PHData';

/**
 * Mock pH Client
 * 
 * Simulates a real pH sensor with:
 * - Realistic pH range (5.5 - 7.5 for agricultural soil)
 * - Small random noise to simulate sensor variance
 * - Proper timestamp generation
 * 
 * This allows development and testing without hardware.
 */
export class MockPHClient implements HardwareClient {
  private basePH: number = 6.5; // Base pH value (slightly acidic, common for soil)
  private noiseRange: number = 0.3; // ±0.3 pH units of noise

  async getPH(): Promise<{ pH: number; timestamp: number }> {
    // Simulate sensor delay (50-150ms)
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Generate realistic pH value with noise
    const noise = (Math.random() - 0.5) * 2 * this.noiseRange; // -0.3 to +0.3
    const pH = clampPH(this.basePH + noise);

    // Add slight drift over time (simulate real sensor behavior)
    const drift = (Math.random() - 0.5) * 0.1;
    this.basePH = clampPH(this.basePH + drift);

    return {
      pH: Math.round(pH * 10) / 10, // Round to 1 decimal place
      timestamp: Date.now(),
    };
  }
}

