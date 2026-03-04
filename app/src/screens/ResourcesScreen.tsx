// src/screens/ResourcesScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';

const screenWidth = Dimensions.get('window').width;

export default function ResourcesScreen({ navigation }: any) {
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState('Weekly');

  // Chart Data
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [45, 50, 40, 30, 80, 20, 45], // Usage
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
        strokeWidth: 3
      },
      {
        data: [60, 60, 60, 60, 60, 60, 60], // Limit
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red
        strokeWidth: 2,
        withDots: false
      }
    ],
    legend: ["Water Used", "Daily Limit"]
  };

  return (
    <View style={styles.container}>
      
      {/* === HEADER === */}
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('resourceEfficiency')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>{t('waterEnergyAnalytics')}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>

        {/* === SUMMARY CARDS === */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="water" size={28} color="#1E88E5" />
            </View>
            <Text style={styles.cardValue}>310 L</Text>
            <Text style={styles.cardLabel}>{t('weeklyUsage')}</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={28} color="#43A047" />
            </View>
            <Text style={styles.cardValue}>12%</Text>
            <Text style={styles.cardLabel}>{t('savedVsAvg')}</Text>
          </View>
        </View>

        {/* === CHART SECTION === */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>{t('irrigationCycle')}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('weekly')}</Text>
            </View>
          </View>
          
          <LineChart
            data={data}
            width={screenWidth - 60} // Adjusted for padding
            height={220}
            yAxisSuffix=" L"
            chartConfig={{
              backgroundColor: "#FFF",
              backgroundGradientFrom: "#FFF",
              backgroundGradientTo: "#FFF",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#2196F3" },
              propsForBackgroundLines: { strokeDasharray: "" } // Solid grid lines
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>

        {/* === COST ANALYSIS (Insight) === */}
        <Text style={styles.sectionTitle}>{t('smartInsights')}</Text>
        <View style={styles.insightBox}>
          <View style={styles.insightHeader}>
             <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FBC02D" />
             <Text style={styles.insightTitle}>{t('costSavings')}</Text>
          </View>
          <Text style={styles.insightText}>
            You skipped irrigation on <Text style={{fontWeight: 'bold'}}>Friday</Text> due to rain. 
            This saved approximately <Text style={{fontWeight: 'bold', color: '#2E7D32'}}>₹450</Text> in electricity and pump costs.
          </Text>
        </View>

        {/* === ACTION ITEMS === */}
        <View style={styles.actionRow}>
           <TouchableOpacity style={styles.actionBtn}>
             <Ionicons name="settings-outline" size={20} color="#555" />
             <Text style={styles.actionText}>{t('pumpSettings')}</Text>
           </TouchableOpacity>
           
           <TouchableOpacity style={styles.actionBtn}>
             <Ionicons name="download-outline" size={20} color="#555" />
             <Text style={styles.actionText}>{t('exportReport')}</Text>
           </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { color: '#E0F2F1', fontSize: 13, textAlign: 'center', opacity: 0.9 },

  content: { padding: 20, paddingBottom: 50 },

  // Summary Cards
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { width: '48%', backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  cardLabel: { fontSize: 13, color: '#90A4AE', marginTop: 2 },

  // Chart
  chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, paddingBottom: 0, elevation: 4, marginBottom: 25 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F' },
  badge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },

  // Insight
  insightBox: { backgroundColor: '#FFF8E1', padding: 20, borderRadius: 15, borderLeftWidth: 5, borderLeftColor: '#FBC02D', marginBottom: 25 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#F57F17', marginLeft: 10 },
  insightText: { color: '#5D4037', lineHeight: 22, fontSize: 14 },

  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 15, alignItems: 'center', width: '48%', justifyContent: 'center', elevation: 2 },
  actionText: { marginLeft: 8, fontWeight: '600', color: '#555' },
});