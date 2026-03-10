// Hardware Configuration
// Central switch to toggle between mock and real hardware
// Change USE_REAL_HARDWARE to true when ESP32 is connected

import { HardwareClient } from './HardwareClient';
import { MockPHClient } from './MockPHClient';
import { HttpPHClient } from './HttpPHClient';

/**
 * Hardware Configuration
 * 
 * Set USE_REAL_HARDWARE = true when ESP32/Arduino is ready.
 * The app will automatically switch to real hardware - no code changes needed!
 */

// Toggle between mock and real hardware
const USE_REAL_HARDWARE = true;

// Hardware endpoint address
// For Arduino bridge (temporary): 'http://localhost:3000' (when running on same machine)
// For mobile app: Use laptop IP address (e.g., 'http://172.16.23.32:3000')
// For ESP32 (future): 'http://192.168.1.100' (replace with ESP32 IP)
// 
// IMPORTANT: For mobile app, use your laptop's IP address, not localhost
// Find your laptop IP: Windows: `ipconfig`, Mac/Linux: `ifconfig`
// Your detected IP: 172.16.23.32
const HARDWARE_BRIDGE_URL = 'http://192.168.0.104:3000'; // Hardware-bridge URL (update if IP changes)

/**
 * Hardware Client Factory
 * 
 * Returns the appropriate hardware client based on configuration.
 * This pattern scales easily - just add more sensor clients here.
 */
export const hardwareClient: HardwareClient = USE_REAL_HARDWARE
  ? new HttpPHClient(HARDWARE_BRIDGE_URL)
  : new MockPHClient();

// Export config for debugging/info
export const hardwareConfig = {
  useRealHardware: USE_REAL_HARDWARE,
  hardwareBridgeUrl: USE_REAL_HARDWARE ? HARDWARE_BRIDGE_URL : null,
  clientType: USE_REAL_HARDWARE ? 'HttpPHClient' : 'MockPHClient',
} as const;

