/**
 * Sensor Alert Service
 *
 * Subscribes to live sensor stores (pH, moisture, temperature, humidity)
 * and fires BOTH:
 *   1. In-app alerts  → useNotificationStore (shown in NotificationsScreen)
 *   2. OS notifications → expo-notifications (mobile notification bar / shade)
 *
 * DESIGN RULES (zero-regression):
 * - Uses Zustand subscribe() — never modifies polling logic in any store
 * - Debounced: each metric can only alert once per 60 seconds (via canAlert)
 * - Singleton: start()/stop() safe to call multiple times
 * - Permission must be granted before OS notifications work (requested in App.tsx)
 */

import * as Notifications from 'expo-notifications';
import { usePHStore } from '@/store/usePHStore';
import { useMoistureStore } from '@/store/useMoistureStore';
import { useSensorStore } from '@/store/useSensorStore';
import { useNotificationStore, canAlert } from '@/store/useNotificationStore';

// Configure how OS notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

// ── Agronomic thresholds ──────────────────────────────────────────────────────
const THRESHOLDS = {
    pH: { low: 5.5, high: 7.8 },
    moisture: { low: 20, high: 85 },
    temperature: { low: 10, high: 40 },
    humidity: { high: 90 },
};

// ── Helper to fire BOTH in-app and OS notification ───────────────────────────
async function fireAlert(
    metric: string,
    title: string,
    message: string,
    severity: 'warning' | 'critical' | 'info',
) {
    if (!canAlert(metric)) return; // debounced — skip if too soon

    // 1. In-app alert (shows in NotificationsScreen)
    useNotificationStore.getState().addAlert({
        type: 'sensor',
        severity,
        metric,
        title,
        message,
    });

    // 2. OS notification (shows in mobile notification bar/shade)
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body: message,
                data: { metric, severity },
                // Android: use a colour matching severity
                color: severity === 'critical' ? '#C62828' : '#E65100',
            },
            trigger: null, // fire immediately
        });
    } catch (_) {
        // If permission denied or unavailable, silently skip OS notification
        // In-app alert was already added above — no regression
    }
}

// ── pH checks ─────────────────────────────────────────────────────────────────
function checkPH(pH: number | null) {
    if (pH === null || pH === 0) return; // 0 = sensor not connected
    if (pH < THRESHOLDS.pH.low) {
        fireAlert(
            'pH_low',
            '⚠️ Soil Too Acidic',
            `pH is ${pH.toFixed(1)} (below ${THRESHOLDS.pH.low}). Add lime to correct soil acidity.`,
            'warning',
        );
    } else if (pH > THRESHOLDS.pH.high) {
        fireAlert(
            'pH_high',
            '⚠️ Soil Too Alkaline',
            `pH is ${pH.toFixed(1)} (above ${THRESHOLDS.pH.high}). Add gypsum to reduce alkalinity.`,
            'warning',
        );
    }
}

// ── Moisture checks ───────────────────────────────────────────────────────────
function checkMoisture(moisture: number | null) {
    if (moisture === null) return;
    if (moisture < THRESHOLDS.moisture.low) {
        fireAlert(
            'moisture_low',
            '🚨 Soil Too Dry',
            `Moisture is ${moisture.toFixed(0)}% (below ${THRESHOLDS.moisture.low}%). Irrigate your field now.`,
            'critical',
        );
    } else if (moisture > THRESHOLDS.moisture.high) {
        fireAlert(
            'moisture_high',
            '💧 Soil Waterlogged',
            `Moisture is ${moisture.toFixed(0)}% (above ${THRESHOLDS.moisture.high}%). Check drainage to prevent root rot.`,
            'warning',
        );
    }
}

// ── Temperature checks ────────────────────────────────────────────────────────
function checkTemperature(temp: number | null) {
    if (temp === null) return;
    if (temp > THRESHOLDS.temperature.high) {
        fireAlert(
            'temp_high',
            '🌡️ Heat Stress Alert',
            `Temperature is ${temp.toFixed(1)}°C (above ${THRESHOLDS.temperature.high}°C). Risk of crop heat damage.`,
            'critical',
        );
    } else if (temp < THRESHOLDS.temperature.low) {
        fireAlert(
            'temp_low',
            '❄️ Cold Stress Alert',
            `Temperature is ${temp.toFixed(1)}°C (below ${THRESHOLDS.temperature.low}°C). Risk of frost damage to crops.`,
            'warning',
        );
    }
}

// ── Humidity checks ───────────────────────────────────────────────────────────
function checkHumidity(humidity: number | null) {
    if (humidity === null) return;
    if (humidity > THRESHOLDS.humidity.high) {
        fireAlert(
            'humidity_high',
            '🌫️ High Humidity Alert',
            `Humidity is ${humidity.toFixed(0)}% (above ${THRESHOLDS.humidity.high}%). Risk of fungal disease. Ensure ventilation.`,
            'warning',
        );
    }
}

// ── Unsubscribe handles ───────────────────────────────────────────────────────
let unsubscribers: Array<() => void> = [];

// ── Public API ────────────────────────────────────────────────────────────────
export const sensorAlertService = {
    start() {
        if (unsubscribers.length > 0) return; // already running

        // Subscribe to pH store
        unsubscribers.push(
            usePHStore.subscribe((state) => {
                checkPH(state.pH);
            }),
        );

        // Subscribe to moisture store
        unsubscribers.push(
            useMoistureStore.subscribe((state) => {
                checkMoisture(state.moisture);
            }),
        );

        // Subscribe to temp + humidity store
        unsubscribers.push(
            useSensorStore.subscribe((state) => {
                checkTemperature(state.temperature);
                checkHumidity(state.humidity);
            }),
        );

        console.log('[SensorAlertService] ✅ Started — watching pH, moisture, temperature, humidity');
    },

    stop() {
        unsubscribers.forEach((unsub) => unsub());
        unsubscribers = [];
        console.log('[SensorAlertService] 🛑 Stopped');
    },
};
