// src/store/usePumpStore.ts
// Zustand store for pump relay state + configuration.
// Config is persisted to AsyncStorage via StorageService.

import { create } from 'zustand';
import { storageService } from '@/services/StorageService';
import { STORAGE_KEYS } from '@/utils/constants';
import { LAPTOP_IP_ADDRESS } from '@/config/api';
import { PumpConfig } from '@/services/analyticsService';

interface PumpState {
    /** Whether the pump relay is currently ON */
    isOn: boolean;
    /** Persisted config (HP, flow rate, energy cost) */
    config: PumpConfig;
    /** True while an API call is in flight */
    isLoading: boolean;

    /** Whether the IoT controller is actually reachable */
    isConnected: boolean;

    /** Load saved config from AsyncStorage on app start */
    loadConfig: () => Promise<void>;
    /** Save updated config to AsyncStorage */
    saveConfig: (cfg: PumpConfig) => Promise<void>;
    /**
     * Toggle the relay via FastAPI.
     * @returns true if the API call succeeded, false on network/hardware error.
     */
    toggleRelay: (on: boolean) => Promise<boolean>;
    /** Ping the hardware bridge to update isConnected */
    checkConnectivity: () => Promise<void>;
}

export const DEFAULT_PUMP_CONFIG: PumpConfig = {
    pumpPowerHp: 1,
    flowRateLpm: 30,
    energyCostPerKwh: 8,
};

export const usePumpStore = create<PumpState>((set, get) => ({
    isOn: false,
    config: DEFAULT_PUMP_CONFIG,
    isLoading: false,
    isConnected: false,

    loadConfig: async () => {
        try {
            const saved = await storageService.get<PumpConfig>(STORAGE_KEYS.PUMP_SETTINGS);
            if (saved) {
                set({ config: saved });
            }
            // Trigger initial connectivity check
            get().checkConnectivity();
        } catch (e) {
            console.warn('[usePumpStore] loadConfig failed:', e);
        }
    },

    saveConfig: async (cfg: PumpConfig) => {
        set({ config: cfg });
        await storageService.set(STORAGE_KEYS.PUMP_SETTINGS, cfg);
    },

    checkConnectivity: async () => {
        try {
            const response = await fetch(`${LAPTOP_IP_ADDRESS}/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000), // 3s timeout
            });
            set({ isConnected: response.ok });
        } catch (error) {
            set({ isConnected: false });
        }
    },

    toggleRelay: async (on: boolean): Promise<boolean> => {
        set({ isLoading: true });
        const endpoint = on ? '/relay/on' : '/relay/off';
        try {
            const response = await fetch(`${LAPTOP_IP_ADDRESS}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                set({ isOn: on, isLoading: false, isConnected: true });
                return true;
            } else {
                console.warn(`[usePumpStore] relay responded with status ${response.status}`);
                set({ isLoading: false, isConnected: false });
                return false;
            }
        } catch (error) {
            console.warn('[usePumpStore] toggleRelay network error:', error);
            set({ isLoading: false, isConnected: false });
            return false;
        }
    },
}));
