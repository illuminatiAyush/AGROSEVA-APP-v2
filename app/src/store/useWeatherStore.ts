import { create } from "zustand";

interface OfflineAction {
  type: string;
  payload: any;
}

interface OfflineState {
  queue: OfflineAction[];
  addToQueue: (action: OfflineAction) => void;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  queue: [],

  addToQueue: (action) =>
    set((state) => ({ queue: [...state.queue, action] })),

  clearQueue: () => set({ queue: [] }),
}));

// Export useWeatherStore for compatibility
export const useWeatherStore = useOfflineStore;
