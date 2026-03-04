// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { WeatherService } from './src/services/WeatherService';
import { farmMonitoringService } from './src/services/FarmMonitoringService';
import { useStore } from './src/store/useStore';
import { useFarmSetupStore } from './src/store/useFarmSetupStore';
import { useLanguageStore } from './src/store/useLanguageStore';
import { useMoistureStore } from './src/store/useMoistureStore';

export default function App() {
  // Subscribe to language changes to trigger re-renders
  const language = useLanguageStore((state) => state.language);

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

    return () => {
      // Cleanup: Stop moisture polling
      stopMoisturePolling();
      useMoistureStore.getState().stopPolling();
      farmMonitoringService.stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}