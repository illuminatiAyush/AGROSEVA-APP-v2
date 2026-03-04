/**
 * Moisture Store
 * 
 * Zustand store for live moisture data from Arduino.
 * Polls GET /moisture every 2 seconds to get real-time updates.
 * 
 * NO mocks - only real data from the irrigation brain server.
 */

import { create } from 'zustand';
import { IRRIGATION_BRAIN_API } from '../config/api';

interface MoistureState {
  // Live moisture data
  moisture: number | null;
  timestamp: number | null;
  source: string | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchMoisture: () => Promise<void>;
  startPolling: () => () => void; // Returns cleanup function
  stopPolling: () => void;
}

// Polling interval (2 seconds as specified)
const POLL_INTERVAL = 2000;

// Global polling interval ID (for cleanup)
let pollingIntervalId: NodeJS.Timeout | null = null;

export const useMoistureStore = create<MoistureState>((set, get) => ({
  // Initial state
  moisture: null,
  timestamp: null,
  source: null,
  isLoading: false,
  error: null,

  // Fetch moisture from API
  fetchMoisture: async () => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });
    
    const requestTime = new Date().toISOString();
    console.log(`[Moisture Store] 📡 Fetching moisture at ${requestTime}`);
    console.log(`[Moisture Store] Request URL: ${IRRIGATION_BRAIN_API.MOISTURE}`);

    try {
      const response = await fetch(IRRIGATION_BRAIN_API.MOISTURE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = new Date().toISOString();
      console.log(`[Moisture Store] 📥 Response received at ${responseTime}`);
      console.log(`[Moisture Store] Status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          const errorMsg = 'No moisture data available. Arduino may not be connected.';
          console.warn(`[Moisture Store] ⚠️ ${errorMsg}`);
          set({ 
            error: errorMsg, 
            isLoading: false,
            moisture: null,
            timestamp: null,
            source: null,
          });
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Moisture Store] ✅ Moisture data received:`, data);
      console.log(`[Moisture Store] Moisture value: ${data.moisture}%`);

      set({
        moisture: data.moisture,
        timestamp: data.timestamp,
        source: data.source || 'arduino',
        isLoading: false,
        error: null,
      });

      console.log(`[Moisture Store] ✅ State updated - Moisture: ${data.moisture}%`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Only log error details once per error type to avoid spam
      const state = get();
      if (state.error !== `Failed to fetch moisture: ${errorMessage}`) {
        console.warn(`[Moisture Store] ⚠️ Error fetching moisture: ${errorMessage}`);
        if (errorMessage.includes('Network request failed')) {
          console.warn(`[Moisture Store] 💡 Make sure backend is running at ${IRRIGATION_BRAIN_API.MOISTURE}`);
        }
      }
      
      set({
        error: `Failed to fetch moisture: ${errorMessage}`,
        isLoading: false,
      });
    }
  },

  // Start polling moisture every 2 seconds
  startPolling: () => {
    // Clear any existing polling
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    console.log(`[Moisture Store] 🔄 Starting polling (interval: ${POLL_INTERVAL}ms)`);
    
    // Fetch immediately
    get().fetchMoisture();

    // Set up interval
    pollingIntervalId = setInterval(() => {
      console.log(`[Moisture Store] 🔄 Polling interval triggered`);
      get().fetchMoisture();
    }, POLL_INTERVAL);

    // Return cleanup function
    return () => {
      console.log(`[Moisture Store] 🛑 Stopping polling`);
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
    };
  },

  // Stop polling
  stopPolling: () => {
    console.log(`[Moisture Store] 🛑 Manual stop polling requested`);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  },
}));

