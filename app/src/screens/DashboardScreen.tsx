// src/screens/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Stores
import { useStore } from '../store/useStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUserStore } from '../store/useUserStore';
import { usePHStore } from '../store/usePHStore'; // Real pH Sensor
import { useMoistureStore } from '../store/useMoistureStore'; // Real Moisture Sensor
import { useStatusStore } from '../store/useStatusStore'; // Status with yield data
import { useFarmSetupStore } from '../store/useFarmSetupStore'; // File 2 (Zones)
import { useSensorStore } from '../store/useSensorStore';

// Services & Models
import { AIDecisionEngine } from '../services/AIDecisionEngine';
import { WeatherService } from '../services/WeatherService'; // File 1 (Real API)
import { ZoneRecommendationCard } from '../components/ZoneRecommendationCard'; // File 2
import { AdvancedSoilRiskCard } from '../components/AdvancedSoilRiskCard';
import { calculateAdvancedSoilRisk } from '../services/AdvancedSoilRiskService';
import { SoilData } from '../models/SoilData'; // File 2
import { WeatherData } from '../models/WeatherData'; // File 2

// Theme & Utils
import { colors } from '../theme/colors';
import { useTranslation } from '../utils/i18n';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  // --- STORES ---
  const { soilData, weather: storeWeather } = useStore();
  const { name: userName } = useUserStore();
  const { pH: realPH, fetchPH, startPolling: startPHPolling, stopPolling: stopPHPolling } = usePHStore(); // Real pH
  const { moisture: realMoisture, startPolling: startMoisturePolling, stopPolling: stopMoisturePolling } = useMoistureStore(); // Real Moisture
  const { irrigation, yield: yieldData, startPolling: startStatusPolling, stopPolling: stopStatusPolling } = useStatusStore(); // Status (for irrigation state and yield)
  const { zones, getLatestDecision } = useFarmSetupStore(); // Farm Zones
  const { temperature: sensorTemp, humidity: sensorHumidity } = useSensorStore();
  const t = useTranslation(); // Global translations
  const addAlert = useNotificationStore((state) => state.addAlert);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // --- STATE ---
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState(AIDecisionEngine.analyze()); // Generic Fallback

  // REAL WEATHER STATE (From File 1)
  const [weather, setWeather] = useState<{
    temp: number | string;
    condition: string;
    code?: number;
  }>({
    temp: '--',
    condition: t('loading'),
    code: 0
  });

  const configuredZones = zones.filter(z => z.cropStandards !== null);

  // Prepare data objects for Zone Cards (From File 2)
  const currentSoilData: SoilData = {
    moisture: { value: realMoisture ?? 0, zone: 'current', timestamp: new Date() }, // Use Real Moisture
    pH: { value: realPH !== null ? realPH : 0, zone: 'current', timestamp: new Date() }, // Use Real pH
    npk: {
      nitrogen: soilData.nitrogen,
      phosphorus: soilData.phosphorus,
      potassium: soilData.potassium,
      zone: 'current',
      timestamp: new Date(),
    },
    zone: 'current',
    timestamp: new Date(),
  };

  const currentWeatherData: WeatherData = {
    temperature: typeof weather.temp === 'number' ? weather.temp : parseFloat(String(weather.temp)) || 0,
    humidity: 60, // Default if not in API
    rainfall: 0,
    windSpeed: 0,
    timestamp: new Date(),
  };

  // Calculate Advanced Soil Risk Assessment
  const currentTemperature = sensorTemp ?? (typeof weather.temp === 'number' ? weather.temp : parseFloat(String(weather.temp)) || 29);
  const currentHumidity = sensorHumidity ?? storeWeather.humidity ?? 60;
  const currentPH = realPH ?? 0; // Use real pH, fallback to 0 if not available
  const currentMoisture = realMoisture ?? 0; // Use real moisture, fallback to 0 if not available

  const soilRiskResult = calculateAdvancedSoilRisk({
    soilMoisture: currentMoisture,
    temperature: currentTemperature,
    humidity: currentHumidity,
    waterPH: currentPH,
  });

  // --- LOAD DATA ---
  const loadData = async () => {
    // 1. Fetch Real pH
    fetchPH();

    // 2. Fetch Real Weather API
    const forecast = WeatherService.getForecast();
    if (forecast && forecast.length > 0) {
      const todayForecast = forecast[0]; // Get today's forecast (first element)
      setWeather({
        temp: todayForecast.temp,
        condition: todayForecast.condition,
      });
    }

    // 3. Update Generic Analysis
    setRecommendation(AIDecisionEngine.analyze());
  };

  useEffect(() => {
    // Start polling moisture every 2 seconds
    const cleanupMoisture = startMoisturePolling();

    // Start polling pH every 2 seconds
    const cleanupPH = startPHPolling();

    // Start polling status (includes yield data) every 2 seconds
    const cleanupStatus = startStatusPolling();

    // Load initial data
    loadData();

    // Cleanup: stop polling when component unmounts
    return () => {
      cleanupMoisture();
      cleanupPH();
      cleanupStatus();
    };
  }, [startMoisturePolling, startPHPolling, startStatusPolling]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Helper for Weather Icon
  const getWeatherIcon = (code: number) => {
    if (code >= 51) return 'rainy';
    if (code >= 45) return 'cloudy';
    if (code <= 3 && code >= 1) return 'partly-sunny';
    return 'sunny';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* === HERO HEADER (From File 1 - Better UI) === */}
        <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Namaste, {userName.split(' ')[0]}</Text>
              <View style={styles.locationBadge}>
                <Ionicons name="location-sharp" size={14} color="#FFF" />
                <Text style={styles.location}>{t('location')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <View style={styles.profileCircle}>
                <Text style={styles.profileInitials}>{getInitials(userName || 'Farmer')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* REAL WEATHER WIDGET */}
          <View style={styles.weatherGlass}>
            <View>
              <Text style={styles.weatherLabel}>{t('location')}</Text>
              <Text style={styles.temp}>{weather.temp}°C</Text>
              <Text style={styles.weatherDesc}>{weather.condition}</Text>
            </View>
            <Ionicons
              name={getWeatherIcon(weather.code || 0)}
              size={56}
              color="#FFD700"
              style={{ textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 10 }}
            />
          </View>
        </LinearGradient>

        <View style={styles.bodyContainer}>

          {/* === SECTION 1: FARM RECOMMENDATIONS (From File 2 Logic) === */}
          {configuredZones.length === 0 ? (
            // SHOW SETUP CARD IF NO ZONES
            <View style={[styles.card, styles.setupCard]}>
              <Ionicons name="information-circle" size={32} color={colors.primary} />
              <Text style={styles.setupTitle}>{t('farmSetupRequired')}</Text>
              <Text style={styles.setupText}>
                {t('farmSetupText')}
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={() => navigation.navigate('FarmSetup')}
              >
                <Text style={styles.setupButtonText}>{t('setupFarm')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            // SHOW ZONE CARDS IF CONFIGURED
            <View>
              <Text style={styles.sectionTitle}>{t('aiRecommendation')}</Text>
              {configuredZones.map(zone => {
                const decision = getLatestDecision(zone.zoneId);
                if (!decision) return null;

                return (
                  <ZoneRecommendationCard
                    key={zone.zoneId}
                    zone={zone}
                    decision={decision}
                    soilData={currentSoilData}
                    weatherData={currentWeatherData}
                  />
                );
              })}

              {/* Add Zone Button */}
              <TouchableOpacity
                style={styles.addZoneButton}
                onPress={() => navigation.navigate('FarmSetup')}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.addZoneText}>{t('addAnotherZone')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* === YIELD IMPACT SECTION (Below AI Recommendations) === */}
          {/* Render ONLY if yield exists - no fallback, no placeholders */}
          {yieldData && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 25 }]}>🌾 Yield Impact (AI Projection)</Text>
              <View style={styles.yieldCard}>
                {/* Yield Metrics */}
                <View style={styles.yieldMetricsContainer}>
                  <View style={styles.yieldMetricRow}>
                    <Text style={styles.yieldMetricLabel}>Current Yield:</Text>
                    <Text style={styles.yieldMetricValue}>{yieldData.current.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.yieldMetricRow}>
                    <Text style={styles.yieldMetricLabel}>Projected Yield:</Text>
                    <Text style={[styles.yieldMetricValue, {
                      color: yieldData.delta > 0 ? '#4CAF50' : yieldData.delta === 0 ? '#FFC107' : '#F44336'
                    }]}>
                      {yieldData.projected.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.yieldMetricRow}>
                    <Text style={styles.yieldMetricLabel}>Change:</Text>
                    <Text style={[styles.yieldMetricValue, {
                      color: yieldData.delta > 0 ? '#4CAF50' : yieldData.delta === 0 ? '#FFC107' : '#F44336'
                    }]}>
                      {yieldData.delta > 0 ? '+' : ''}{yieldData.delta.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                {/* Reason text (small, muted) */}
                {yieldData.reason && (
                  <Text style={styles.yieldReasonText}>{yieldData.reason}</Text>
                )}

                {/* Footer note */}
                <Text style={styles.yieldFooterNote}>
                  Projected using AI irrigation decision. Does not affect control.
                </Text>
              </View>
            </>
          )}

          {/* === SECTION 3: ADVANCED SOIL RISK ASSESSMENT === */}
          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>{t('soilRiskAssessment')}</Text>
          <AdvancedSoilRiskCard
            riskResult={soilRiskResult}
            sensorValues={{
              moisture: realMoisture ?? 0,
              temperature: currentTemperature,
              humidity: currentHumidity,
              pH: currentPH,
            }}
          />

          {/* === SECTION 3: LIVE SENSORS (From File 1 - Real pH) === */}
          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>{t('soilStatus')}</Text>
          <View style={styles.gridContainer}>

            {/* Moisture (Live) */}
            <View style={styles.sensorCard}>
              <View style={[styles.iconBg, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="water" size={24} color="#1E88E5" />
              </View>
              <Text style={styles.sensorValue}>{realMoisture !== null ? `${realMoisture.toFixed(1)}%` : '--'}</Text>
              <Text style={styles.sensorLabel}>{t('moisture')} ({t('live')})</Text>
            </View>

            {/* pH Level (REAL SENSOR DATA) */}
            <TouchableOpacity
              style={styles.sensorCard}
              onPress={() => navigation.navigate('pH Monitor')}
            >
              <View style={[styles.iconBg, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="flask" size={24} color="#8E24AA" />
              </View>
              <Text style={styles.sensorValue}>
                {realPH !== null ? realPH.toFixed(1) : '--'}
              </Text>
              <Text style={styles.sensorLabel}>{t('phLevel')} ({t('live')})</Text>
            </TouchableOpacity>

            {/* Nitrogen (Mock) */}
            <View style={styles.sensorCard}>
              <View style={[styles.iconBg, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="grass" size={24} color="#43A047" />
              </View>
              <Text style={styles.sensorValue}>{soilData.nitrogen}</Text>
              <Text style={styles.sensorLabel}>{t('nitrogen')}</Text>
            </View>

            {/* Phosphorus (Mock) */}
            <View style={styles.sensorCard}>
              <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="flower" size={24} color="#FB8C00" />
              </View>
              <Text style={styles.sensorValue}>{soilData.phosphorus}</Text>
              <Text style={styles.sensorLabel}>{t('phosphorus')}</Text>
            </View>

          </View>

          {/* === SECTION 4: QUICK ACCESS (From File 1) === */}
          <Text style={styles.sectionTitle}>{t('quickAccess')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Scan')}>
              <LinearGradient colors={['#29B6F6', '#0288D1']} style={styles.quickIcon}>
                <Ionicons name="camera" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickText}>{t('scanCrop')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Monitor')}>
              <LinearGradient colors={['#FFA726', '#F57C00']} style={styles.quickIcon}>
                <Ionicons name="analytics" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickText}>{t('analytics')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Settings')}>
              <LinearGradient colors={['#78909C', '#455A64']} style={styles.quickIcon}>
                <Ionicons name="settings" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickText}>{t('settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SensorPlanner')}>
              <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.quickIcon}>
                <Ionicons name="grid-outline" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickText}>{t('planSensors')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Schemes')}>
              <LinearGradient colors={['#FBC02D', '#F57F17']} style={styles.quickIcon}>
                <Ionicons name="documents-outline" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickText}>Gov Schemes</Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 5, alignSelf: 'flex-start' },
  location: { color: '#FFF', fontSize: 13, marginLeft: 4, fontWeight: '500' },
  profileCircle: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  profileInitials: { color: colors.primary, fontWeight: 'bold', fontSize: 18 },

  // Weather Widget
  weatherGlass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  weatherLabel: { color: '#E0E0E0', fontSize: 12, marginBottom: 4 },
  temp: { color: '#FFF', fontSize: 38, fontWeight: 'bold' },
  weatherDesc: { color: '#FFF', fontSize: 16, opacity: 0.9 },

  // Content
  bodyContainer: { padding: 20, marginTop: -10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#263238' },

  // Setup Card
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
  setupCard: { alignItems: 'center', padding: 30 },
  setupTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 15, marginBottom: 10 },
  setupText: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  setupButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', gap: 8 },
  setupButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Add Zone Button
  addZoneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, gap: 8, marginBottom: 20 },
  addZoneText: { fontSize: 16, color: colors.primary, fontWeight: '600' },

  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sensorCard: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, alignItems: 'center' },
  iconBg: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  sensorValue: { fontSize: 24, fontWeight: 'bold', color: '#37474F' },
  sensorLabel: { fontSize: 13, color: '#78909C', marginTop: 2, fontWeight: '500' },

  // Quick Actions
  quickScroll: { flexDirection: 'row', marginTop: 5 },
  quickBtn: { alignItems: 'center', marginRight: 20 },
  quickIcon: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 3 },
  quickText: { color: '#546E7A', fontSize: 12, fontWeight: '600' },

  // Yield Impact Card
  yieldCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20
  },
  yieldMetricsContainer: {
    marginBottom: 16,
  },
  yieldMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  yieldMetricLabel: {
    fontSize: 14,
    color: '#78909C',
    fontWeight: '500',
  },
  yieldMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#37474F',
  },
  yieldReasonText: {
    fontSize: 12,
    color: '#90A4AE',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  yieldFooterNote: {
    fontSize: 11,
    color: '#90A4AE',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});