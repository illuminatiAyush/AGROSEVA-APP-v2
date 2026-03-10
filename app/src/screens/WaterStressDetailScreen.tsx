/**
 * WaterStressDetailScreen.tsx
 *
 * Full analysis dashboard showing multi-index vegetation analysis results:
 * - Heatmap overlay
 * - Crop Health Score gauge
 * - Vegetation index metrics (VARI, ExG, NGRDI)
 * - Stress distribution bar chart (7 levels)
 * - 32×32 stress grid visualization
 * - AI irrigation recommendation
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Color palette ─────────────────────────────────────────────────────────────
const P = {
  bg: '#0B1A12',
  surface: '#122A1B',
  surfaceLight: '#1A3825',
  card: '#143020',
  cardBorder: '#1E4A2E',

  accent: '#4ADE80',
  accentDim: '#22C55E',
  accentBg: 'rgba(74, 222, 128, 0.08)',
  accentBorder: 'rgba(74, 222, 128, 0.18)',

  cyan: '#22D3EE',
  cyanBg: 'rgba(34, 211, 238, 0.10)',
  amber: '#FBBF24',
  amberBg: 'rgba(251, 191, 36, 0.10)',
  rose: '#FB7185',
  roseBg: 'rgba(251, 113, 133, 0.10)',
  purple: '#A78BFA',
  purpleBg: 'rgba(167, 139, 250, 0.10)',

  textPrimary: '#E8F5EC',
  textSecondary: '#94B8A0',
  textMuted: '#5A7A66',
  textWhite: '#FFFFFF',

  divider: '#1E4A2E',
};

// ── 7-level stress colors ─────────────────────────────────────────────────────
const STRESS_COLORS: Record<string, string> = {
  dark_green: '#1B5E20',
  green: '#43A047',
  light_green: '#9CCC65',
  yellow_green: '#D4E157',
  yellow: '#FFA726',
  orange: '#EF6C00',
  red: '#C62828',
};

const STRESS_DISPLAY: Record<string, string> = {
  dark_green: 'Excellent',
  green: 'Healthy',
  light_green: 'Good',
  yellow_green: 'Mild',
  yellow: 'Moderate',
  orange: 'High',
  red: 'Critical',
};

// ── Animated fade-in card ─────────────────────────────────────────────────────
function FadeCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 480, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 480, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Animated progress bar ─────────────────────────────────────────────────────
function ProgressBar({
  pct,
  color,
  height = 8,
  delay = 0,
}: {
  pct: number;
  color: string;
  height?: number;
  delay?: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 900,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[s.barBg, { height }]}>
      <Animated.View
        style={[
          s.barFill,
          {
            height,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ── Health Score Gauge ─────────────────────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 40, friction: 7,
      useNativeDriver: true, delay: 200,
    }).start();
  }, []);

  const getScoreColor = () => {
    if (score >= 8) return P.accent;
    if (score >= 6) return P.cyan;
    if (score >= 4) return P.amber;
    return P.rose;
  };

  const getScoreLabel = () => {
    if (score >= 8.5) return 'Excellent';
    if (score >= 7) return 'Healthy';
    if (score >= 6) return 'Good';
    if (score >= 5) return 'Mild Stress';
    if (score >= 4) return 'Moderate';
    if (score >= 3) return 'High Stress';
    return 'Critical';
  };

  const color = getScoreColor();

  return (
    <Animated.View style={[s.gaugeContainer, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[s.gaugeRing, { borderColor: color + '30' }]}>
        <View style={[s.gaugeInner, { borderColor: color + '60' }]}>
          <Text style={[s.gaugeScore, { color }]}>{score.toFixed(1)}</Text>
          <Text style={s.gaugeMax}>/10</Text>
        </View>
      </View>
      <Text style={[s.gaugeLabel, { color }]}>{getScoreLabel()}</Text>
    </Animated.View>
  );
}

// ── Index Metric Card ─────────────────────────────────────────────────────────
function IndexCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[s.indexCard, { borderColor: color + '25' }]}>
      <View style={[s.indexIconWrap, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={[s.indexValue, { color }]}>{value.toFixed(3)}</Text>
      <Text style={s.indexLabel}>{label}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function WaterStressDetailScreen({ route, navigation }: any) {
  const result = route?.params?.result;

  if (!result || result.status !== 'success') {
    return (
      <View style={s.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={P.textMuted} />
        <Text style={s.emptyText}>No analysis data available</Text>
        <TouchableOpacity style={s.backBtnEmpty} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    heatmap_image,
    crop_health_score,
    vegetation_indices,
    stress_distribution,
    stress_map,
    zone_summary,
    average_vari,
    vegetation_coverage_pct,
    processing_time_ms,
    classification,
    recommendation,
    grid_resolution,
  } = result;

  // Build sorted distribution bars
  const distOrder = ['Excellent', 'Healthy', 'Good', 'Mild Stress', 'Moderate Stress', 'High Stress', 'Critical'];
  const distColors = [
    STRESS_COLORS.dark_green,
    STRESS_COLORS.green,
    STRESS_COLORS.light_green,
    STRESS_COLORS.yellow_green,
    STRESS_COLORS.yellow,
    STRESS_COLORS.orange,
    STRESS_COLORS.red,
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={P.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Crop Stress Analysis</Text>
          <Text style={s.headerSub}>Multi-Index Vegetation Report</Text>
        </View>
        <View style={s.timePill}>
          <MaterialCommunityIcons name="timer-outline" size={12} color={P.accent} />
          <Text style={s.timeText}>{processing_time_ms}ms</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Crop Health Score Gauge ── */}
        <FadeCard delay={0}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color={P.accent} />
              <Text style={s.cardTitle}>Crop Health Score</Text>
            </View>
            <HealthGauge score={crop_health_score} />
            <Text style={s.classificationText}>{classification}</Text>
          </View>
        </FadeCard>

        {/* ── 2. Heatmap ── */}
        {heatmap_image && (
          <FadeCard delay={80}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <MaterialCommunityIcons name="map-legend" size={16} color={P.cyan} />
                <Text style={s.cardTitle}>Stress Heatmap</Text>
                <Text style={s.cardBadge}>{grid_resolution}×{grid_resolution}</Text>
              </View>
              <Image
                source={{ uri: `data:image/jpeg;base64,${heatmap_image}` }}
                style={s.heatmapImg}
                resizeMode="contain"
              />
            </View>
          </FadeCard>
        )}

        {/* ── 3. Vegetation Index Metrics ── */}
        <FadeCard delay={160}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={16} color={P.purple} />
              <Text style={s.cardTitle}>Vegetation Indices</Text>
            </View>
            <View style={s.indexRow}>
              <IndexCard
                label="VARI"
                value={vegetation_indices.vari}
                icon="leaf"
                color={P.accent}
                bgColor={P.accentBg}
              />
              <IndexCard
                label="ExG"
                value={vegetation_indices.exg}
                icon="grass"
                color={P.cyan}
                bgColor={P.cyanBg}
              />
              <IndexCard
                label="NGRDI"
                value={vegetation_indices.ngrdi}
                icon="weather-sunny"
                color={P.amber}
                bgColor={P.amberBg}
              />
            </View>
          </View>
        </FadeCard>

        {/* ── 4. Quick Stats ── */}
        <FadeCard delay={220}>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <MaterialCommunityIcons name="chart-line" size={14} color={P.accent} />
              <Text style={s.statValue}>{average_vari.toFixed(3)}</Text>
              <Text style={s.statLabel}>Avg VARI</Text>
            </View>
            <View style={s.statCard}>
              <MaterialCommunityIcons name="leaf" size={14} color={P.cyan} />
              <Text style={s.statValue}>{vegetation_coverage_pct.toFixed(1)}%</Text>
              <Text style={s.statLabel}>Coverage</Text>
            </View>
            <View style={s.statCard}>
              <MaterialCommunityIcons name="grid" size={14} color={P.purple} />
              <Text style={s.statValue}>{(grid_resolution * grid_resolution).toLocaleString()}</Text>
              <Text style={s.statLabel}>Zones</Text>
            </View>
          </View>
        </FadeCard>

        {/* ── 5. Stress Distribution ── */}
        <FadeCard delay={300}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialCommunityIcons name="chart-bar" size={16} color={P.accent} />
              <Text style={s.cardTitle}>Stress Distribution</Text>
            </View>
            {distOrder.map((name, i) => {
              const pct = stress_distribution?.[name] ?? 0;
              return (
                <View key={name} style={s.distRow}>
                  <View style={[s.distDot, { backgroundColor: distColors[i] }]} />
                  <Text style={s.distName} numberOfLines={1}>{name}</Text>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <ProgressBar pct={pct} color={distColors[i]} height={6} delay={350 + i * 60} />
                  </View>
                  <Text style={[s.distPct, { color: distColors[i] }]}>{pct.toFixed(1)}%</Text>
                </View>
              );
            })}
          </View>
        </FadeCard>

        {/* ── 6. Stress Grid (compact) ── */}
        {stress_map && stress_map.length > 0 && (
          <FadeCard delay={380}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <MaterialCommunityIcons name="view-grid-outline" size={16} color={P.textSecondary} />
                <Text style={s.cardTitle}>
                  Stress Grid ({stress_map.length}×{stress_map[0]?.length})
                </Text>
              </View>
              <View style={s.gridContainer}>
                {stress_map.map((row: string[], rIdx: number) => (
                  <View key={rIdx} style={s.gridRow}>
                    {row.map((cell: string, cIdx: number) => (
                      <View
                        key={cIdx}
                        style={[
                          s.gridCell,
                          {
                            backgroundColor: STRESS_COLORS[cell] || '#333',
                            width: (SCREEN_WIDTH - 52) / stress_map[0].length,
                            height: (SCREEN_WIDTH - 52) / stress_map.length,
                          },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
              <View style={s.gridLegendRow}>
                {Object.entries(STRESS_DISPLAY).map(([key, label]) => (
                  <View key={key} style={s.gridLegendItem}>
                    <View style={[s.gridLegendDot, { backgroundColor: STRESS_COLORS[key] }]} />
                    <Text style={s.gridLegendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeCard>
        )}

        {/* ── 7. AI Recommendation ── */}
        <FadeCard delay={440}>
          <View style={s.recoCard}>
            <View style={s.cardHeader}>
              <View style={s.recoIconWrap}>
                <MaterialCommunityIcons name="robot-outline" size={18} color={P.accent} />
              </View>
              <Text style={[s.cardTitle, { color: P.accent }]}>Irrigation Recommendation</Text>
            </View>
            <Text style={s.recoText}>{recommendation}</Text>
          </View>
        </FadeCard>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  centered: {
    flex: 1, backgroundColor: P.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyText: { color: P.textMuted, fontSize: 15, marginTop: 12 },
  backBtnEmpty: {
    marginTop: 20, paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: P.surface, borderRadius: 12,
  },
  backBtnText: { color: P.textPrimary, fontWeight: '600', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: P.surface,
    borderBottomWidth: 1, borderBottomColor: P.divider,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: P.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '800', color: P.textPrimary, letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11, color: P.textMuted, fontWeight: '600', marginTop: 1,
    letterSpacing: 0.5,
  },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: P.accentBg, borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: P.accentBorder,
  },
  timeText: { color: P.accent, fontSize: 11, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  // Cards
  card: {
    backgroundColor: P.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: P.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: P.textPrimary, flex: 1,
  },
  cardBadge: {
    fontSize: 10, fontWeight: '700', color: P.cyan,
    backgroundColor: P.cyanBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, overflow: 'hidden',
  },

  // Health Gauge
  gaugeContainer: { alignItems: 'center', paddingVertical: 12 },
  gaugeRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, justifyContent: 'center', alignItems: 'center',
  },
  gaugeInner: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    backgroundColor: P.bg,
  },
  gaugeScore: { fontSize: 32, fontWeight: '900' },
  gaugeMax: { fontSize: 12, color: P.textMuted, fontWeight: '600', marginTop: -2 },
  gaugeLabel: { fontSize: 14, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 },
  classificationText: {
    textAlign: 'center', color: P.textSecondary,
    fontSize: 12, marginTop: 6, fontWeight: '500',
  },

  // Heatmap
  heatmapImg: {
    width: '100%', height: SCREEN_WIDTH - 64,
    borderRadius: 10, backgroundColor: P.surfaceLight,
  },

  // Index cards
  indexRow: { flexDirection: 'row', gap: 10 },
  indexCard: {
    flex: 1, alignItems: 'center', padding: 12,
    backgroundColor: P.bg, borderRadius: 12,
    borderWidth: 1,
  },
  indexIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  indexValue: { fontSize: 16, fontWeight: '800' },
  indexLabel: { fontSize: 10, color: P.textMuted, fontWeight: '700', marginTop: 3 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', padding: 14,
    backgroundColor: P.card, borderRadius: 14,
    borderWidth: 1, borderColor: P.cardBorder,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: P.textPrimary, marginTop: 6 },
  statLabel: { fontSize: 10, color: P.textMuted, fontWeight: '600', marginTop: 3 },

  // Distribution
  distRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8,
  },
  distDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  distName: { width: 70, fontSize: 11, color: P.textSecondary, fontWeight: '600' },
  distPct: { fontSize: 12, fontWeight: '800', width: 48, textAlign: 'right' },

  // Progress bars
  barBg: {
    backgroundColor: P.surfaceLight, borderRadius: 4, overflow: 'hidden',
  },
  barFill: { borderRadius: 4 },

  // Grid
  gridContainer: { borderRadius: 8, overflow: 'hidden' },
  gridRow: { flexDirection: 'row' },
  gridCell: { aspectRatio: 1 },
  gridLegendRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8, marginTop: 12,
  },
  gridLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridLegendDot: { width: 8, height: 8, borderRadius: 4 },
  gridLegendText: { fontSize: 9, color: P.textMuted, fontWeight: '600' },

  // Recommendation
  recoCard: {
    backgroundColor: P.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: P.accentBorder,
  },
  recoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: P.accentBg,
    justifyContent: 'center', alignItems: 'center',
  },
  recoText: {
    color: P.textSecondary, fontSize: 13,
    lineHeight: 20, fontWeight: '500',
  },
});
