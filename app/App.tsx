// App.tsx
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import { WeatherService } from './src/services/WeatherService';
import { farmMonitoringService } from './src/services/FarmMonitoringService';
import { useStore } from './src/store/useStore';
import { useFarmSetupStore } from './src/store/useFarmSetupStore';
import { useLanguageStore } from './src/store/useLanguageStore';
import { useMoistureStore } from './src/store/useMoistureStore';
import { sensorAlertService } from './src/services/sensorAlertService';
import * as Notifications from 'expo-notifications';

export default function App() {
  const language = useLanguageStore((state) => state.language);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);

  useEffect(() => {
    // 1. Load language from storage (MUST be first)
    useLanguageStore.getState().loadLanguage();

    // 2. Load farm setup data from storage
    useFarmSetupStore.getState().loadFromStorage();

    // 3. Start LIVE moisture polling from backend (replaces SensorMock)
    // This fetches real moisture data from Arduino via backend API
    const stopMoisturePolling = useMoistureStore.getState().startPolling();

    // 4. Load Weather Intelligence
    const forecast = WeatherService.getForecast();
    const alert = WeatherService.getAlerts();

    // 5. Save to Global Store
    useStore.getState().setWeather({ forecast, alert });

    // 6. Start Farm Monitoring Service (compares sensor data with standards every 3 seconds)
    farmMonitoringService.start();

    // 7. Start Sensor Alert Service (fires in-app notifications on threshold violations)
    // Must start AFTER polling so Zustand stores have subscribers to observe
    sensorAlertService.start();

    // 8. Request OS notification permission (async — doesn't block splash)
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        console.warn('[App] ⚠️ Notification permission not granted — OS alerts will not show');
      }
    });

    // App is ready to show
    setIsAppReady(true);

    return () => {
      // Cleanup: Stop moisture polling
      stopMoisturePolling();
      useMoistureStore.getState().stopPolling();
      farmMonitoringService.stop();
      sensorAlertService.stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      {(!isAppReady || !isSplashAnimationComplete) && (
        <AnimatedSplashScreen
          isReady={isAppReady}
          onAnimationFinished={() => setSplashAnimationComplete(true)}
        />
      )}
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}