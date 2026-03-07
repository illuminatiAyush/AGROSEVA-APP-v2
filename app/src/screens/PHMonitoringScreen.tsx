// src/screens/PHMonitoringScreen.tsx
// Displays real-time pH sensor readings with Modern UI

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Keep your existing Logic imports
import { usePHStore } from '../store/usePHStore';
import { getPHStatus } from '../models/PHData';
import { colors } from '../theme/colors';
import { formatDate, formatTime } from '../utils/formatters';
import { useTranslation } from '../utils/i18n';

const { width } = Dimensions.get('window');

export default function PHMonitoringScreen() {
  const navigation = useNavigation();
  const t = useTranslation();

  // --- EXISTING LOGIC (UNTOUCHED) ---
  const { pH, timestamp, status, error, source, fetchPH, startPolling, stopPolling } = usePHStore();

  useEffect(() => {
    // Start polling pH every 2 seconds for live updates
    const cleanup = startPolling();

    // Cleanup: stop polling when component unmounts
    return () => {
      cleanup();
    };
  }, [startPolling]);

  const phStatus = pH !== null ? getPHStatus(pH) : null;

  const getStatusColor = () => {
    if (!phStatus) return '#B0BEC5'; // Grey default
    switch (phStatus) {
      case 'acidic': return '#FF5252'; // Red
      case 'optimal': return '#66BB6A'; // Green
      case 'alkaline': return '#42A5F5'; // Blue
      default: return '#B0BEC5';
    }
  };

  const getStatusLabel = () => {
    if (!phStatus) return t('waitingForData');
    switch (phStatus) {
      case 'acidic': return `${t('acidic')} Soil (< 6.0)`;
      case 'optimal': return `${t('ideal')} Soil (6.0 - 7.5)`;
      case 'alkaline': return `${t('alkaline')} Soil (> 7.5)`;
      default: return t('unknown');
    }
  };

  const getLastUpdated = () => {
    if (!timestamp) return t('updatedNever');
    const date = new Date(timestamp);
    return `${formatTime(date)}, ${formatDate(date)}`;
  };
  // --- LOGIC ENDS ---

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={status === 'loading'} onRefresh={fetchPH} tintColor="#FFF" />
        }
      >
        {/* === HEADER (Matches Dashboard) === */}
        <LinearGradient colors={[colors.primary, '#004D40']} style={styles.header}>

          {/* Back Button & Title */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('phAnalysis')}</Text>
            <TouchableOpacity onPress={fetchPH} style={styles.refreshIcon}>
              <Ionicons name="refresh" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Hero Sensor Value */}
          <View style={styles.heroSection}>
            <View style={[styles.circleRing, { borderColor: getStatusColor() }]}>
              <View style={styles.circleInner}>
                {status === 'loading' && pH === null ? (
                  <Text style={styles.loadingText}>...</Text>
                ) : (
                  <Text style={[styles.heroValue, { color: getStatusColor() }]}>
                    {pH !== null ? pH.toFixed(1) : '--'}
                  </Text>
                )}
                <Text style={styles.heroUnit}>{t('phLevel')}</Text>
              </View>
            </View>

            {/* Status Pill */}
            <View style={[styles.statusPill, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusPillText}>{getStatusLabel()}</Text>
            </View>

            {/* Glassmorphism Time Badge */}
            <View style={styles.glassBadge}>
              <Ionicons name="time-outline" size={14} color="#E0E0E0" />
              <Text style={styles.glassText}>{t('updatedLabel')}: {getLastUpdated()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* === BODY CONTENT === */}
        <View style={styles.body}>

          {/* Error Message */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={24} color="#C62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Reference Chart (Visual) */}
          <Text style={styles.sectionTitle}>{t('phReferenceScale')}</Text>
          <View style={styles.card}>
            <View style={styles.scaleContainer}>
              <View style={[styles.scalePart, { backgroundColor: '#FF5252', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }]}>
                <Text style={styles.scaleLabel}>{t('acidic')}</Text>
                <Text style={styles.scaleVal}>0-6</Text>
              </View>
              <View style={[styles.scalePart, { backgroundColor: '#66BB6A' }]}>
                <Text style={styles.scaleLabel}>{t('ideal')}</Text>
                <Text style={styles.scaleVal}>6-7.5</Text>
              </View>
              <View style={[styles.scalePart, { backgroundColor: '#42A5F5', borderTopRightRadius: 10, borderBottomRightRadius: 10 }]}>
                <Text style={styles.scaleLabel}>{t('alkaline')}</Text>
                <Text style={styles.scaleVal}>7.5+</Text>
              </View>
            </View>

            {/* Indicator Arrow */}
            {pH !== null && (
              <View style={{
                position: 'absolute',
                top: 45,
                left: `${Math.min(Math.max((pH / 14) * 100, 5), 95)}%`, // Clamp position
                alignItems: 'center'
              }}>
                <Ionicons name="caret-up" size={24} color="#333" />
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{t('current')}</Text>
              </View>
            )}
          </View>

          {/* Sensor Details (Bento Grid Style) */}
          <Text style={styles.sectionTitle}>{t('sensorDiagnostics')}</Text>
          <View style={styles.grid}>

            {/* Connection Type */}
            <View style={styles.gridItem}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name={source === 'hardware' ? "wifi-check" : "test-tube"} size={24} color="#1565C0" />
              </View>
              <View>
                <Text style={styles.gridLabel}>{t('dataSource')}</Text>
                <Text style={styles.gridValue}>{source === 'hardware' ? t('liveSensor') : t('simulation')}</Text>
              </View>
            </View>

            {/* Battery / Status */}
            <View style={styles.gridItem}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#2E7D32" />
              </View>
              <View>
                <Text style={styles.gridLabel}>{t('sensorStatus')}</Text>
                <Text style={styles.gridValue}>{status === 'loading' ? t('syncing') : t('active')}</Text>
              </View>
            </View>

          </View>

          {/* Recommendation Card */}
          <Text style={styles.sectionTitle}>{t('actionRequired')}</Text>
          <View style={[styles.card, { borderLeftWidth: 5, borderLeftColor: getStatusColor() }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="sprout" size={32} color={getStatusColor()} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.recTitle}>
                  {phStatus === 'acidic' ? t('addLime') :
                    phStatus === 'alkaline' ? t('addGypsum') :
                      t('maintainState')}
                </Text>
                <Text style={styles.recDesc}>
                  {phStatus === 'acidic' ? t('acidicDesc') :
                    phStatus === 'alkaline' ? t('alkalineDesc') :
                      t('optimalPhDesc')}
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' }, // Light Grey Background

  // Header
  header: { paddingTop: 50, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  navBar: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  refreshIcon: { padding: 8 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  heroSection: { alignItems: 'center', width: '100%' },
  circleRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', elevation: 10 },
  circleInner: { alignItems: 'center', justifyContent: 'center' },
  heroValue: { fontSize: 48, fontWeight: 'bold' },
  heroUnit: { fontSize: 16, color: '#90A4AE', marginTop: -5 },
  loadingText: { fontSize: 24, color: '#CCC' },

  statusPill: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, elevation: 3 },
  statusPillText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  glassBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  glassText: { color: '#E0E0E0', fontSize: 12, marginLeft: 6 },

  // Body
  body: { padding: 20, marginTop: -20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F', marginBottom: 12, marginTop: 10 },

  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 20, elevation: 2 },
  errorCard: { flexDirection: 'row', backgroundColor: '#FFEBEE', padding: 15, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  errorText: { color: '#C62828', marginLeft: 10, flex: 1 },

  // Scale
  scaleContainer: { flexDirection: 'row', height: 40, borderRadius: 10, overflow: 'hidden' },
  scalePart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scaleLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' },
  scaleVal: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  // Grid
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  gridItem: { flexDirection: 'row', backgroundColor: '#FFF', width: '48%', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gridLabel: { color: '#90A4AE', fontSize: 12 },
  gridValue: { color: '#37474F', fontSize: 14, fontWeight: 'bold' },

  // Recommendation
  recTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  recDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
});