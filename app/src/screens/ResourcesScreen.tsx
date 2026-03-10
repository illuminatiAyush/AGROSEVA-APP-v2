// src/screens/ResourcesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { useTranslation } from '@/utils/i18n';
import { usePumpStore, DEFAULT_PUMP_CONFIG } from '@/store/usePumpStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import {
  generateAndSharePDF,
  calcCostSavingsRs,
  getWeeklyAnalytics,
  WeeklyAnalytics,
  PumpConfig
} from '@/services/analyticsService';

const screenWidth = Dimensions.get('window').width;

export default function ResourcesScreen({ navigation }: any) {
  const t = useTranslation();

  // Pump store
  const { isOn, config, isLoading, loadConfig, saveConfig, toggleRelay } = usePumpStore();

  // Current app language (used for PDF localisation)
  const language = useLanguageStore((state) => state.language);

  // Modal visibility
  const [pumpModalVisible, setPumpModalVisible] = useState(false);

  // Local draft of config while modal is open
  const [draftConfig, setDraftConfig] = useState<PumpConfig>(DEFAULT_PUMP_CONFIG);

  // Track whether a manual pump event was triggered this session (for chart update)
  const [manualTriggerVolume, setManualTriggerVolume] = useState<number | null>(null);

  // Export loading
  const [isExporting, setIsExporting] = useState(false);

  // Weekly stats state
  const [stats, setStats] = useState<WeeklyAnalytics | null>(null);

  // Load persisted config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Update stats whenever config or manual trigger changes
  useEffect(() => {
    const analytics = getWeeklyAnalytics(config);

    // Inject manual volume if it exists
    if (manualTriggerVolume !== null) {
      analytics.weeklyUsageL += manualTriggerVolume;
      const lastIdx = analytics.chartData.usage.length - 1;
      if (lastIdx >= 0) {
        analytics.chartData.usage[lastIdx] += manualTriggerVolume;
      }
    }

    setStats(analytics);
  }, [config, manualTriggerVolume]);

  // Sync draft when modal opens
  const openPumpModal = () => {
    setDraftConfig({ ...config });
    setPumpModalVisible(true);
  };

  // === Calculated values from live config ===
  const rainDays = stats?.rainSkippedDays ?? 0;
  const estimatedCostSavings = calcCostSavingsRs(config, rainDays);
  // Average cost per 40-min session
  const sessionCostRs = parseFloat(
    (config.pumpPowerHp * 0.746 * (40 / 60) * config.energyCostPerKwh).toFixed(2)
  );

  // === Chart Data ===
  const chartData = {
    labels: stats?.chartData.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: stats?.chartData.usage || [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: stats?.chartData.limits || [60, 60, 60, 60, 60, 60, 60],
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 2,
        withDots: false,
      },
    ],
    legend: [t('waterUsed'), t('dailyLimit')],
  };

  // === Handlers ===

  const handleRelayToggle = async (newValue: boolean) => {
    const confirmKey = newValue ? 'confirmPumpOn' : 'confirmPumpOff';
    Alert.alert(
      newValue ? t('pumpOn') : t('pumpOff'),
      t(confirmKey),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Yes',
          style: newValue ? 'default' : 'destructive',
          onPress: async () => {
            const success = await toggleRelay(newValue);
            if (!success) {
              Alert.alert('⚠️ Error', t('controllerOffline'));
            } else if (newValue) {
              // Chart update: inject the estimated pump volume for today
              const pumpedVolume = Math.round(config.flowRateLpm * 40);
              setManualTriggerVolume(pumpedVolume);
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    const hp = parseFloat(draftConfig.pumpPowerHp.toString());
    const lpm = parseFloat(draftConfig.flowRateLpm.toString());
    const cost = parseFloat(draftConfig.energyCostPerKwh.toString());

    if (isNaN(hp) || hp <= 0 || isNaN(lpm) || lpm <= 0 || isNaN(cost) || cost <= 0) {
      Alert.alert('⚠️ Invalid Input', 'Please enter valid positive numbers for all fields.');
      return;
    }

    await saveConfig({ pumpPowerHp: hp, flowRateLpm: lpm, energyCostPerKwh: cost });
    setPumpModalVisible(false);
    Alert.alert('✅', t('settingsSaved'));
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const success = await generateAndSharePDF(config, language);
      if (!success) {
        Alert.alert('⚠️ Error', t('exportFailed'));
      }
    } catch (e) {
      Alert.alert('⚠️ Error', t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
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
            <Text style={styles.cardValue}>{stats?.weeklyUsageL || 0} L</Text>
            <Text style={styles.cardLabel}>{t('weeklyUsage')}</Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="leaf" size={28} color="#43A047" />
            </View>
            <Text style={styles.cardValue}>{stats?.savedVsAvgPct || 0}%</Text>
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
            data={chartData}
            width={screenWidth - 60}
            height={220}
            yAxisSuffix=" L"
            chartConfig={{
              backgroundColor: '#FFF',
              backgroundGradientFrom: '#FFF',
              backgroundGradientTo: '#FFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '5', strokeWidth: '2', stroke: '#2196F3' },
              propsForBackgroundLines: { strokeDasharray: '' },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />

          {/* Pump ON indicator */}
          {isOn && (
            <View style={styles.pumpActiveBar}>
              <MaterialCommunityIcons name="engine" size={16} color="#FFF" />
              <Text style={styles.pumpActiveText}>{t('pumpRunningMsg')}</Text>
            </View>
          )}
        </View>

        {/* === COST ANALYSIS (Insight) === */}
        <Text style={styles.sectionTitle}>{t('smartInsights')}</Text>
        <View style={styles.insightBox}>
          <View style={styles.insightHeader}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FBC02D" />
            <Text style={styles.insightTitle}>{t('costSavings')}</Text>
          </View>
          <Text style={styles.insightText}>
            {stats && stats.rainSkippedDays > 0
              ? t('skippedIrrigationMsg', { day: stats.firstSkippedDay, amount: estimatedCostSavings })
              : t('noRainSkippedMsg')}
          </Text>
          <View style={styles.insightFooter}>
            <View style={styles.insightMetric}>
              <MaterialCommunityIcons name="water-pump" size={14} color="#795548" />
              <Text style={styles.insightMetricText}>
                {config.flowRateLpm} L/min · {config.pumpPowerHp} HP
              </Text>
            </View>
            <View style={styles.insightMetric}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#795548" />
              <Text style={styles.insightMetricText}>₹{sessionCostRs}/session</Text>
            </View>
          </View>
        </View>

        {/* === ACTION ITEMS === */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openPumpModal}>
            <Ionicons name="settings-outline" size={20} color="#555" />
            <Text style={styles.actionText}>{t('pumpSettings')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isExporting && styles.actionBtnDisabled]}
            onPress={handleExportReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#555" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#555" />
            )}
            <Text style={styles.actionText}>{t('exportReport')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* =============================================
          PUMP SETTINGS MODAL
      ============================================= */}
      <Modal
        visible={pumpModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPumpModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleBar} />
              <Text style={styles.modalTitle}>{t('pumpSettings')}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPumpModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Manual Override Row */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('manualOverride')}</Text>
              <View style={styles.relayRow}>
                <View style={styles.relayInfo}>
                  <View style={[styles.relayStatusDot, { backgroundColor: isOn ? '#4CAF50' : '#F44336' }]} />
                  <Text style={styles.relayLabel}>
                    {isOn ? t('pumpOn') : t('pumpOff')}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={isOn}
                    onValueChange={handleRelayToggle}
                    trackColor={{ false: '#ccc', true: '#A5D6A7' }}
                    thumbColor={isOn ? '#2E7D32' : '#9E9E9E'}
                  />
                )}
              </View>
              <Text style={styles.relayHint}>
                Tap toggle → confirm → API call to /relay/on or /relay/off
              </Text>
            </View>

            <View style={styles.modalDivider} />

            {/* Config Inputs */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Configuration</Text>

              <Text style={styles.inputLabel}>{t('pumpPowerHp')}</Text>
              <TextInput
                style={styles.input}
                value={draftConfig.pumpPowerHp.toString()}
                onChangeText={(v) =>
                  setDraftConfig((d) => ({ ...d, pumpPowerHp: v as any }))
                }
                keyboardType="numeric"
                placeholder="e.g. 1"
                placeholderTextColor="#BDBDBD"
              />

              <Text style={styles.inputLabel}>{t('flowRateLpm')}</Text>
              <TextInput
                style={styles.input}
                value={draftConfig.flowRateLpm.toString()}
                onChangeText={(v) =>
                  setDraftConfig((d) => ({ ...d, flowRateLpm: v as any }))
                }
                keyboardType="numeric"
                placeholder="e.g. 30"
                placeholderTextColor="#BDBDBD"
              />

              <Text style={styles.inputLabel}>{t('energyCostLabel')}</Text>
              <TextInput
                style={styles.input}
                value={draftConfig.energyCostPerKwh.toString()}
                onChangeText={(v) =>
                  setDraftConfig((d) => ({ ...d, energyCostPerKwh: v as any }))
                }
                keyboardType="numeric"
                placeholder="e.g. 8"
                placeholderTextColor="#BDBDBD"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
              <LinearGradient
                colors={[colors.primary, '#00695C']}
                style={styles.saveBtnGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>{t('saveSettings')}</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { color: '#E0F2F1', fontSize: 13, textAlign: 'center', opacity: 0.9 },

  content: { padding: 20, paddingBottom: 50 },

  // Summary Cards
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  cardLabel: { fontSize: 13, color: '#90A4AE', marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 10,
    paddingBottom: 10,
    elevation: 4,
    marginBottom: 25,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#37474F', marginBottom: 10 },
  badge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },

  // Pump active bar
  pumpActiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  pumpActiveText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Insight
  insightBox: {
    backgroundColor: '#FFF8E1',
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#FBC02D',
    marginBottom: 25,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#F57F17', marginLeft: 10 },
  insightText: { color: '#5D4037', lineHeight: 22, fontSize: 14, marginBottom: 12 },
  insightFooter: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  insightMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  insightMetricText: { fontSize: 12, color: '#795548', fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '48%',
    justifyContent: 'center',
    elevation: 2,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionText: { marginLeft: 8, fontWeight: '600', color: '#555' },

  // ============ MODAL ============
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238' },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 22,
    padding: 6,
  },

  modalSection: { paddingHorizontal: 24, paddingTop: 20 },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#90A4AE',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Relay row
  relayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  relayInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  relayStatusDot: { width: 10, height: 10, borderRadius: 5 },
  relayLabel: { fontSize: 16, fontWeight: '600', color: '#37474F' },
  relayHint: { fontSize: 11, color: '#BDBDBD', marginBottom: 4 },

  modalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 24,
    marginTop: 20,
  },

  // Config inputs
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },

  // Save button
  saveBtn: { marginHorizontal: 24, marginTop: 28, borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});