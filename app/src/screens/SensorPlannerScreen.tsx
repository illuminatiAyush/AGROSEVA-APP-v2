/**
 * Sensor Planner Screen — Blueprint Edition
 *
 * An architectural blueprint-style infinite dot-grid canvas for planning
 * sensor placement per farm zone. Sensors snap to the nearest grid intersection
 * on release, providing a clean, structured layout.
 *
 * KEY DESIGN DECISIONS:
 * - Canvas is OUTSIDE the ScrollView to avoid PanResponder coordinate issues
 * - Sensors are added via TAP (from tray) then freely dragged within the canvas
 * - Snap formula: snapped = round(raw / GRID_STEP) * GRID_STEP
 * - Farm boundary rectangle scales with the "acres" input
 * - All AI calculations (accuracy, cost, verdict) remain 100% untouched
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSensorPlannerStore, InstalledSensor } from '@/store/useSensorPlannerStore';
import { CropType, SensorType, SENSOR_COSTS } from '@/ai/SensorPlanningEngine';
import { colors } from '@/theme/colors';
import { ZONES } from '@/utils/constants';
import { useTranslation } from '@/utils/i18n';

// ─── Layout Constants ───────────────────────────────────────────────────────
const { width, height } = Dimensions.get('window');
const CANVAS_WIDTH = width;
const CANVAS_HEIGHT = height * 0.48;
const GRID_STEP = 30; // px — sensors snap to multiples of this
const SENSOR_RADIUS = 22; // half of sensor dot size
// ACRES_TO_PX removed — boundary box not rendered on canvas (kept clean)

const SENSOR_CONFIGS: Record<SensorType, { icon: string; color: string; label: string }> = {
  Soil: { icon: 'leaf', color: '#2E7D32', label: 'Soil' },
  pH: { icon: 'flask', color: '#6A1B9A', label: 'pH' },
  NPK: { icon: 'analytics', color: '#E65100', label: 'NPK' },
  Moisture: { icon: 'water', color: '#0277BD', label: 'Moisture' },
  Temperature: { icon: 'thermometer', color: '#C62828', label: 'Temp' },
  Arduino: { icon: 'hardware-chip', color: '#00695C', label: 'Arduino' },
  ESP32: { icon: 'wifi', color: '#1565C0', label: 'Wi-Fi Hub' },
};

// ─── Snap Helper ─────────────────────────────────────────────────────────────
const snapToGrid = (value: number, canvasSize: number): number => {
  const snapped = Math.round(value / GRID_STEP) * GRID_STEP;
  return Math.max(SENSOR_RADIUS, Math.min(canvasSize - SENSOR_RADIUS, snapped));
};

// ─── Dot Grid Component ───────────────────────────────────────────────────────
/**
 * Renders a static dot-grid background — blueprint paper feel.
 * Dots are pure Views to avoid SVG dependency.
 */
const DotGrid: React.FC = React.memo(() => {
  const cols = Math.ceil(CANVAS_WIDTH / GRID_STEP) + 1;
  const rows = Math.ceil(CANVAS_HEIGHT / GRID_STEP) + 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }).map((_, rowIdx) =>
        Array.from({ length: cols }).map((_, colIdx) => (
          <View
            key={`${rowIdx}-${colIdx}`}
            style={[
              gridStyles.dot,
              {
                left: colIdx * GRID_STEP - 2,
                top: rowIdx * GRID_STEP - 2,
              },
            ]}
          />
        ))
      )}
    </View>
  );
});

const gridStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0DBE8',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SensorPlannerScreen({ navigation }: any) {
  const {
    zones,
    initializeZone,
    setCropType,
    setArea,
    addSensor,
    removeSensor,
    updateSensorPosition,
    clearZone,
    setActiveZone,
    getZoneState,
    loadFromStorage,
  } = useSensorPlannerStore();

  const t = useTranslation();

  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [areaInput, setAreaInput] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone_1');
  const [showDetails, setShowDetails] = useState(false);

  // ── Step-Gate: AI results only shown after "Next" is pressed ────────────
  // isStepValidated: guards the verdict panel from showing prematurely
  // isCalculating:   shows a 1-second "Syncing..." loader on Next click
  const [isStepValidated, setIsStepValidated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Ghost snap indicator: position of nearest grid intersection during drag
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const ghostAnim = useRef(new Animated.Value(0)).current;

  // Map: sensorId → Animated.ValueXY (persisted across renders)
  const panRefs = useRef<Record<string, Animated.ValueXY>>({});
  // Map: sensorId → PanResponder (persisted to avoid stale closure per render)
  const panResponderRefs = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});

  const zoneState = getZoneState(selectedZoneId);
  const verdict = zoneState?.verdict;

  // ── Farm area (px) — only used for AI input, no visual box ─────────────
  const farmArea = parseFloat(areaInput) || 0;

  // ── Load & init ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      initializeZone(selectedZoneId, ZONES.find(z => z.id === selectedZoneId)?.name || selectedZoneId);
      setActiveZone(selectedZoneId);
      const state = getZoneState(selectedZoneId);
      if (state) {
        setSelectedCrop(state.cropType);
        setAreaInput(state.areaInAcres > 0 ? state.areaInAcres.toString() : '');
      }
      // Switching zones always invalidates the step gate
      setIsStepValidated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId]);

  // When crop OR area changes: clear stale AI results so farmer cannot see
  // outdated recommendations. They must press "Next" again to recalculate.
  useEffect(() => {
    setIsStepValidated(false);
    setShowDetails(false);
    // Still persist the raw values to store so tray/canvas stay in sync
    if (selectedCrop) setCropType(selectedZoneId, selectedCrop);
    if (areaInput) setArea(selectedZoneId, parseFloat(areaInput) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, areaInput]);

  // ── Ghost pulse animation ────────────────────────────────────────────────
  useEffect(() => {
    if (ghostPos) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ghostAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(ghostAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ghostAnim.stopAnimation();
      ghostAnim.setValue(0);
    }
  }, [ghostPos]);

  // ── Next button handler: the EXCLUSIVE trigger for AI calculation ─────────
  // Validates inputs → shows 1-second "Syncing..." loader → calls recalculateVerdict
  const handleNext = useCallback(() => {
    if (!selectedCrop) {
      Alert.alert(t('errorTitle'), t('enterCropName'));
      return;
    }
    const area = parseFloat(areaInput);
    if (!area || area <= 0) {
      Alert.alert(t('errorTitle'), t('enterFarmArea'));
      return;
    }
    // Show loader immediately
    setIsCalculating(true);
    // Wait 1 second, then run AI calculation and show results
    setTimeout(() => {
      // Persist current inputs to store
      setCropType(selectedZoneId, selectedCrop);
      setArea(selectedZoneId, area);
      // Explicitly re-trigger verdict after both values are set
      useSensorPlannerStore.getState().recalculateVerdict(selectedZoneId);
      setIsCalculating(false);
      setIsStepValidated(true);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, areaInput, selectedZoneId]);

  // ── Tap-to-add from tray ─────────────────────────────────────────────────
  const handleTrayTap = useCallback((type: SensorType) => {
    // Place at a snapped position near center of canvas, offset per existing count
    const existing = zoneState?.installedSensors.filter(s => s.type === type).length || 0;
    const offsetX = snapToGrid(CANVAS_WIDTH / 2 + existing * GRID_STEP * 1.5, CANVAS_WIDTH);
    const offsetY = snapToGrid(CANVAS_HEIGHT / 2, CANVAS_HEIGHT);
    addSensor(selectedZoneId, type, { x: offsetX, y: offsetY });
  }, [selectedZoneId, zoneState, addSensor]);

  // ── Build PanResponder for a placed sensor ───────────────────────────────
  const buildSensorPanResponder = useCallback((sensor: InstalledSensor) => {
    // Ensure we have an Animated.ValueXY for this sensor
    if (!panRefs.current[sensor.id]) {
      panRefs.current[sensor.id] = new Animated.ValueXY({
        x: sensor.position.x - SENSOR_RADIUS,
        y: sensor.position.y - SENSOR_RADIUS,
      });
    }
    const pan = panRefs.current[sensor.id];

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        setDraggingId(sensor.id);
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gs) => {
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_, gs);

        // Compute raw center position for ghost indicator
        const rawCX = (pan.x as any)._value + (pan.x as any)._offset + SENSOR_RADIUS;
        const rawCY = (pan.y as any)._value + (pan.y as any)._offset + SENSOR_RADIUS;
        setGhostPos({
          x: snapToGrid(rawCX, CANVAS_WIDTH),
          y: snapToGrid(rawCY, CANVAS_HEIGHT),
        });
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();
        const rawCX = (pan.x as any)._value + SENSOR_RADIUS;
        const rawCY = (pan.y as any)._value + SENSOR_RADIUS;
        const snappedX = snapToGrid(rawCX, CANVAS_WIDTH);
        const snappedY = snapToGrid(rawCY, CANVAS_HEIGHT);

        // Animate to snapped position
        Animated.spring(pan, {
          toValue: { x: snappedX - SENSOR_RADIUS, y: snappedY - SENSOR_RADIUS },
          useNativeDriver: false,
          tension: 120,
          friction: 8,
        }).start();

        updateSensorPosition(selectedZoneId, sensor.id, { x: snappedX, y: snappedY });
        setDraggingId(null);
        setGhostPos(null);
      },

      onPanResponderTerminate: () => {
        setDraggingId(null);
        setGhostPos(null);
      },
    });
  }, [selectedZoneId, updateSensorPosition]);

  // ── Remove sensor ────────────────────────────────────────────────────────
  const handleRemoveSensor = (sensorId: string) => {
    Alert.alert(t('removeSensorTitle'), t('removeSensorQuestion'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => {
          delete panRefs.current[sensorId];
          removeSensor(selectedZoneId, sensorId);
        },
      },
    ]);
  };

  // ── Keep PanRefs in sync when sensors are removed ────────────────────────
  useEffect(() => {
    const currentIds = new Set(zoneState?.installedSensors.map(s => s.id) || []);
    Object.keys(panRefs.current).forEach(id => {
      if (!currentIds.has(id)) {
        delete panRefs.current[id];
        delete panResponderRefs.current[id]; // also clean up PanResponder
      }
    });
  }, [zoneState?.installedSensors]);

  // ── Sync Animated values when sensor position changes externally ─────────
  useEffect(() => {
    zoneState?.installedSensors.forEach(sensor => {
      if (panRefs.current[sensor.id] && draggingId !== sensor.id) {
        panRefs.current[sensor.id].setValue({
          x: sensor.position.x - SENSOR_RADIUS,
          y: sensor.position.y - SENSOR_RADIUS,
        });
      }
    });
  }, [zoneState?.installedSensors]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.rootContainer}>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t('planSensorsTitle')}</Text>
            <Text style={styles.headerSub}>{t('blueprintSub')}</Text>
          </View>
          <TouchableOpacity onPress={() => clearZone(selectedZoneId)} style={styles.headerBtn}>
            <Ionicons name="refresh-circle" size={26} color="#A5D6A7" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── BLUEPRINT CANVAS (outside ScrollView) ── */}
      <View style={styles.canvasOuter}>
        {/* Blueprint paper background */}
        <View style={styles.canvas}>

          {/* Dot grid */}
          <DotGrid />


          {/* Professional info overlay — top-right corner */}
          {farmArea > 0 && (
            <View pointerEvents="none" style={styles.farmInfoOverlay}>
              <Ionicons name="expand-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.farmInfoText}>{farmArea} {t('acres')}</Text>
            </View>
          )}

          {/* Ghost snap indicator — shown during drag */}
          {ghostPos && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ghostIndicator,
                {
                  left: ghostPos.x - 16,
                  top: ghostPos.y - 16,
                  opacity: ghostAnim,
                },
              ]}
            />
          )}

          {/* Installed sensors */}
          {zoneState?.installedSensors.map(sensor => {
            const cfg = SENSOR_CONFIGS[sensor.type];

            // Ensure stable Animated position ref
            if (!panRefs.current[sensor.id]) {
              panRefs.current[sensor.id] = new Animated.ValueXY({
                x: sensor.position.x - SENSOR_RADIUS,
                y: sensor.position.y - SENSOR_RADIUS,
              });
            }
            // Stable PanResponder ref — created once per sensor ID, not per render
            if (!panResponderRefs.current[sensor.id]) {
              panResponderRefs.current[sensor.id] = buildSensorPanResponder(sensor);
            }

            const pan = panRefs.current[sensor.id];
            const pr = panResponderRefs.current[sensor.id];
            const isBeingDragged = draggingId === sensor.id;

            return (
              <Animated.View
                key={sensor.id}
                pointerEvents="box-none"
                style={[
                  styles.sensorDotContainer,
                  {
                    transform: pan.getTranslateTransform(),
                    zIndex: isBeingDragged ? 20 : 10,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sensorDot,
                    {
                      backgroundColor: cfg.color,
                      opacity: isBeingDragged ? 0.85 : 1,
                      shadowColor: cfg.color,
                      shadowOpacity: isBeingDragged ? 0.6 : 0.3,
                    },
                  ]}
                  {...pr.panHandlers}
                >
                  <Ionicons name={cfg.icon as any} size={18} color="#FFF" />
                  <Text style={styles.sensorDotLabel}>{cfg.label[0]}</Text>
                </View>

                {/* Remove button - sibling to the dot but inside the same animated container */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveSensor(sensor.id)}
                  hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
                >
                  <Ionicons name="close-circle" size={18} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Empty hint */}
          {(!zoneState || zoneState.installedSensors.length === 0) && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Ionicons name="add-circle-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyHintText}>{t('emptyPlannerHint')}</Text>
            </View>
          )}
        </View>

        {/* Zone label badge */}
        <View style={styles.zoneLabelBadge}>
          <Ionicons name="location" size={12} color={colors.primary} />
          <Text style={styles.zoneLabelText}>
            {ZONES.find(z => z.id === selectedZoneId)?.name || 'Zone'}
          </Text>
        </View>
      </View>

      {/* ── SENSOR TRAY ── */}
      <View style={styles.tray}>
        <Text style={styles.trayTitle}>Tap a sensor below to place it on your field map - Slide For more sensors. </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trayScroll}>
          {/* Group 1: Smart Probes */}
          <View style={styles.trayGroup}>
            <View style={styles.trayGroupHeader}>
              <Text style={styles.trayGroupEmoji}>🌱</Text>
              <Text style={styles.trayGroupTitle}>Farm Sensors</Text>
            </View>
            <View style={styles.trayRow}>
              {(['Soil', 'pH', 'NPK', 'Moisture', 'Temperature'] as SensorType[]).map(type => {
                const cfg = SENSOR_CONFIGS[type];
                const count = zoneState?.installedSensors.filter(s => s.type === type).length || 0;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.trayItem, { borderColor: cfg.color }]}
                    onPress={() => handleTrayTap(type)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.trayIcon, { backgroundColor: cfg.color + '22' }]}>
                      <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                    </View>
                    <Text style={[styles.trayLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.trayCost}>₹{SENSOR_COSTS[type].toLocaleString()}</Text>
                    {count > 0 && (
                      <View style={[styles.trayBadge, { backgroundColor: cfg.color }]}>
                        <Text style={styles.trayBadgeText}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Separator */}
          <View style={styles.traySeparator} />

          {/* Group 2: Network Hubs */}
          <View style={styles.trayGroup}>
            <View style={styles.trayGroupHeader}>
              <Text style={styles.trayGroupEmoji}>📡</Text>
              <Text style={styles.trayGroupTitle}>Data Hubs</Text>
            </View>
            <View style={styles.trayRow}>
              {(['Arduino', 'ESP32'] as SensorType[]).map(type => {
                const cfg = SENSOR_CONFIGS[type];
                const count = zoneState?.installedSensors.filter(s => s.type === type).length || 0;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.trayItem, { borderColor: cfg.color }]}
                    onPress={() => handleTrayTap(type)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.trayIcon, { backgroundColor: cfg.color + '22' }]}>
                      <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                    </View>
                    <Text style={[styles.trayLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.trayCost}>₹{SENSOR_COSTS[type].toLocaleString()}</Text>
                    {count > 0 && (
                      <View style={[styles.trayBadge, { backgroundColor: cfg.color }]}>
                        <Text style={styles.trayBadgeText}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ── SCROLLABLE SECTION: Inputs + Verdict ── */}
      <ScrollView style={styles.bottomScroll} contentContainerStyle={styles.bottomScrollContent}>

        {/* Farm Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('farmDetails')}</Text>

          {/* Zone selector */}
          <Text style={styles.inputLabel}>Zone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {ZONES.map(zone => (
              <TouchableOpacity
                key={zone.id}
                style={[styles.chip, selectedZoneId === zone.id && styles.chipActive]}
                onPress={() => setSelectedZoneId(zone.id)}
              >
                <Text style={[styles.chipText, selectedZoneId === zone.id && styles.chipTextActive]}>
                  {zone.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Crop selector */}
          <Text style={styles.inputLabel}>Crop Type</Text>
          <View style={styles.chipRow}>
            {(['Rice', 'Wheat', 'Vegetables'] as CropType[]).map(crop => (
              <TouchableOpacity
                key={crop}
                style={[styles.chip, { flex: 1 }, selectedCrop === crop && styles.chipActive]}
                onPress={() => setSelectedCrop(crop)}
              >
                <Text style={[styles.chipText, selectedCrop === crop && styles.chipTextActive]}>
                  {crop}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Area input */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Farm Area (acres)</Text>
          <TextInput
            style={styles.textInput}
            value={areaInput}
            onChangeText={setAreaInput}
            placeholder={t('enterAreaPlaceholder')}
            keyboardType="numeric"
            placeholderTextColor="#B0BEC5"
          />
          {farmArea > 0 && (
            <Text style={styles.areaHint}>
              Boundary shown on canvas  ·  Grid Step = {GRID_STEP}px
            </Text>
          )}

          {/* ── NEXT BUTTON ── The exclusive trigger for AI calculation ── */}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              (!selectedCrop || !areaInput) && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!selectedCrop || !areaInput || isCalculating}
            activeOpacity={0.8}
          >
            {isCalculating ? (
              <Text style={styles.nextBtnText}>{t('syncing')}</Text>
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isStepValidated ? t('recalculateAi') : t('nextGetAiRec')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── LOADING STATE PANEL ── */}
        {isCalculating && (
          <View style={styles.loadingPanel}>
            <Ionicons name="sync" size={22} color="#1565C0" />
            <Text style={styles.loadingText}>{t('syncingAiWait')}</Text>
          </View>
        )}

        {/* ── VERDICT PANEL ── Only shown after Next is pressed ── */}
        {isStepValidated && !isCalculating && verdict && (
          <View style={styles.card}>

            {/* Overall status badge */}
            <View style={[
              styles.verdictBadge,
              verdict.overall === 'OPTIMAL' && { backgroundColor: '#2E7D32' },
              verdict.overall === 'NEEDS MORE' && { backgroundColor: '#E65100' },
              verdict.overall === 'OVER-PLANNED' && { backgroundColor: '#C62828' },
            ]}>
              <Ionicons
                name={
                  verdict.overall === 'OPTIMAL' ? 'checkmark-circle' :
                    verdict.overall === 'NEEDS MORE' ? 'warning' : 'close-circle'
                }
                size={22}
                color="#FFF"
              />
              <Text style={styles.verdictLabel}>{verdict.overall}</Text>
            </View>

            {/* Metrics row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{t(verdict.accuracyLabel as any) || verdict.accuracyLabel}</Text>
                <Text style={styles.metricSub}>{t('accuracy')} ({verdict.accuracy}%)</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>₹{verdict.totalCost.toLocaleString()}</Text>
                <Text style={styles.metricSub}>{t('totalCost')}</Text>
              </View>
            </View>

            {/* Details toggle */}
            <TouchableOpacity style={styles.detailToggle} onPress={() => setShowDetails(!showDetails)}>
              <Text style={styles.detailToggleText}>{showDetails ? t('hideDetails') : t('viewDetails')}</Text>
              <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Sensor status table */}
            {showDetails && (
              <View style={styles.table}>
                <View style={styles.tableHeadRow}>
                  {[t('sensor'), t('required'), t('installed'), t('status')].map(h => (
                    <Text key={h} style={styles.tableHead}>{h}</Text>
                  ))}
                </View>
                {verdict.sensorStatuses.map(ss => (
                  <View key={ss.type} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{ss.type}</Text>
                    <Text style={styles.tableCell}>{ss.required}</Text>
                    <Text style={styles.tableCell}>{ss.installed}</Text>
                    <View style={[
                      styles.statusPill,
                      ss.status === 'OPTIMAL' && { backgroundColor: '#E8F5E9' },
                      ss.status === 'NEEDS MORE' && { backgroundColor: '#FFF3E0' },
                      ss.status === 'EXTRA' && { backgroundColor: '#FFEBEE' },
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        ss.status === 'OPTIMAL' && { color: '#2E7D32' },
                        ss.status === 'NEEDS MORE' && { color: '#E65100' },
                        ss.status === 'EXTRA' && { color: '#C62828' },
                      ]}>
                        {ss.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── HINT: no verdict yet ── */}
        {!isStepValidated && !isCalculating && selectedCrop && areaInput ? (
          <View style={styles.hintCard}>
            <Ionicons name="arrow-down-circle-outline" size={20} color="#78909C" />
            <Text style={styles.hintText}>
              {t('fillDetailsHint')}
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ECEFF1',
  },

  // ── Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 11,
    color: '#A5D6A7',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Canvas
  canvasOuter: {
    position: 'relative',
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#F0F4F8',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderBottomColor: '#CFD8DC',
  },

  // Farm boundary dashed rectangle
  farmBoundary: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 6,
    backgroundColor: 'rgba(76,175,80,0.05)',
  },
  farmBoundaryLabel: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
    backgroundColor: 'rgba(240,244,248,0.9)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },

  // Ghost snap indicator
  ghostIndicator: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2979FF',
    backgroundColor: 'rgba(41,121,255,0.18)',
    zIndex: 5,
  },

  // Zone label badge (overlay on canvas bottom-left)
  zoneLabelBadge: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    elevation: 2,
  },
  zoneLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Canvas empty hint
  emptyHint: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyHintText: {
    fontSize: 13,
    color: '#90A4AE',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sensor dot (placed on canvas)
  sensorDotContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sensorDotLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    position: 'absolute',
    bottom: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#C62828',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Sensor Tray  (warm, earthy, farmer-friendly)
  tray: {
    backgroundColor: '#F5F0E8',       // Warm cream — like farm paper, feels natural
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 14,
    borderTopWidth: 3,
    borderTopColor: '#A5D6A7',         // Soft green top edge — matches header
  },
  trayTitle: {
    fontSize: 12,
    color: '#5D4037',                  // Warm brown — earthy, readable
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trayScroll: {
    paddingRight: 16,
    alignItems: 'flex-start',
  },
  trayGroup: {
    alignItems: 'flex-start',
    marginRight: 4,
  },
  trayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginLeft: 2,
  },
  trayGroupEmoji: {
    fontSize: 13,
  },
  trayGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#33691E',                  // Deep earthy green — warm authority
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  traySeparator: {
    width: 1.5,
    marginHorizontal: 14,
    marginTop: 22,
    height: 82,
    backgroundColor: '#BCAAA4',        // Warm taupe — visible and soft
    alignSelf: 'flex-end',
  },
  trayRow: {
    flexDirection: 'row',
    gap: 9,
  },
  trayItem: {
    width: 86,                         // Slightly larger — easy finger tap
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#FDFAF5',        // Warm off-white — not stark, feels natural
    position: 'relative',
    elevation: 2,
    shadowColor: '#5D4037',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  trayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  trayLabel: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    color: '#3E2723',                  // Rich dark brown — high contrast on warm bg
  },
  trayCost: {
    fontSize: 10,
    color: '#6D4C41',                  // Medium warm brown — clearly readable
    marginTop: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  trayBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5F0E8',            // Matches tray bg — clean ring
  },
  trayBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // ── Bottom scroll section
  bottomScroll: {
    flex: 1,
  },
  bottomScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // ── Cards
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#263238',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#546E7A',
  },
  chipTextActive: {
    color: '#FFF',
  },

  // Text input
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#263238',
    backgroundColor: '#FAFAFA',
  },
  areaHint: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── Verdict
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#78909C',
  },
  verdictLabel: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#263238',
  },
  metricSub: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  detailToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Table
  table: {
    marginTop: 12,
  },
  tableHeadRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  tableHead: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#37474F',
  },
  statusPill: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Hint card (no verdict yet)
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    elevation: 1,
  },
  hintText: {
    fontSize: 13,
    color: '#78909C',
    flex: 1,
  },

  // ── Next button
  nextBtn: {
    marginTop: 18,
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  nextBtnDisabled: {
    backgroundColor: '#B0BEC5',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ── Loading / Syncing panel
  loadingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    flex: 1,
  },

  // ── Info Overlay
  farmInfoOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  farmInfoText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

