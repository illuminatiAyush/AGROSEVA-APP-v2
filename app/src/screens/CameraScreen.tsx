import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Easing,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/colors';
import { DiseaseDetectionService, DiseaseResult } from '@/services/DiseaseDetectionService';
import { WaterStressService, WaterStressResult } from '@/services/WaterStressService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Mode Toggle ───────────────────────────────────────────────────────────────
type ScanMode = 'disease' | 'water_stress';

// ── Stress helpers ────────────────────────────────────────────────────────────
const STRESS_LABEL_COLORS: Record<string, string> = {
  dark_green: '#1B5E20',
  green: '#43A047',
  light_green: '#9CCC65',
  yellow_green: '#D4E157',
  yellow: '#FFA726',
  orange: '#EF6C00',
  red: '#C62828',
};
const STRESS_COLOR: Record<string, string> = {
  'Excellent — No Irrigation Needed': '#1B5E20',
  'Healthy — No Irrigation Needed': '#43A047',
  'Good — Monitor Soil Moisture': '#9CCC65',
  'Mild Stress — Irrigate Soon': '#D4E157',
  'Moderate Stress — Irrigate Today': '#FFA726',
  'High Stress — Irrigate Urgently': '#EF6C00',
  'Critical — Irrigate Immediately': '#C62828',
  'Unable to Detect': '#888888',
};
const STRESS_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'Excellent — No Irrigation Needed': 'check-circle',
  'Healthy — No Irrigation Needed': 'check-circle',
  'Good — Monitor Soil Moisture': 'check-circle',
  'Mild Stress — Irrigate Soon': 'alert-circle',
  'Moderate Stress — Irrigate Today': 'alert-circle',
  'High Stress — Irrigate Urgently': 'alert-octagon',
  'Critical — Irrigate Immediately': 'alert-octagon',
  'Unable to Detect': 'help-circle',
};

// ══════════════════════════════════════════════════════════════════════════════
// EXACT color tokens sampled from reference screenshots
// Header gradient: dark forest green  #3B7A3B → #2D6A2D → #1A4A1A
// Body background: #F0F2F0
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  hdrTop: '#3B7A3B',
  hdrMid: '#2D6A2D',
  hdrBot: '#1A4A1A',

  green: '#2D7A2D',
  greenLight: '#EAF5EA',
  greenMid: '#A8D5A8',
  greenDark: '#1A5C1A',

  blue: '#1976D2',
  blueLight: '#E3F2FD',
  blueMid: '#90CAF9',

  amber: '#E07B00',
  amberLight: '#FFF3E0',
  red: '#C0392B',
  redLight: '#FDECEA',
  purple: '#7B1FA2',
  purpleLight: '#F3E5F5',

  bg: '#F0F2F0',
  surface: '#FFFFFF',
  divider: '#E8EAE8',

  textPrimary: '#1A1A1A',
  textSecondary: '#5A6A5A',
  textMuted: '#8A9A8A',
  textWhite: '#FFFFFF',

  online: '#43A047',
  offline: '#E53935',
  pending: '#FB8C00',
};

