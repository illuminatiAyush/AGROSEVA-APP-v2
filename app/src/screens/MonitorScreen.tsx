// src/screens/MonitorScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// STORES
import { useStore } from '../store/useStore';     // Mock Data (NPK)
import { usePHStore } from '../store/usePHStore'; // Real Data (pH)
import { useMoistureStore } from '../store/useMoistureStore'; // Real Data (Moisture from Arduino)
import { useSensorStore } from '../store/useSensorStore';

// SERVICES
import { calculateAdvancedSoilRisk } from '../services/AdvancedSoilRiskService';
import { calculateECRisk } from '../services/ECRiskService';
import { AdvancedSoilRiskCard } from '../components/AdvancedSoilRiskCard';
import { ECRiskCard } from '../components/ECRiskCard';

// THEME & UTILS
import { colors } from '../theme/colors';
import { useTranslation } from '../utils/i18n';

// Progress Bar Component
const ProgressBar = ({ value, max, color }: { value: number, max: number, color: string }) => {
  const width = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
};

// Sensor Card Component
const SensorRow = ({ label, value, unit, max, icon, color, isReal = false }: any) => (
  <View style={styles.card}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
    </View>
    <View style={{ flex: 1, marginHorizontal: 15 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.label}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isReal && <View style={styles.liveDot} />}
          <Text style={[styles.value, { color: color }]}>
            {typeof value === 'number' ? value.toFixed(1) : '--'} 
            <Text style={styles.unit}> {unit}</Text>
          </Text>
        </View>
      </View>
      <ProgressBar value={value || 0} max={max} color={color} />
    </View>
  </View>
);

type TabType = 'Overview' | 'Advanced Soil' | 'Sensors' | 'Risk';

