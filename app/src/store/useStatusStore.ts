/**
 * Status Store
 * 
 * Fetches system status from backend /status endpoint.
 * Includes sensor data, irrigation state, explanation, and yield impact.
 * 
 * Polls every 2 seconds for live updates.
 */

import { create } from 'zustand';
import { IRRIGATION_BRAIN_API } from '../config/api';
import { useYieldStore } from './useYieldStore';

interface YieldData {
  current: number;
  projected: number;
  delta: number;
  reason: string;
}

interface StatusState {
  // Sensor data
  moisture: number | null;
  temperature: number | null;
  ph: number | null;
  irrigation: 'ON' | 'OFF';
  explanation: string | null;
  timestamp: number | null;
  
  // Yield data (optional - only present if backend provides it)
  yield?: YieldData;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStatus: () => Promise<void>;
  startPolling: () => () => void; // Returns cleanup function
  stopPolling: () => void;
}

// Polling interval (2 seconds)
const POLL_INTERVAL = 2000;

// Global polling interval ID (for cleanup)
let pollingIntervalId: NodeJS.Timeout | null = null;

export const useStatusStore = create<StatusState>((set, get) => ({
  // Initial state
  moisture: null,
  temperature: null,
  ph: null,
  irrigation: 'OFF',
  explanation: null,
  timestamp: null,
  // yield is undefined by default (optional field)
  isLoading: false,
  error: null,

  // Fetch status from API
  fetchStatus: async () => {
    const state = get();
    
    // Don't fetch if already loading
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(IRRIGATION_BRAIN_API.STATUS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract yield data if available (only if present in response)
      const yieldData = data.yield ? {
        current: data.yield.current ?? 0,
        projected: data.yield.projected ?? 0,
        delta: data.yield.delta ?? 0,
        reason: data.yield.reason ?? '',
      } : undefined;

      // Update yield store ONLY if yield exists (persist last known if missing)
      if (yieldData) {
        useYieldStore.getState().setYield(yieldData);
      }
      // If yield is missing, do NOT reset values (persist last known)

      set({
        moisture: data.moisture ?? null,
        temperature: data.temperature ?? null,
        ph: data.ph ?? null,
        irrigation: data.irrigation === 'ON' ? 'ON' : 'OFF',
        explanation: data.explanation ?? null,
        timestamp: data.timestamp ?? null,
        yield: yieldData, // undefined if not present, not null
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Only log error details once per error type to avoid spam
      const currentState = get();
      if (currentState.error !== errorMessage) {
        console.warn(`[Status Store] ⚠️ Error fetching status: ${errorMessage}`);
      }
      
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  // Start polling status every 2 seconds
  startPolling: () => {
    // Clear any existing polling
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    console.log(`[Status Store] 🔄 Starting status polling (interval: ${POLL_INTERVAL}ms)`);
    
    // Fetch immediately
    get().fetchStatus();

    // Set up interval
    pollingIntervalId = setInterval(() => {
      get().fetchStatus();
    }, POLL_INTERVAL);

    // Return cleanup function
    return () => {
      console.log(`[Status Store] 🛑 Stopping status polling`);
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
    };
  },

  // Stop polling
  stopPolling: () => {
    console.log(`[Status Store] 🛑 Manual stop polling requested`);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  },
}));

