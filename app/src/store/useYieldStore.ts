/**
 * Yield Store
 * 
 * Dedicated store for yield prediction data from DRL agent.
 * Stores current, projected, delta, and reason.
 * 
 * Updates ONLY when yield exists in /status response.
 * Persists last known values if yield is missing (graceful degradation).
 */

import { create } from 'zustand';

interface YieldState {
  // Yield data
  yieldCurrent: number | null;
  yieldProjected: number | null;
  yieldDelta: number | null;
  yieldReason: string | null;
  lastUpdated: number | null; // Unix timestamp in milliseconds

  // Actions
  setYield: (data: {
    current: number;
    projected: number;
    delta: number;
    reason: string;
  }) => void;
  clearYield: () => void;
}

export const useYieldStore = create<YieldState>((set) => ({
  // Initial state
  yieldCurrent: null,
  yieldProjected: null,
  yieldDelta: null,
  yieldReason: null,
  lastUpdated: null,

  // Set yield data (called when yield exists in /status)
  setYield: (data) => {
    const now = Date.now();
    
    // Log once per update
    console.log(
      `[APP] Yield updated: current=${data.current} projected=${data.projected} delta=${data.delta >= 0 ? '+' : ''}${data.delta}`
    );
    
    set({
      yieldCurrent: data.current,
      yieldProjected: data.projected,
      yieldDelta: data.delta,
      yieldReason: data.reason,
      lastUpdated: now,
    });
  },

  // Clear yield data (optional, for explicit reset)
  clearYield: () => {
    set({
      yieldCurrent: null,
      yieldProjected: null,
      yieldDelta: null,
      yieldReason: null,
      lastUpdated: null,
    });
  },
}));

