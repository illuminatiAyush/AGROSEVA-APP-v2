// src/screens/ResourceTrackingScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/colors';

const screenWidth = Dimensions.get('window').width;

export const ResourceTrackingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Water');

  // --- MOCK DATA ---
  
  // Water Usage Data
  const waterData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [450, 500, 400, 300, 0, 200, 450], // Liters used (0 on Fri due to rain)
        color: (opacity = 1) => `rgba(41, 182, 246, ${opacity})`, // Blue Line
        strokeWidth: 3
      },
      {
        data: [600, 600, 600, 600, 600, 600, 600], // Daily Limit
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red Line (Limit)
        strokeWidth: 2,
        withDots: false
      }
    ],
    legend: ["Used (L)", "Limit"]
  };

  // Fertilizer Data (Applied vs Recommended)
  const fertilizerData = {
    labels: ["N", "P", "K"], // Nitrogen, Phosphorus, Potassium
    datasets: [
      {
        data: [80, 45, 30] // Kg applied
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
          <Text style={styles.headerTitle}>Resource Tracker</Text>
          <TouchableOpacity>
             <Ionicons name="download-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Usage Analytics & Soil Balance</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>

        {/* === TAB SWITCHER === */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Water' && styles.activeTab]} 
              onPress={() => setActiveTab('Water')}
            >
                <Text style={[styles.tabText, activeTab === 'Water' && styles.activeTabText]}>Water Usage</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'Fertilizer' && styles.activeTab]} 
              onPress={() => setActiveTab('Fertilizer')}
            >
                <Text style={[styles.tabText, activeTab === 'Fertilizer' && styles.activeTabText]}>Fertilizer & Soil</Text>
            </TouchableOpacity>
        </View>

        {/* === WATER TRACKING VIEW === */}
        {activeTab === 'Water' && (
          <>
            {/* Summary Cards */}
            <View style={styles.grid}>
              <View style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: '#E1F5FE' }]}>
                  <Ionicons name="water" size={28} color="#0288D1" />
                </View>
                <Text style={styles.cardValue}>2,300 L</Text>
                <Text style={styles.cardLabel}>Total this Week</Text>
              </View>

              <View style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="trending-down" size={28} color="#2E7D32" />
                </View>
                <Text style={styles.cardValue}>-15%</Text>
                <Text style={styles.cardLabel}>Below Limit</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Daily Irrigation (Liters)</Text>
              <LineChart
                data={waterData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>

            {/* Efficiency Tip */}
            <View style={styles.insightBox}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FBC02D" />
              <Text style={styles.insightText}>
                <Text style={{fontWeight: 'bold'}}>Rain Alert:</Text> Irrigation was auto-skipped on Friday, saving approx 300 Liters.
              </Text>
            </View>
          </>
        )}

        {/* === FERTILIZER & SOIL VIEW === */}
        {activeTab === 'Fertilizer' && (
          <>
            {/* Soil Balance Score */}
            <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                    <Text style={styles.sectionTitle}>Soil Nutrient Balance</Text>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>Good</Text>
                    </View>
                </View>
                
                {/* Visual Bars for NPK */}
                <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientLabel}>Nitrogen (N)</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '80%', backgroundColor: '#43A047' }]} />
                    </View>
                    <Text style={styles.nutrientVal}>Optimal</Text>
                </View>
                
                <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientLabel}>Phosphorus (P)</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '40%', backgroundColor: '#FBC02D' }]} />
                    </View>
                    <Text style={styles.nutrientVal}>Low</Text>
                </View>

                <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientLabel}>Potassium (K)</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '60%', backgroundColor: '#8D6E63' }]} />
                    </View>
                    <Text style={styles.nutrientVal}>Ok</Text>
                </View>
            </View>

            {/* Fertilizer Usage Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Fertilizer Applied (Kg)</Text>
              <BarChart
                data={fertilizerData}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix=" kg"
                chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(123, 31, 162, ${opacity})`, // Purple
                }}
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>

             <View style={[styles.insightBox, { backgroundColor: '#F3E5F5', borderLeftColor: '#8E24AA' }]}>
              <MaterialCommunityIcons name="flask" size={24} color="#8E24AA" />
              <Text style={[styles.insightText, { color: '#4A148C' }]}>
                <Text style={{fontWeight: 'bold'}}>Action:</Text> Phosphorus levels are low. Consider adding DAP fertilizer in the next cycle.
              </Text>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
};

// Common Chart Config
const chartConfig = {
  backgroundColor: "#FFF",
  backgroundGradientFrom: "#FFF",
  backgroundGradientTo: "#FFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: "5", strokeWidth: "2", stroke: colors.primary },
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

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 15, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: '#757575', fontWeight: '600' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },

  // Summary Cards
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { width: '48%', backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  cardLabel: { fontSize: 12, color: '#90A4AE', marginTop: 2 },

  // Chart
  chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, elevation: 3, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#37474F', marginBottom: 10 },

  // Insight
  insightBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', padding: 15, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#FBC02D', marginBottom: 20 },
  insightText: { flex: 1, marginLeft: 10, color: '#5D4037', lineHeight: 20, fontSize: 13 },

  // Soil Balance
  balanceCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, marginBottom: 20 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  scoreBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scoreText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  
  nutrientRow: { marginBottom: 15 },
  nutrientLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  progressBarBg: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, marginBottom: 5 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  nutrientVal: { fontSize: 12, color: '#999', alignSelf: 'flex-end' },
});