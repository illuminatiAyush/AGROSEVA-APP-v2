// pH Zustand Store
// Manages pH sensor state and provides actions for fetching pH data
// Polls hardware-bridge every 2 seconds for live pH readings

import { create } from 'zustand';
import { PHData } from '@/models/PHData';
import { phService } from '@/services/PHService';

// Polling interval (2 seconds - same as moisture)
const POLL_INTERVAL = 2000;

// Global polling interval ID (for cleanup)
let pollingIntervalId: NodeJS.Timeout | null = null;

interface PHState {
  // State
  pH: number | null;
  timestamp: number | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  source: 'mock' | 'hardware' | null;

  // Actions
  fetchPH: () => Promise<void>;
  startPolling: () => () => void; // Returns cleanup function
  stopPolling: () => void;
  reset: () => void;
}

/**
 * pH Store
 * 
 * Manages pH sensor state:
 * - Current pH value and timestamp
 * - Loading/error states
 * - Data source (mock/hardware)
 * 
 * Usage:
 *   const { pH, status, fetchPH } = usePHStore();
 *   await fetchPH();
 */
export const usePHStore = create<PHState>((set, get) => ({
  // Initial state
  pH: null,
  timestamp: null,
  status: 'idle',
  error: null,
  source: null,

  // Fetch pH from sensor
  fetchPH: async () => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.status === 'loading') {
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const data: PHData = await phService.fetchPH();

      set({
        pH: data.pH,
        timestamp: data.timestamp,
        source: data.source,
        status: 'idle',
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Only log error details once per error type to avoid spam
      const currentState = get();
      if (currentState.error !== errorMessage) {
        console.warn(`[pH Store] ⚠️ Error fetching pH: ${errorMessage}`);
        if (errorMessage.includes('Network request failed') || errorMessage.includes('Hardware')) {
          console.warn(`[pH Store] 💡 Make sure hardware-bridge is running on port 3000`);
        }
      }
      
      set({
        status: 'error',
        error: errorMessage,
      });
    }
  },

  // Start polling pH every 2 seconds
  startPolling: () => {
    // Clear any existing polling
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    console.log(`[pH Store] 🔄 Starting pH polling (interval: ${POLL_INTERVAL}ms)`);
    
    // Fetch immediately
    get().fetchPH();

    // Set up interval
    pollingIntervalId = setInterval(() => {
      console.log(`[pH Store] 🔄 Polling interval triggered`);
      get().fetchPH();
    }, POLL_INTERVAL);

    // Return cleanup function
    return () => {
      console.log(`[pH Store] 🛑 Stopping pH polling`);
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
    };
  },

  // Stop polling
  stopPolling: () => {
    console.log(`[pH Store] 🛑 Manual stop polling requested`);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  },

  // Reset store to initial state
  reset: () => {
    set({
      pH: null,
      timestamp: null,
      status: 'idle',
      error: null,
      source: null,
    });
  },
}));

