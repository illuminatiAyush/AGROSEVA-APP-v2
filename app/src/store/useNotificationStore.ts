// src/store/useNotificationStore.ts
import { create } from 'zustand';

export interface SensorAlert {
    id: string;
    title: string;
    message: string;
    type: 'irrigation' | 'system' | 'weather' | 'sensor';
    severity: 'warning' | 'critical' | 'info';
    metric?: string;   // e.g. 'pH', 'moisture', 'temperature', 'humidity'
    timestamp: number;
}

// Per-metric debounce: minimum 60 s between alerts for the same metric
const ALERT_COOLDOWN_MS = 60_000;
const lastAlertedAt: Record<string, number> = {};

export function canAlert(metric: string): boolean {
    const now = Date.now();
    const last = lastAlertedAt[metric] ?? 0;
    if (now - last >= ALERT_COOLDOWN_MS) {
        lastAlertedAt[metric] = now;
        return true;
    }
    return false;
}

interface NotificationState {
    hasUnread: boolean;
    alerts: SensorAlert[];
    addAlert: (alert: Omit<SensorAlert, 'id' | 'timestamp'>) => void;
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
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                timestamp: Date.now(),
            },
            ...state.alerts.slice(0, 49), // Cap at 50 alerts total
        ],
    })),

    markAsRead: () => set({ hasUnread: false }),

    clearAlerts: () => set({ alerts: [], hasUnread: false }),
}));
