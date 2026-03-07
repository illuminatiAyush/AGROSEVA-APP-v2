// src/store/useNotificationStore.ts
import { create } from 'zustand';

interface Alert {
    id: string;
    title: string;
    message: string;
    type: 'irrigation' | 'system' | 'weather';
    timestamp: number;
}

interface NotificationState {
    hasUnread: boolean;
    alerts: Alert[];
    addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
    markAsRead: () => void;
    clearAlerts: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    hasUnread: false,
    alerts: [],

    addAlert: (newAlert) => set((state) => ({
        hasUnread: true,
        alerts: [
            {
                ...newAlert,
                id: Math.random().toString(36).substring(7),
                timestamp: Date.now(),
            },
            ...state.alerts,
        ],
    })),

    markAsRead: () => set({ hasUnread: false }),

    clearAlerts: () => set({ alerts: [], hasUnread: false }),
}));
