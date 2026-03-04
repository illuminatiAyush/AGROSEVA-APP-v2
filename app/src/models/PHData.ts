// pH Sensor Data Model
// Supports both mock and hardware sources for seamless transition

export interface PHData {
  pH: number; // pH value (0-14, clamped)
  timestamp: number; // Unix timestamp in milliseconds
  source: 'mock' | 'hardware'; // Data source identifier
}

// pH status classification
export type PHStatus = 'acidic' | 'optimal' | 'alkaline';

// Helper function to classify pH status
export const getPHStatus = (pH: number): PHStatus => {
  if (pH < 6.0) return 'acidic';
  if (pH > 7.5) return 'alkaline';
  return 'optimal';
};

// Helper function to clamp pH to valid range (0-14)
export const clampPH = (pH: number): number => {
  return Math.max(0, Math.min(14, pH));
};

