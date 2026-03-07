  // pH Service Layer
  // Fetches LIVE pH data from hardware-bridge - NO mocks

  import { PHData, clampPH } from '@/models/PHData';
  import { hardwareClient } from '@/hardware/HardwareConfig';

  /**
   * pH Service
   * 
   * Fetches LIVE pH data from hardware-bridge (Arduino sensor via Serial).
   * The hardware-bridge reads pH from Arduino and exposes it via HTTP endpoint.
   * 
   * All data comes from real Arduino sensors via hardware-bridge - NO mocks.
   */
  class PHService {
    /**
     * Fetch current pH reading from hardware-bridge
     * @returns PHData with pH value, timestamp, and source
     * @throws Error if API call fails
     */
    async fetchPH(): Promise<PHData> {
      try {
        // Use hardware client (HttpPHClient) which connects to hardware-bridge
        const { pH, timestamp } = await hardwareClient.getPH();

        // Ensure pH is in valid range (0-14)
        const clampedPH = clampPH(pH);

        return {
          pH: Math.round(clampedPH * 10) / 10, // Round to 1 decimal
          timestamp: timestamp, // Already in milliseconds from hardware-bridge
          source: 'hardware', // Always hardware (from Arduino via hardware-bridge)
        };
      } catch (error: any) {
        // Re-throw with context for better error handling in UI
        throw new Error(`Failed to fetch pH from hardware-bridge: ${error.message}`);
      }
    }
  }

  export const phService = new PHService();

