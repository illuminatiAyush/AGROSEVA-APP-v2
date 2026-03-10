// src/screens/RecommendationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { useStore } from '@/store/useStore';
import { usePHStore } from '@/store/usePHStore';
import { useMoistureStore } from '@/store/useMoistureStore';
import { AIDecisionEngine } from '@/services/AIDecisionEngine';

// Get screen width for charts/bars
const { width } = Dimensions.get('window');

export const RecommendationsScreen: React.FC = ({ navigation }: any) => {
  const { soilData, weather } = useStore();
  const { pH: realPH, startPolling: startPHPolling, stopPolling: stopPHPolling } = usePHStore();
  const { moisture: realMoisture, startPolling: startMoisturePolling, stopPolling: stopMoisturePolling } = useMoistureStore();
  const [rec, setRec] = useState<any>(null);

  useEffect(() => {
    // Start polling moisture
    const cleanupMoisture = startMoisturePolling();
    
    // Start polling pH
    const cleanupPH = startPHPolling();
    
    // Get latest analysis (uses real sensor data via AIDecisionEngine)
    const analysis = AIDecisionEngine.analyze();
    setRec(analysis);
    
    return () => {
      cleanupMoisture();
      cleanupPH();
    };
  }, [startMoisturePolling, startPHPolling, realMoisture, realPH]);

  if (!rec) return null;

  // Determine Color Theme based on Action
  const getTheme = () => {
    if (rec.action === 'IRRIGATE') return { color: '#FF5252', icon: 'water-alert', bg: '#FFEBEE' };
    if (rec.action === 'FERTILIZE') return { color: '#AB47BC', icon: 'shaker', bg: '#F3E5F5' };
    if (rec.action === 'WAIT') return { color: '#FFA726', icon: 'clock-alert', bg: '#FFF3E0' };
    return { color: '#66BB6A', icon: 'check-circle', bg: '#E8F5E9' };
  };

  const theme = getTheme();

  return (
    <View style={styles.container}>
      
      {/* === HEADER === */}
      <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Advisory</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Precision Farming Engine</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* === MAIN DECISION CARD === */}
        <View style={[styles.mainCard, { borderTopColor: theme.color }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.bg }]}>
              <MaterialCommunityIcons name={theme.icon as any} size={32} color={theme.color} />
            </View>
            <View>
              <Text style={styles.actionLabel}>Recommended Action</Text>
              <Text style={[styles.actionTitle, { color: theme.color }]}>{rec.action}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{rec.confidence}% AI</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.reasonTitle}>Why this recommendation?</Text>
          <Text style={styles.reasonText}>{rec.reason} {rec.details}</Text>

          {/* DOSAGE CALCULATOR (Mock Logic) */}
          {rec.action === 'IRRIGATE' && (
            <View style={styles.calcBox}>
              <View style={styles.calcRow}>
                <Ionicons name="water" size={20} color="#0288D1" />
                <Text style={styles.calcLabel}>Water Quantity Needed:</Text>
              </View>
              <Text style={styles.calcValue}>~450 Liters / Acre</Text>
              <Text style={styles.calcSub}>Based on 12% soil moisture deficit</Text>
            </View>
          )}

          {rec.action === 'FERTILIZE' && (
            <View style={styles.calcBox}>
              <View style={styles.calcRow}>
                <MaterialCommunityIcons name="flask" size={20} color="#7B1FA2" />
                <Text style={styles.calcLabel}>Recommended NPK Mix:</Text>
              </View>
              <Text style={styles.calcValue}>Urea (45kg) + DAP (20kg)</Text>
              <Text style={styles.calcSub}>To boost Nitrogen levels</Text>
            </View>
          )}
        </View>

        {/* === IMPACT PREDICTION === */}
        <Text style={styles.sectionTitle}>Projected Impact</Text>
        <View style={styles.grid}>
          <View style={styles.impactCard}>
            <Ionicons name="trending-up" size={24} color="#43A047" />
            <Text style={styles.impactValue}>+15%</Text>
            <Text style={styles.impactLabel}>Yield Growth</Text>
          </View>
          <View style={styles.impactCard}>
            <Ionicons name="leaf" size={24} color="#2E7D32" />
            <Text style={styles.impactValue}>Optimal</Text>
            <Text style={styles.impactLabel}>Crop Health</Text>
          </View>
          <View style={styles.impactCard}>
            <Ionicons name="water" size={24} color="#0288D1" />
            <Text style={styles.impactValue}>-20%</Text>
            <Text style={styles.impactLabel}>Water Saved</Text>
          </View>
        </View>

        {/* === UPCOMING SCHEDULE === */}
        <Text style={styles.sectionTitle}>Smart Schedule (Next 3 Days)</Text>
        <View style={styles.scheduleCard}>
          
          {/* Today */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timeText}>Today</Text>
              <Text style={styles.timeSub}>2:00 PM</Text>
            </View>
            <View style={styles.timelineDot}>
              <View style={[styles.dotInner, { backgroundColor: theme.color }]} />
              <View style={styles.line} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.taskTitle}>{rec.action === 'SAFE' ? 'Monitor Soil' : rec.action}</Text>
              <Text style={styles.taskDesc}>Priority: High</Text>
            </View>
          </View>

          {/* Tomorrow */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timeText}>Tmrw</Text>
              <Text style={styles.timeSub}>9:00 AM</Text>
            </View>
            <View style={styles.timelineDot}>
              <View style={[styles.dotInner, { backgroundColor: '#BDBDBD' }]} />
              <View style={styles.line} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.taskTitle}>Pest Inspection</Text>
              <Text style={styles.taskDesc}>Scheduled Scan</Text>
            </View>
          </View>

          {/* Day After */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timeText}>25 Jan</Text>
              <Text style={styles.timeSub}>6:00 PM</Text>
            </View>
            <View style={styles.timelineDot}>
              <View style={[styles.dotInner, { backgroundColor: '#BDBDBD' }]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.taskTitle}>Review Moisture</Text>
              <Text style={styles.taskDesc}>Weekly Report</Text>
            </View>
          </View>

        </View>

        {/* === DISCLAIMER === */}
        <Text style={styles.disclaimer}>
          AI recommendations are based on sensor data. Please verify with physical inspection before applying large quantities of chemicals.
        </Text>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { color: '#E0F2F1', fontSize: 13, textAlign: 'center', opacity: 0.9 },

  content: { padding: 20, paddingBottom: 50 },

  // Main Card
  mainCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderTopWidth: 5, marginBottom: 25 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionLabel: { color: '#757575', fontSize: 12, fontWeight: '600' },
  actionTitle: { fontSize: 20, fontWeight: 'bold' },
  confidenceBadge: { marginLeft: 'auto', backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  confidenceText: { color: '#00695C', fontSize: 12, fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  
  reasonTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  reasonText: { color: '#666', fontSize: 14, lineHeight: 22, marginBottom: 15 },

  // Calculator Box
  calcBox: { backgroundColor: '#FAFAFA', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  calcRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  calcLabel: { marginLeft: 8, fontSize: 14, color: '#555', fontWeight: '600' },
  calcValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
  calcSub: { fontSize: 12, color: '#999', marginTop: 2 },

  // Grid
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F', marginBottom: 15 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  impactCard: { width: '31%', backgroundColor: '#FFF', padding: 15, borderRadius: 15, alignItems: 'center', elevation: 2 },
  impactValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  impactLabel: { fontSize: 11, color: '#90A4AE', textAlign: 'center' },

  // Timeline
  scheduleCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 2 },
  timelineRow: { flexDirection: 'row', marginBottom: 0, height: 70 },
  timelineLeft: { width: 60, alignItems: 'flex-end', paddingRight: 10 },
  timeText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  timeSub: { fontSize: 11, color: '#999' },
  
  timelineDot: { alignItems: 'center', width: 20 },
  dotInner: { width: 12, height: 12, borderRadius: 6, zIndex: 2 },
  line: { width: 2, backgroundColor: '#EEE', height: '100%', position: 'absolute', top: 12, zIndex: 1 },
  
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 20 },
  taskTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  taskDesc: { fontSize: 12, color: '#757575', marginTop: 2 },

  disclaimer: { fontSize: 12, color: '#B0BEC5', textAlign: 'center', marginTop: 20, fontStyle: 'italic', paddingHorizontal: 20 },
});