// src/screens/SoilMonitoringScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

// Stores
import { useStore } from '@/store/useStore';     // NPK data only
import { usePHStore } from '@/store/usePHStore'; // Real Data (pH)
import { useMoistureStore } from '@/store/useMoistureStore'; // Real Data (Moisture)
import { colors } from '@/theme/colors';

const screenWidth = Dimensions.get('window').width;

export const SoilMonitoringScreen: React.FC = () => {
  const navigation = useNavigation();
  const { soilData } = useStore(); // NPK only
  const { pH: realPH, fetchPH, startPolling: startPHPolling, stopPolling: stopPHPolling } = usePHStore();
  const { moisture: realMoisture, startPolling, stopPolling } = useMoistureStore();

  useEffect(() => {
    // Start polling moisture every 2 seconds
    const cleanupMoisture = startPolling();
    
    // Start polling pH every 2 seconds
    const cleanupPH = startPHPolling();
    
    return () => {
      cleanupMoisture();
      cleanupPH();
    };
  }, [startPolling, startPHPolling]);

  // Calculate Soil Health Score (using real sensor data)
  const calculateScore = () => {
    let score = 70; // Base score
    const currentMoisture = realMoisture ?? 0;
    if (currentMoisture > 40 && currentMoisture < 80) score += 10;
    if (realPH && realPH > 6 && realPH < 7.5) score += 10;
    if (soilData.nitrogen > 100) score += 10;
    return score;
  };

  const healthScore = calculateScore();

  // Moisture History Data (using real moisture value)
  // Note: For full history, you'd need to store historical data from backend
  const currentMoisture = realMoisture ?? 0;
  const moistureHistory = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        // Use current real moisture for today, previous days would come from backend history
        data: [currentMoisture - 5, currentMoisture - 3, currentMoisture - 1, currentMoisture + 1, currentMoisture - 2, currentMoisture + 3, currentMoisture],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
        strokeWidth: 3
      }
    ]
  };

  return (
    <View style={styles.container}>
      
      {/* === HEADER === */}
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Soil Analysis</Text>
          <TouchableOpacity onPress={fetchPH}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Real-time Nutrient & Health Report</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>

        {/* === HEALTH SCORE CARD === */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>Overall Soil Health</Text>
            <Text style={styles.scoreValue}>{healthScore}%</Text>
            <Text style={styles.scoreStatus}>
              {healthScore > 80 ? 'Excellent' : healthScore > 50 ? 'Average' : 'Poor'}
            </Text>
          </View>
          <View style={styles.scoreRight}>
             {/* Simple visual ring representation */}
             <View style={[styles.ring, { borderColor: healthScore > 80 ? '#43A047' : '#FBC02D' }]}>
                <MaterialCommunityIcons name="sprout" size={40} color={colors.primary} />
             </View>
          </View>
        </View>

        {/* === KEY METRICS (Real pH + Mock Moisture) === */}
        <View style={styles.grid}>
          {/* pH Card */}
          <View style={[styles.metricCard, { backgroundColor: '#F3E5F5' }]}>
            <View style={styles.metricHeader}>
               <Ionicons name="flask" size={24} color="#8E24AA" />
               <Text style={[styles.metricTitle, { color: '#8E24AA' }]}>pH Level</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#4A148C' }]}>
              {realPH !== null ? realPH.toFixed(1) : '--'}
            </Text>
            <Text style={styles.metricSub}>Live Sensor Data</Text>
          </View>

          {/* Moisture Card */}
          <View style={[styles.metricCard, { backgroundColor: '#E1F5FE' }]}>
            <View style={styles.metricHeader}>
               <Ionicons name="water" size={24} color="#0288D1" />
               <Text style={[styles.metricTitle, { color: '#0288D1' }]}>Moisture</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#01579B' }]}>
              {realMoisture !== null ? `${realMoisture.toFixed(1)}%` : '--'}
            </Text>
            <Text style={styles.metricSub}>Live Sensor Data</Text>
          </View>
        </View>

        {/* === NPK NUTRIENT BREAKDOWN === */}
        <Text style={styles.sectionTitle}>Macronutrients (NPK)</Text>
        <View style={styles.nutrientCard}>
          
          {/* Nitrogen */}
          <View style={styles.nutrientRow}>
            <View style={styles.nutrientInfo}>
              <Text style={styles.nLabel}>Nitrogen (N)</Text>
              <Text style={styles.nValue}>{soilData.nitrogen} mg/kg</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(soilData.nitrogen / 2, 100)}%`, backgroundColor: '#43A047' }]} />
            </View>
            <Text style={styles.nStatus}>Good</Text>
          </View>

          <View style={styles.divider} />

          {/* Phosphorus */}
          <View style={styles.nutrientRow}>
            <View style={styles.nutrientInfo}>
              <Text style={styles.nLabel}>Phosphorus (P)</Text>
              <Text style={styles.nValue}>{soilData.phosphorus} mg/kg</Text>
            </View>
            <View style={styles.barBg}>
               <View style={[styles.barFill, { width: `${Math.min(soilData.phosphorus, 100)}%`, backgroundColor: '#FBC02D' }]} />
            </View>
            <Text style={styles.nStatus}>Low</Text>
          </View>

          <View style={styles.divider} />

          {/* Potassium */}
          <View style={styles.nutrientRow}>
            <View style={styles.nutrientInfo}>
              <Text style={styles.nLabel}>Potassium (K)</Text>
              <Text style={styles.nValue}>{soilData.potassium} mg/kg</Text>
            </View>
            <View style={styles.barBg}>
               <View style={[styles.barFill, { width: `${Math.min(soilData.potassium / 3, 100)}%`, backgroundColor: '#8D6E63' }]} />
            </View>
            <Text style={styles.nStatus}>High</Text>
          </View>

        </View>

        {/* === MOISTURE HISTORY CHART === */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Moisture Retention (7 Days)</Text>
          <LineChart
            data={moistureHistory}
            width={screenWidth - 40}
            height={200}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: "#FFF",
              backgroundGradientFrom: "#FFF",
              backgroundGradientTo: "#FFF",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#1976D2" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { color: '#E0F2F1', fontSize: 13, textAlign: 'center', opacity: 0.9 },

  content: { padding: 20, paddingBottom: 50 },

  // Health Score
  scoreCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 4, marginBottom: 20, alignItems: 'center' },
  scoreLeft: { flex: 1 },
  scoreLabel: { color: '#757575', fontSize: 14, fontWeight: '600' },
  scoreValue: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32', marginVertical: 2 },
  scoreStatus: { fontSize: 14, color: '#43A047', fontWeight: 'bold', backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  
  scoreRight: { justifyContent: 'center', alignItems: 'center' },
  ring: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, justifyContent: 'center', alignItems: 'center', borderColor: '#E0E0E0' },

  // Metric Grid
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { width: '48%', padding: 15, borderRadius: 16, elevation: 2 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metricTitle: { fontWeight: 'bold', marginLeft: 8 },
  metricValue: { fontSize: 28, fontWeight: 'bold' },
  metricSub: { fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 4 },

  // Nutrients
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F', marginBottom: 15, marginTop: 5 },
  nutrientCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, marginBottom: 20 },
  nutrientRow: { marginBottom: 5 },
  nutrientInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  nLabel: { fontWeight: 'bold', color: '#455A64' },
  nValue: { color: '#78909C', fontSize: 12 },
  barBg: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, width: '100%', marginBottom: 5 },
  barFill: { height: '100%', borderRadius: 4 },
  nStatus: { fontSize: 11, color: '#90A4AE', fontStyle: 'italic', alignSelf: 'flex-end' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 10 },

  // Chart
  chartContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, elevation: 3 },
});