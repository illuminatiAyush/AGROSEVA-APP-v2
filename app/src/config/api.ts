/**
 * API Configuration
 * 
 * Central configuration for all API endpoints.
 * Update LAPTOP_IP_ADDRESS to your laptop's IP address on the local network.
 * 
 * To find your laptop IP:
 * - Windows: ipconfig (look for IPv4 Address)
 * - Mac/Linux: ifconfig or ip addr
 */

// IMPORTANT: Replace with your laptop's IP address on the local network
// Example: 'http://192.168.1.100:8000'
// Do NOT use localhost or 127.0.0.1 - the mobile app cannot reach localhost
// 
// To find your laptop IP:
// - Windows: Run `ipconfig` and look for "IPv4 Address" under your active network adapter
// - Mac/Linux: Run `ifconfig` or `ip addr` and look for your network interface IP
// 
// Default: Auto-detected IP address (update if needed)
// Your detected IP: 172.16.23.32
export const LAPTOP_IP_ADDRESS = 'your_ip_address';

// Irrigation Brain API endpoints
export const IRRIGATION_BRAIN_API = {
  BASE_URL: LAPTOP_IP_ADDRESS,
  HEALTH: `${LAPTOP_IP_ADDRESS}/health`,
  STATUS: `${LAPTOP_IP_ADDRESS}/status`,
  MOISTURE: `${LAPTOP_IP_ADDRESS}/moisture`,
  DISEASE: `${LAPTOP_IP_ADDRESS}/disease`,
  WATER_STRESS: `${LAPTOP_IP_ADDRESS}/vision/water-stress-scan`,  // Plant Water Stress Scanner
} as const;

// Log API configuration on import (for debugging)
console.log('[API Config] Irrigation Brain API Base URL:', IRRIGATION_BRAIN_API.BASE_URL);
console.log('[API Config] Moisture endpoint:', IRRIGATION_BRAIN_API.MOISTURE);