export default function MonitorScreen() {
  const navigation = useNavigation();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  
  // 1. Get Mock Data
  const { soilData, weather: storeWeather } = useStore();
  
  // 2. Get Real pH Data
  const { pH: realPH, fetchPH, startPolling: startPHPolling, stopPolling: stopPHPolling } = usePHStore();
  
  // 3. Get Real Moisture Data (live from Arduino)
  const { moisture: liveMoisture, isLoading: moistureLoading, error: moistureError, startPolling, stopPolling } = useMoistureStore();

  // 4. Get Sensor Data
  const { temperature: sensorTemp, humidity: sensorHumidity } = useSensorStore();

  useEffect(() => {
    // Start polling moisture every 2 seconds
    const cleanupMoisture = startPolling();
    
    // Start polling pH every 2 seconds
    const cleanupPH = startPHPolling();
    
    // Cleanup: stop polling when component unmounts
    return () => {
      cleanupMoisture();
      cleanupPH();
    };
  }, [startPolling, startPHPolling]);

  // Calculate Advanced Soil Risk
  // Weather is optional in MonitorScreen, fallback applied to avoid crash
  const currentTemperature = sensorTemp ?? storeWeather?.temp ?? 29;
  const currentHumidity = sensorHumidity ?? storeWeather?.humidity ?? 60;
  const currentPH = realPH ?? 0; // Use real pH, fallback to 0 if not available
  const currentMoisture = liveMoisture ?? 0; // Use real moisture, fallback to 0 if not available

  const soilRiskResult = calculateAdvancedSoilRisk({
    soilMoisture: currentMoisture,
    temperature: currentTemperature,
    humidity: currentHumidity,
    waterPH: currentPH,
  });

  // Calculate EC Risk Assessment (SEPARATE from Soil Risk)
  const ecRiskResult = calculateECRisk({
    waterPH: currentPH,
    avgSoilMoisture: currentMoisture,
    temperature: currentTemperature,
    humidity: currentHumidity,
  });

  // Tab Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverviewTab();
      case 'Advanced Soil':
        return renderAdvancedSoilTab();
      case 'Sensors':
        return renderSensorsTab();
      case 'Risk':
        return renderRiskTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <>
      {/* === ENVIRONMENT (Weather) === */}
      <Text style={styles.sectionTitle}>{t('environment')}</Text>
      <View style={styles.envContainer}>
        <View style={styles.envCard}>
          <View style={[styles.envIcon, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="thermometer" size={24} color={colors.error} />
          </View>
          <View>
            <Text style={styles.envValue}>{storeWeather?.temp ?? '--'}°C</Text>
            <Text style={styles.envLabel}>{t('temperature')}</Text>
          </View>
        </View>
        
        <View style={styles.envCard}>
          <View style={[styles.envIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="water" size={24} color={colors.water} />
          </View>
          <View>
            <Text style={styles.envValue}>{storeWeather?.humidity ?? '--'}%</Text>
            <Text style={styles.envLabel}>{t('humidity')}</Text>
          </View>
        </View>
      </View>

      {/* === SOIL HEALTH === */}
      <Text style={styles.sectionTitle}>{t('soilHealth')}</Text>
      
      {/* Real pH Data */}
      <SensorRow 
        label={`${t('phLevel')} (${t('live')})`} 
        value={realPH} 
        unit="pH" 
        max={14} 
        icon="flask" 
        color={colors.secondary} 
        isReal={true}
      />

      {/* Live Moisture from Arduino */}
      <SensorRow 
        label={`${t('moisture')} (${t('live')})`} 
        value={liveMoisture} 
        unit="%" 
        max={100} 
        icon="water" 
        color={colors.water} 
        isReal={true}
      />

      {/* === NUTRIENTS (NPK) === */}
      <Text style={styles.sectionTitle}>{t('nutrients')}</Text>

      <SensorRow 
        label={`${t('nitrogen')} (N)`} 
        value={soilData.nitrogen} 
        unit="mg/kg" 
        max={200} 
        icon="leaf" 
        color="#43A047" 
      />
      
      <SensorRow 
        label={`${t('phosphorus')} (P)`} 
        value={soilData.phosphorus} 
        unit="mg/kg" 
        max={100} 
        icon="flower" 
        color="#FBC02D" 
      />
      
      <SensorRow 
        label={`${t('potassium')} (K)`} 
        value={soilData.potassium} 
        unit="mg/kg" 
        max={300} 
        icon="shaker" 
        color="#8D6E63" 
      />
    </>
  );

  const renderAdvancedSoilTab = () => (
    <>
      <AdvancedSoilRiskCard
        riskResult={soilRiskResult}
        sensorValues={{
          moisture: currentMoisture,
          temperature: currentTemperature,
          humidity: currentHumidity,
          pH: currentPH,
        }}
      />
      
      {/* EC Risk Assessment - SEPARATE feature */}
      <ECRiskCard
        ecRiskResult={ecRiskResult}
        sensorValues={{
          waterPH: currentPH,
          avgSoilMoisture: currentMoisture,
          temperature: currentTemperature,
          humidity: currentHumidity,
        }}
        cropInfo={
          // Optional: Add crop info if available from store/context
          // Example: { cropName: 'Rice', cropStage: 'Flowering' }
          undefined
        }
      />
    </>
  );

  const renderSensorsTab = () => (
    <>
      <Text style={styles.sectionTitle}>{t('liveSensorData')}</Text>
      
      <View style={styles.sensorGrid}>
        <View style={styles.sensorTile}>
          <View style={[styles.sensorTileIcon, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="flask" size={28} color="#8E24AA" />
          </View>
          <Text style={styles.sensorTileValue}>
            {currentPH.toFixed(1)}
          </Text>
          <Text style={styles.sensorTileLabel}>pH Level</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('live')}</Text>
          </View>
        </View>

        <View style={styles.sensorTile}>
          <View style={[styles.sensorTileIcon, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="thermometer" size={28} color="#EF5350" />
          </View>
          <Text style={styles.sensorTileValue}>
            {currentTemperature.toFixed(1)}°C
          </Text>
          <Text style={styles.sensorTileLabel}>{t('temperature')}</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('live')}</Text>
          </View>
        </View>

        <View style={styles.sensorTile}>
          <View style={[styles.sensorTileIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="water" size={28} color="#039BE5" />
          </View>
          <Text style={styles.sensorTileValue}>
            {currentHumidity.toFixed(1)}%
          </Text>
          <Text style={styles.sensorTileLabel}>{t('humidity')}</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('live')}</Text>
          </View>
        </View>

        <View style={styles.sensorTile}>
          <View style={[styles.sensorTileIcon, { backgroundColor: '#E0F2F1' }]}>
            <Ionicons name="water" size={28} color="#00897B" />
          </View>
          <Text style={styles.sensorTileValue}>
            {currentMoisture.toFixed(1)}%
          </Text>
          <Text style={styles.sensorTileLabel}>{t('moisture')}</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('live')}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderRiskTab = () => {
    const riskLevel = soilRiskResult.level;
    const riskScore = soilRiskResult.score;
    
    const getRiskColor = () => {
      switch (riskLevel) {
        case 'Healthy': return '#4CAF50';
        case 'Mild Stress': return '#8BC34A';
        case 'High Stress': return '#FF9800';
        case 'Severe Stress': return '#F44336';
        default: return '#757575';
      }
    };

    const getRiskMessage = () => {
      switch (riskLevel) {
        case 'Healthy':
          return t('riskHealthyMessage') || 'Your farm conditions are optimal. Continue monitoring regularly.';
        case 'Mild Stress':
          return t('riskMildMessage') || 'Some parameters need attention. Review recommendations and take preventive action.';
        case 'High Stress':
          return t('riskHighMessage') || 'Multiple stress factors detected. Immediate action recommended to prevent crop damage.';
        case 'Severe Stress':
          return t('riskSevereMessage') || 'Critical conditions detected. Take immediate corrective measures to protect your crops.';
        default:
          return '';
      }
    };

    return (
      <>
        <View style={styles.riskSummaryCard}>
          <View style={styles.riskSummaryHeader}>
            <Ionicons name="shield-checkmark" size={32} color={getRiskColor()} />
            <View style={styles.riskSummaryText}>
              <Text style={styles.riskSummaryTitle}>{t('overallFarmRisk') || 'Overall Farm Risk'}</Text>
              <Text style={[styles.riskSummaryLevel, { color: getRiskColor() }]}>
                {riskLevel}
              </Text>
            </View>
            <View style={[styles.riskScoreBadge, { backgroundColor: getRiskColor() }]}>
              <Text style={styles.riskScoreText}>{riskScore}</Text>
            </View>
          </View>
          
          <Text style={styles.riskMessage}>{getRiskMessage()}</Text>

          <View style={styles.riskFactors}>
            <Text style={styles.riskFactorsTitle}>{t('criticalParameters') || 'Critical Parameters'}</Text>
            {soilRiskResult.reasons.slice(0, 3).map((reason, index) => (
              <View key={index} style={styles.riskFactorItem}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text style={styles.riskFactorText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.riskBreakdownCard}>
          <Text style={styles.sectionTitle}>{t('riskBreakdown') || 'Risk Breakdown'}</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('moistureStress')}</Text>
            <Text style={[styles.breakdownValue, { color: getRiskColor() }]}>
              {soilRiskResult.breakdown.moistureScore}/30
            </Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('heatStress')}</Text>
            <Text style={[styles.breakdownValue, { color: getRiskColor() }]}>
              {soilRiskResult.breakdown.heatScore}/25
            </Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('humidityStress')}</Text>
            <Text style={[styles.breakdownValue, { color: getRiskColor() }]}>
              {soilRiskResult.breakdown.humidityScore}/20
            </Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('phRisk')}</Text>
            <Text style={[styles.breakdownValue, { color: getRiskColor() }]}>
              {soilRiskResult.breakdown.pHScore}/25
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* === HEADER === */}
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('fieldMonitor')}</Text>
          <TouchableOpacity onPress={fetchPH}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subHeader}>{t('sensorId')}: AGRO-X1 • Zone A</Text>
      </LinearGradient>

      {/* === TAB SWITCHER === */}
      <View style={styles.tabContainer}>
        {(['Overview', 'Advanced Soil', 'Sensors', 'Risk'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  
  // Header
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  subHeader: { color: '#E0F2F1', fontSize: 13, opacity: 0.8, marginLeft: 5 },
  backBtn: { padding: 5 },

  // Tab Container
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#90A4AE',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },

  scrollContent: { padding: 20, paddingBottom: 50 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 12, color: '#37474F' },
  
  // Sensor Card
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: '#455A64' },
  value: { fontSize: 16, fontWeight: 'bold' },
  unit: { fontSize: 12, color: '#90A4AE', fontWeight: 'normal' },
  
  progressBg: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, width: '100%' },
  progressFill: { height: '100%', borderRadius: 4 },
  
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Environment
  envContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  envCard: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  envIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  envValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  envLabel: { color: '#90A4AE', fontSize: 12 },

  // Sensor Grid (Sensors Tab)
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorTile: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sensorTileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorTileValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  sensorTileLabel: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '500',
  },

  // Risk Tab
  riskSummaryCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  riskSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskSummaryText: {
    flex: 1,
    marginLeft: 12,
  },
  riskSummaryTitle: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 4,
  },
  riskSummaryLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskScoreBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskScoreText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  riskMessage: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 16,
  },
  riskFactors: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  riskFactorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: 10,
  },
  riskFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  riskFactorText: {
    fontSize: 13,
    color: '#546E7A',
    flex: 1,
  },
  riskBreakdownCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#546E7A',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});