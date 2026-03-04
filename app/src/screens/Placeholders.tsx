// src/screens/Placeholders.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { useStore } from '@/store/useStore';

const Screen = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name}</Text>
  </View>
);

export const DashboardScreen = () => {
  const { soilData, weather, language } = useStore();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Farmer Dashboard</Text>
      
      <View style={{ marginTop: 20, padding: 20, backgroundColor: '#e0f7fa', borderRadius: 10 }}>
        <Text>Language: {language.toUpperCase()}</Text>
        <Text>Soil Moisture: {soilData.moisture}%</Text>
        <Text>pH Level: {soilData.ph}</Text>
        <Text>Weather: {weather.temp}°C, {weather.condition}</Text>
      </View>
    </View>
  );
};
export const MonitorScreen = () => <Screen name="Soil & Weather Monitor" />;
export const CameraScreen = () => <Screen name="Crop Scan AI" />;
export const ResourcesScreen = () => <Screen name="Resource Tracker" />;
export const SettingsScreen = () => <Screen name="Settings & Language" />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
});