// ── Animated card wrapper (fade + slide up) ───────────────────────────────────
function AnimatedCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 440,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 440,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
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
function AnimatedBar({
  pct,
  color,
  height = 7,
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
      duration: 950,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={[styles.barBg, { height }]}>
      <Animated.View
        style={[
          styles.barFill,
          {
            height,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ── Icon circle ───────────────────────────────────────────────────────────────
function IconCircle({
  name,
  size = 20,
  iconColor,
  bgColor,
  circleSize = 42,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  iconColor: string;
  bgColor: string;
  circleSize?: number;
}) {
  return (
    <View
      style={{
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={name} size={size} color={iconColor} />
    </View>
  );
}

// ── Pulse rings (scan animation) ──────────────────────────────────────────────
function PulseRings({ color }: { color: string }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    rings.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 480),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => rings.forEach(a => a.stopAnimation());
  }, []);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      pointerEvents="none"
    >
      {rings.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 80 + i * 40,
            height: 80 + i * 40,
            borderRadius: (80 + i * 40) / 2,
            borderWidth: 1.5,
            borderColor: color,
            opacity: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.6, 0] }),
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ── Diag section ──────────────────────────────────────────────────────────────
function DiagSection({
  icon,
  title,
  items,
  accentColor,
  accentBg,
  numbered = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  items: string[];
  accentColor: string;
  accentBg: string;
  numbered?: boolean;
}) {
  return (
    <View style={styles.diagSection}>
      <View style={styles.diagSectionHeader}>
        <MaterialCommunityIcons name={icon} size={14} color={accentColor} />
        <Text style={[styles.diagSectionTitle, { color: accentColor }]}>{title}</Text>
      </View>
      {items.map((item, i) =>
        numbered ? (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: accentColor }]}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ) : (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: accentColor }]} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        )
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<ScanMode>('disease');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState<DiseaseResult | null>(null);
  const [stressResult, setStressResult] = useState<WaterStressResult | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scanLineY = useRef(new Animated.Value(0)).current;
  const toggleSlide = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    DiseaseDetectionService.checkBackendHealth().then(setBackendOnline);
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1, duration: 520,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0, duration: 520,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Overlay + scan-line animation
  useEffect(() => {
    if (analyzing) {
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineY, {
            toValue: 1, duration: 1900,
            easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
          Animated.timing(scanLineY, {
            toValue: 0, duration: 1900,
            easing: Easing.inOut(Easing.sin), useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 240, useNativeDriver: true }).start();
      scanLineY.stopAnimation();
      scanLineY.setValue(0);
    }
  }, [analyzing]);

  const handleSwitchMode = (newMode: ScanMode) => {
    if (newMode === mode) return;
    Animated.spring(toggleSlide, {
      toValue: newMode === 'disease' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
    setMode(newMode);
    setImage(null);
    setDiseaseResult(null);
    setStressResult(null);
  };

  const handleCapture = async (type: 'camera' | 'library') => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is needed to scan plants.');
          return;
        }
      }
      const pickerResult =
        type === 'camera'
          ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });

      if (pickerResult.canceled) return;
      const uri = pickerResult.assets[0].uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 800 } }], { compress: 0.8 }
      );
      setImage(manipulated.uri);
      setDiseaseResult(null);
      setStressResult(null);
      mode === 'disease' ? runDiseaseScan(manipulated.uri) : runWaterStressScan(manipulated.uri);
    } catch {
      Alert.alert('Error', 'Failed to access camera or gallery.');
    }
  };

  const runDiseaseScan = async (uri: string) => {
    setAnalyzing(true);
    try {
      const data = await DiseaseDetectionService.scanForDisease(uri);
      console.log('[CameraScreen] Backend response:', JSON.stringify(data, null, 2).substring(0, 500));
      console.log('[CameraScreen] disease_name:', data.disease_name, '| diagnosis.disease_name:', data.diagnosis?.disease_name);
      setDiseaseResult(data);
      setBackendOnline(true);
    } catch (error: any) {
      Alert.alert('Scan Failed', error.message || 'Could not analyze the plant.');
      setBackendOnline(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const runWaterStressScan = async (uri: string) => {
    setAnalyzing(true);
    try {
      const data = await WaterStressService.scan(uri);
      setStressResult(data);
      setBackendOnline(true);
    } catch (error: any) {
      Alert.alert('Scan Failed', error.message || 'Could not analyze the plant.');
      setBackendOnline(false);
    } finally {
      setAnalyzing(false);
    }
  };

  // Helpers
  const getModeBadge = () => {
    if (!diseaseResult) return null;
    const m = diseaseResult.method;
    if (m === 'esp32_tinyml')   return { label: 'Offline · ESP32',    color: C.amber,  icon: 'antenna' as const };
    if (m === 'tinyml_local')   return { label: 'Offline · TinyML',   color: C.amber,  icon: 'antenna' as const };
    if (m === 'accurate_model') return { label: 'Online · AI Model',  color: C.blue,   icon: 'cloud-check-outline' as const };
    if (m === 'backend_tflite') return { label: 'Backend Fallback',   color: C.purple, icon: 'server-outline' as const };
    return { label: 'Unknown Source', color: C.textMuted, icon: 'help-circle-outline' as const };
  };

  const isHealthy = diseaseResult?.is_healthy === true || diseaseResult?.status === 'healthy';
  // Try top-level disease_name first (set by accurate model),
  // then fall back to Groq's diagnosis.disease_name, then 'Unknown'
  const diseaseName = diseaseResult?.disease_name
    || diseaseResult?.diagnosis?.disease_name
    || 'Unknown';
  const stressColor = stressResult ? (STRESS_COLOR[stressResult.classification] ?? C.textMuted) : C.textMuted;
  const stressIconName = stressResult ? (STRESS_ICON[stressResult.classification] ?? 'help-circle') : 'help-circle';
  const variscore = stressResult ? stressResult.average_vari.toFixed(3) : '--';

  const PILL_W = (SCREEN_WIDTH - 32 - 8) / 2 - 2;
  const toggleTranslateX = toggleSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [2, PILL_W + 2],
  });

  const scanLineTranslateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 194],
  });

  const activeColor   = mode === 'disease' ? C.green : C.blue;
  const activeLightBg = mode === 'disease' ? C.greenLight : C.blueLight;
  const activeMid     = mode === 'disease' ? C.greenMid : C.blueMid;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.hdrTop} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        {/* Brand row */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <MaterialCommunityIcons name="leaf" size={18} color={C.textWhite} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AgroSeva</Text>
              <Text style={styles.headerSubtitle}>PLANT SCANNER</Text>
            </View>
          </View>

          {/* Live status pill */}
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    backendOnline === true  ? C.online :
                    backendOnline === false ? C.offline : C.pending,
                },
              ]}
            />
            <Text style={styles.statusPillText}>
              {backendOnline === null ? 'Checking' : backendOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* ── Mode toggle ── */}
        <View style={styles.toggleTrack}>
          {/* Spring-animated white pill indicator */}
          <Animated.View
            style={[
              styles.togglePill,
              { width: PILL_W, transform: [{ translateX: toggleTranslateX }] },
            ]}
          />
          <TouchableOpacity style={styles.toggleBtn} onPress={() => handleSwitchMode('disease')} activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="bacteria-outline"
              size={15}
              color={mode === 'disease' ? C.green : 'rgba(255,255,255,0.6)'}
            />
            <Text style={[styles.toggleBtnText, mode === 'disease' && { color: C.green }]}>
              Disease Scan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => handleSwitchMode('water_stress')} activeOpacity={0.85}>
            <MaterialCommunityIcons
              name="water-alert-outline"
              size={15}
              color={mode === 'water_stress' ? C.blue : 'rgba(255,255,255,0.6)'}
            />
            <Text style={[styles.toggleBtnText, mode === 'water_stress' && { color: C.blue }]}>
              Water Stress
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL BODY                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode chip */}
        <View style={[styles.modeChip, { backgroundColor: activeLightBg }]}>
          <MaterialCommunityIcons
            name={mode === 'disease' ? 'magnify-scan' : 'water-check-outline'}
            size={13}
            color={activeColor}
          />
          <Text style={[styles.modeChipText, { color: activeColor }]}>
            {mode === 'disease'
              ? 'Detects plant diseases using AI / TinyML'
              : 'Analyses crop water stress via vegetation indices'}
          </Text>
        </View>

        {/* ══════════════════════════════════════ */}
        {/* IMAGE PREVIEW CARD                     */}
        {/* ══════════════════════════════════════ */}
        <View style={[styles.imageCard, { borderColor: activeMid }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: activeLightBg }]}>
              {/* Three concentric dashed rings */}
              <View style={[styles.ring3, { borderColor: activeColor + '18' }]}>
                <View style={[styles.ring2, { borderColor: activeColor + '30' }]}>
                  <View style={[styles.ring1, { borderColor: activeColor + '55', backgroundColor: activeColor + '10' }]}>
                    <MaterialCommunityIcons
                      name={mode === 'disease' ? 'flower-outline' : 'water-outline'}
                      size={36}
                      color={activeColor}
                    />
                  </View>
                </View>
              </View>
              <Text style={[styles.placeholderTitle, { color: activeColor }]}>
                {mode === 'disease' ? 'Capture a plant image' : 'Scan a crop area'}
              </Text>
              <Text style={styles.placeholderHint}>
                {mode === 'disease'
                  ? 'Point camera at a leaf for best results'
                  : 'Ensure plant leaves fill the frame'}
              </Text>
            </View>
          )}

          {/* ── Scanning overlay with scan-line + corners + pulse rings ── */}
          <Animated.View
            style={[styles.scanOverlay, { opacity: overlayOpacity }]}
            pointerEvents="none"
          >
            {/* Animated scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY: scanLineTranslateY }],
                  borderColor: activeColor,
                  shadowColor: activeColor,
                },
              ]}
            />
            {/* Corner brackets */}
            <View style={[styles.cornerTL, { borderColor: activeColor }]} />
            <View style={[styles.cornerTR, { borderColor: activeColor }]} />
            <View style={[styles.cornerBL, { borderColor: activeColor }]} />
            <View style={[styles.cornerBR, { borderColor: activeColor }]} />
            {/* Expanding pulse rings */}
            <PulseRings color={activeColor} />
            {/* Text */}
            <View style={styles.scanTextWrap}>
              <Text style={styles.scanLabel}>
                {mode === 'disease' ? 'Analyzing plant...' : 'Scanning water stress...'}
              </Text>
              <Text style={styles.scanSubLabel}>
                {mode === 'disease' ? 'Sending to AI model' : 'Computing vegetation indices'}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* ══════════════════════════════════════ */}
        {/* ACTION BUTTONS                         */}
        {/* ══════════════════════════════════════ */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.btnGallery}
            onPress={() => handleCapture('library')}
            disabled={analyzing}
            activeOpacity={0.76}
          >
            <IconCircle name="image-multiple-outline" size={17} iconColor={C.green} bgColor={C.greenLight} circleSize={32} />
            <Text style={styles.btnGalleryText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnScan, { backgroundColor: activeColor, shadowColor: activeColor }]}
            onPress={() => handleCapture('camera')}
            disabled={analyzing}
            activeOpacity={0.82}
          >
            <MaterialCommunityIcons
              name={mode === 'disease' ? 'camera-outline' : 'camera-iris'}
              size={22}
              color={C.textWhite}
            />
            <Text style={styles.btnScanText}>
              {mode === 'disease' ? 'Scan Plant' : 'Scan Crop'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* DISEASE RESULTS                                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {mode === 'disease' && diseaseResult && (
          <View>
            {getModeBadge() && (
              <AnimatedCard delay={0}>
                <View style={[styles.methodBadge, {
                  backgroundColor: getModeBadge()!.color + '14',
                  borderColor: getModeBadge()!.color + '44',
                }]}>
                  <MaterialCommunityIcons name={getModeBadge()!.icon} size={13} color={getModeBadge()!.color} />
                  <Text style={[styles.methodText, { color: getModeBadge()!.color }]}>
                    {getModeBadge()!.label}
                  </Text>
                </View>
              </AnimatedCard>
            )}

            {/* Health status */}
            <AnimatedCard delay={60}>
              <Text style={styles.sectionTitle}>Scan Result</Text>
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: isHealthy ? C.green : C.red }]}>
                <View style={styles.healthRow}>
                  <IconCircle
                    name={isHealthy ? 'check-circle' : 'alert-circle'}
                    size={28}
                    iconColor={isHealthy ? C.green : C.red}
                    bgColor={isHealthy ? C.greenLight : C.redLight}
                    circleSize={56}
                  />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.healthStatus, { color: isHealthy ? C.green : C.red }]}>
                      {isHealthy ? 'Healthy Plant' : 'Disease Detected'}
                    </Text>
                    {!isHealthy && <Text style={styles.diseaseNameText}>{diseaseName}</Text>}
                  </View>
                </View>
                <View style={styles.confRow}>
                  <Text style={styles.confLabel}>Confidence</Text>
                  <Text style={[styles.confValue, { color: isHealthy ? C.green : C.red }]}>
                    {diseaseResult.confidence?.toFixed(1)}%
                  </Text>
                </View>
                <AnimatedBar pct={diseaseResult.confidence || 0} color={isHealthy ? C.green : C.red} delay={220} />
              </View>
            </AnimatedCard>

            {/* Top predictions */}
            {diseaseResult.all_predictions && Object.keys(diseaseResult.all_predictions).length > 0 && (
              <AnimatedCard delay={130}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <IconCircle name="flask-outline" size={16} iconColor={C.green} bgColor={C.greenLight} circleSize={32} />
                    <Text style={styles.cardTitle}>Top Predictions</Text>
                  </View>
                  {Object.entries(diseaseResult.all_predictions).map(([name, conf], idx) => {
                    const displayName = name.replace('___', ' — ').replace(/_/g, ' ');
                    return (
                      <View key={idx} style={styles.predRow}>
                        <View style={[styles.predRank, { backgroundColor: idx === 0 ? C.greenLight : '#F2F5F2' }]}>
                          <Text style={[styles.predRankText, { color: idx === 0 ? C.green : C.textMuted }]}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.predName} numberOfLines={1}>{displayName}</Text>
                          <AnimatedBar
                            pct={Math.min(conf, 100)}
                            color={idx === 0 ? C.green : C.greenMid}
                            height={5}
                            delay={240 + idx * 70}
                          />
                        </View>
                        <Text style={[styles.predPct, { color: idx === 0 ? C.green : C.textSecondary }]}>{conf}%</Text>
                      </View>
                    );
                  })}
                </View>
              </AnimatedCard>
            )}

            {/* AI Diagnosis */}
            {diseaseResult.diagnosis && (
              <AnimatedCard delay={200}>
                <View style={[styles.diagCard, { borderTopColor: isHealthy ? C.green : C.purple }]}>
                  <View style={styles.cardHeader}>
                    <IconCircle
                      name={isHealthy ? 'leaf' : 'robot-outline'}
                      size={17}
                      iconColor={isHealthy ? C.green : C.purple}
                      bgColor={isHealthy ? C.greenLight : C.purpleLight}
                      circleSize={34}
                    />
                    <Text style={[styles.diagTitle, { color: isHealthy ? C.green : C.purple }]}>
                      {isHealthy ? 'AI Health Report' : 'AI Diagnosis'}
                    </Text>
                  </View>

                  <Text style={styles.diagDesc}>{diseaseResult.diagnosis.description}</Text>

                  {diseaseResult.diagnosis.severity && diseaseResult.diagnosis.severity !== 'none' && (
                    <View style={[styles.severityChip, {
                      backgroundColor:
                        ['severe', 'critical'].includes(diseaseResult.diagnosis.severity) ? C.redLight :
                        diseaseResult.diagnosis.severity === 'moderate' ? C.amberLight : C.greenLight,
                    }]}>
                      <MaterialCommunityIcons
                        name="thermometer-alert"
                        size={12}
                        color={
                          ['severe', 'critical'].includes(diseaseResult.diagnosis.severity) ? C.red :
                          diseaseResult.diagnosis.severity === 'moderate' ? C.amber : C.green
                        }
                      />
                      <Text style={[styles.severityText, {
                        color:
                          ['severe', 'critical'].includes(diseaseResult.diagnosis.severity) ? C.red :
                          diseaseResult.diagnosis.severity === 'moderate' ? C.amber : C.green,
                      }]}>
                        {diseaseResult.diagnosis.severity.toUpperCase()} SEVERITY
                      </Text>
                    </View>
                  )}

                  {diseaseResult.diagnosis.symptoms?.length > 0 && (
                    <DiagSection
                      icon="eye-outline"
                      title={isHealthy ? 'Health Indicators' : 'Symptoms'}
                      items={diseaseResult.diagnosis.symptoms}
                      accentColor={isHealthy ? C.green : C.purple}
                      accentBg={isHealthy ? C.greenLight : C.purpleLight}
                    />
                  )}
                  {diseaseResult.diagnosis.treatment_steps?.length > 0 && (
                    <DiagSection
                      icon={isHealthy ? 'heart-outline' : 'medical-bag'}
                      title={isHealthy ? 'Care Tips' : 'Treatment Steps'}
                      items={diseaseResult.diagnosis.treatment_steps}
                      accentColor={isHealthy ? C.green : C.purple}
                      accentBg={isHealthy ? C.greenLight : C.purpleLight}
                      numbered
                    />
                  )}
                  {diseaseResult.diagnosis.prevention?.length > 0 && (
                    <DiagSection
                      icon="shield-outline"
                      title={isHealthy ? 'Watch Out For' : 'Prevention'}
                      items={diseaseResult.diagnosis.prevention}
                      accentColor={isHealthy ? C.green : C.purple}
                      accentBg={isHealthy ? C.greenLight : C.purpleLight}
                    />
                  )}
                  {diseaseResult.diagnosis.organic_options?.length > 0 && (
                    <DiagSection
                      icon="sprout-outline"
                      title={isHealthy ? 'Organic Care' : 'Organic Solutions'}
                      items={diseaseResult.diagnosis.organic_options}
                      accentColor={C.green}
                      accentBg={C.greenLight}
                    />
                  )}
                </View>
              </AnimatedCard>
            )}

            {!diseaseResult.diagnosis && !isHealthy && (
              <AnimatedCard delay={220}>
                <View style={styles.offlineCard}>
                  <IconCircle name="wifi-off" size={17} iconColor={C.amber} bgColor={C.amberLight} circleSize={36} />
                  <Text style={styles.offlineText}>
                    Connect to internet for detailed AI diagnosis and treatment recommendations.
                  </Text>
                </View>
              </AnimatedCard>
            )}

            <AnimatedCard delay={270}>
              <TouchableOpacity
                style={styles.rescanBtn}
                onPress={() => { setDiseaseResult(null); setImage(null); }}
              >
                <MaterialCommunityIcons name="refresh" size={17} color={C.green} />
                <Text style={[styles.rescanText, { color: C.green }]}>Scan Another Plant</Text>
              </TouchableOpacity>
            </AnimatedCard>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* WATER STRESS RESULTS                                             */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {mode === 'water_stress' && stressResult && (
          <View>
            {stressResult.status === 'no_vegetation' ? (
              <AnimatedCard delay={0}>
                <View style={styles.noVegCard}>
                  <IconCircle name="image-off-outline" size={26} iconColor={C.amber} bgColor={C.amberLight} circleSize={56} />
                  <Text style={styles.noVegTitle}>No Vegetation Detected</Text>
                  <Text style={styles.noVegText}>{stressResult.message}</Text>
                </View>
              </AnimatedCard>
            ) : (
              <>
                {/* ── Classification + Crop Health ── */}
                <AnimatedCard delay={0}>
                  <Text style={styles.sectionTitle}>Crop Stress Analysis</Text>
                  <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: stressColor }]}>
                    <View style={styles.healthRow}>
                      <IconCircle
                        name={stressIconName}
                        size={28}
                        iconColor={stressColor}
                        bgColor={stressColor + '18'}
                        circleSize={56}
                      />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.classLabel}>Water Stress Level</Text>
                        <Text style={[styles.classValue, { color: stressColor }]}>
                          {stressResult.classification}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metricsGrid}>
                      {[
                        { label: 'Health Score', value: `${stressResult.crop_health_score}/10`,               color: stressColor,     icon: 'heart-pulse' as const },
                        { label: 'Coverage',     value: `${stressResult.vegetation_coverage_pct.toFixed(1)}%`, color: C.green,         icon: 'leaf' as const },
                        { label: 'Grid',          value: `${stressResult.grid_resolution}×${stressResult.grid_resolution}`, color: C.blue, icon: 'grid' as const },
                        { label: 'Time',          value: `${stressResult.processing_time_ms}ms`,              color: C.textSecondary, icon: 'timer-outline' as const },
                      ].map((m, i) => (
                        <View
                          key={i}
                          style={[
                            styles.metricCell,
                            i < 3 && { borderRightWidth: 1, borderRightColor: C.divider },
                          ]}
                        >
                          <MaterialCommunityIcons name={m.icon} size={13} color={m.color} style={{ marginBottom: 3 }} />
                          <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                          <Text style={styles.metricLabel}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </AnimatedCard>

                {/* ── Vegetation Indices ── */}
                <AnimatedCard delay={60}>
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <IconCircle name="chart-timeline-variant" size={15} iconColor={C.blue} bgColor={C.blueLight} circleSize={32} />
                      <Text style={styles.cardTitle}>Vegetation Indices</Text>
                    </View>
                    <View style={styles.metricsGrid}>
                      {[
                        { label: 'VARI',  value: stressResult.vegetation_indices?.vari?.toFixed(3) ?? variscore, color: C.green, icon: 'leaf' as const },
                        { label: 'ExG',   value: stressResult.vegetation_indices?.exg?.toFixed(3) ?? '--',       color: C.blue,  icon: 'grass' as const },
                        { label: 'NGRDI', value: stressResult.vegetation_indices?.ngrdi?.toFixed(3) ?? '--',     color: C.amber, icon: 'weather-sunny' as const },
                      ].map((m, i) => (
                        <View
                          key={i}
                          style={[
                            styles.metricCell,
                            i < 2 && { borderRightWidth: 1, borderRightColor: C.divider },
                          ]}
                        >
                          <MaterialCommunityIcons name={m.icon} size={13} color={m.color} style={{ marginBottom: 3 }} />
                          <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                          <Text style={styles.metricLabel}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </AnimatedCard>

                {/* ── Heatmap ── */}
                {stressResult.heatmap_image && (
                  <AnimatedCard delay={120}>
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <IconCircle name="map-outline" size={15} iconColor={C.blue} bgColor={C.blueLight} circleSize={32} />
                        <Text style={styles.cardTitle}>Stress Heatmap</Text>
                        <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600' }}>
                          {stressResult.grid_resolution}×{stressResult.grid_resolution}
                        </Text>
                      </View>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${stressResult.heatmap_image}` }}
                        style={styles.heatmapImage}
                        resizeMode="contain"
                      />
                    </View>
                  </AnimatedCard>
                )}

                {/* ── Recommendation ── */}
                <AnimatedCard delay={180}>
                  <View style={[styles.adviceCard, { borderLeftColor: stressColor }]}>
                    <View style={styles.cardHeader}>
                      <IconCircle
                        name="robot-outline"
                        size={17}
                        iconColor={stressColor}
                        bgColor={stressColor + '18'}
                        circleSize={34}
                      />
                      <Text style={[styles.adviceTitle, { color: stressColor }]}>Irrigation Recommendation</Text>
                    </View>
                    <Text style={styles.adviceText}>
                      {stressResult.recommendation || 'No recommendation available.'}
                    </Text>
                  </View>
                </AnimatedCard>

                {/* ── Navigation to detailed screens ── */}
                <AnimatedCard delay={220}>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.navBtn, { backgroundColor: C.blueLight, borderColor: C.blueMid }]}
                      onPress={() => navigation.navigate('WaterStressDetail', { result: stressResult })}
                      activeOpacity={0.78}
                    >
                      <IconCircle name="chart-box-outline" size={17} iconColor={C.blue} bgColor={C.blueLight} circleSize={34} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.navBtnTitle, { color: C.blue }]}>Detailed Analysis</Text>
                        <Text style={styles.navBtnSub}>Full dashboard with stress distribution & grid</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={C.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navBtn, { backgroundColor: C.greenLight, borderColor: C.greenMid }]}
                      onPress={() => navigation.navigate('WaterStressLiveScan')}
                      activeOpacity={0.78}
                    >
                      <IconCircle name="camera-iris" size={17} iconColor={C.green} bgColor={C.greenLight} circleSize={34} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.navBtnTitle, { color: C.green }]}>Live Camera Scan</Text>
                        <Text style={styles.navBtnSub}>Real-time AR overlay with stress grid</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={C.green} />
                    </TouchableOpacity>
                  </View>
                </AnimatedCard>
              </>
            )}

            <AnimatedCard delay={260}>
              <TouchableOpacity
                style={[styles.rescanBtn, { borderColor: C.blueMid }]}
                onPress={() => { setStressResult(null); setImage(null); }}
              >
                <MaterialCommunityIcons name="refresh" size={17} color={C.blue} />
                <Text style={[styles.rescanText, { color: C.blue }]}>Scan Another Area</Text>
              </TouchableOpacity>
            </AnimatedCard>
          </View>
        )}

        <View style={{ height: 56 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.hdrMid,
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: '#071A07',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.textWhite,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.52)',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.2,
  },

  // Toggle
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderRadius: 26,
    padding: 4,
    position: 'relative',
  },
  togglePill: {
    position: 'absolute',
    top: 4,
    left: 0,
    height: 38,
    borderRadius: 22,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    gap: 6,
    zIndex: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.1,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14 },

  // Mode chip
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  modeChipText: { fontSize: 12, fontWeight: '600' },

  // ── Image card ───────────────────────────────────────────────────────────────
  imageCard: {
    height: 248,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 14,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },

  // Concentric rings
  ring3: {
    width: 144, height: 144, borderRadius: 72,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  ring2: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  ring1: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  placeholderTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  placeholderHint: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  // Scan overlay
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,26,6,0.76)',
  },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 26,
    height: 2,
    borderTopWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  // Scan corners
  cornerTL: { position: 'absolute', top: 16, left: 16, width: 22, height: 22, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { position: 'absolute', top: 16, right: 16, width: 22, height: 22, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { position: 'absolute', bottom: 16, left: 16, width: 22, height: 22, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { position: 'absolute', bottom: 16, right: 16, width: 22, height: 22, borderBottomWidth: 3, borderRightWidth: 3 },
  scanTextWrap: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanLabel: { color: C.textWhite, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  scanSubLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 12 },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 28,
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.greenMid,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  btnGalleryText: { fontSize: 14, fontWeight: '700', color: C.green },
  btnScan: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 28,
    gap: 8,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 7,
  },
  btnScanText: { fontSize: 15, fontWeight: '800', color: C.textWhite },

  // ── Cards ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 10,
    marginTop: 2,
  },

  // Method badge
  methodBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 14,
  },
  methodText: { fontSize: 12, fontWeight: '700' },

  // Health card
  healthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  healthStatus: { fontSize: 18, fontWeight: '800' },
  diseaseNameText: { fontSize: 13, color: C.textSecondary, fontWeight: '500', marginTop: 3 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  confLabel: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  confValue: { fontSize: 13, fontWeight: '800' },

  // Animated bar
  barBg: { backgroundColor: '#E8EEE8', borderRadius: 5, overflow: 'hidden', width: '100%' },
  barFill: { borderRadius: 5 },

  // Predictions
  predRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  predRank: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  predRankText: { fontSize: 12, fontWeight: '800' },
  predName: { fontSize: 13, color: C.textPrimary, fontWeight: '500', marginBottom: 4 },
  predPct: { fontSize: 13, fontWeight: '800', width: 42, textAlign: 'right' },

  // Diagnosis card
  diagCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  diagTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  diagDesc: { fontSize: 13, lineHeight: 20, color: C.textPrimary, marginBottom: 10 },
  severityChip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 10,
    marginBottom: 10,
  },
  severityText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  diagSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  diagSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  diagSectionTitle: { fontSize: 13, fontWeight: '700' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  stepNumText: { color: C.textWhite, fontSize: 11, fontWeight: '800' },

  // Offline
  offlineCard: {
    flexDirection: 'row',
    backgroundColor: C.amberLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
  },
  offlineText: { flex: 1, fontSize: 13, color: '#6B4000', lineHeight: 19 },

  // No veg
  noVegCard: {
    backgroundColor: C.amberLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.amber,
  },
  noVegTitle: { fontSize: 16, fontWeight: '700', color: C.amber, marginTop: 10, marginBottom: 5 },
  noVegText: { fontSize: 13, color: '#6B4000', textAlign: 'center', lineHeight: 19 },

  // Classification
  classLabel: {
    fontSize: 10, color: C.textMuted, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4,
  },
  classValue: { fontSize: 17, fontWeight: '800' },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  metricCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  metricValue: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  metricLabel: {
    fontSize: 9, color: C.textMuted, fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center',
  },

  // Legend
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  legendBar: { width: 4, height: 22, borderRadius: 2 },
  legendRange: { fontSize: 12, fontWeight: '700', color: C.textPrimary, width: 82 },
  legendDesc: { fontSize: 13, color: C.textSecondary, flex: 1 },

  // Heatmap
  heatmapImage: { width: '100%', height: 210, borderRadius: 10, marginBottom: 8, marginTop: 4 },
  heatmapCaption: { fontSize: 11, color: C.textMuted, textAlign: 'center' },

  // Grid
  gridRow: { flexDirection: 'row', justifyContent: 'center' },
  gridCell: { fontSize: 17, margin: 1 },

  // Advice
  adviceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adviceTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  adviceText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },

  // Rescan
  rescanBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.greenMid,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rescanText: { fontSize: 14, fontWeight: '700' },

  // Navigation buttons to detail/live screens
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  navBtnTitle: { fontSize: 14, fontWeight: '700' },
  navBtnSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
});
