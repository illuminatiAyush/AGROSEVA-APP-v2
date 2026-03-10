/**
 * WaterStressLiveScanScreen.tsx
 *
 * Live camera scan mode for real-time plant water stress analysis.
 * Uses Expo Camera for preview + capture, then sends to backend for
 * full multi-index analysis and navigates to the detail screen.
 *
 * On-device features:
 * - Camera preview with scanning overlay animation
 * - Capture button → backend analysis → WaterStressDetail
 * - Quick veg metrics HUD
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WaterStressService } from '@/services/WaterStressService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Color palette (matches detail screen) ─────────────────────────────────────
const P = {
  bg: '#0B1A12',
  surface: '#122A1B',
  surfaceLight: '#1A3825',
  accent: '#4ADE80',
  accentBg: 'rgba(74, 222, 128, 0.12)',
  accentBorder: 'rgba(74, 222, 128, 0.25)',
  cyan: '#22D3EE',
  amber: '#FBBF24',
  rose: '#FB7185',
  textPrimary: '#E8F5EC',
  textSecondary: '#94B8A0',
  textMuted: '#5A7A66',
};

// ── Scanning grid overlay (32 lines) ──────────────────────────────────────────
const GRID_LINES = 32;

// ── Pulse animation rings ─────────────────────────────────────────────────────
function ScanPulse() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    [anim1, anim2].forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(anim, {
            toValue: 1, duration: 2000,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => { anim1.stopAnimation(); anim2.stopAnimation(); };
  }, []);

  return (
    <View style={ss.pulseWrap} pointerEvents="none">
      {[anim1, anim2].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            ss.pulseRing,
            {
              opacity: anim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.5, 0],
              }),
              transform: [{
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.5],
                }),
              }],
              borderColor: P.accent,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Scan line animation ───────────────────────────────────────────────────────
function ScanLine() {
  const lineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineY, {
          toValue: 1, duration: 2400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(lineY, {
          toValue: 0, duration: 2400,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    ).start();
    return () => lineY.stopAnimation();
  }, []);

  return (
    <Animated.View
      style={[
        ss.scanLine,
        {
          transform: [{
            translateY: lineY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SCREEN_HEIGHT * 0.6],
            }),
          }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function WaterStressLiveScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [scanActive, setScanActive] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || analyzing) return;

    try {
      setAnalyzing(true);
      setScanActive(false);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      // Resize for backend
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8 },
      );

      // Send to backend
      const result = await WaterStressService.scan(manipulated.uri);

      // Navigate to detail screen
      navigation.replace('WaterStressDetail', { result });
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message || 'Could not analyze the image.');
      setAnalyzing(false);
      setScanActive(true);
    }
  };

  // ── Permission not granted ──
  if (!permission) {
    return (
      <View style={ss.centered}>
        <ActivityIndicator size="large" color={P.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={ss.centered}>
        <MaterialCommunityIcons name="camera-off-outline" size={48} color={P.textMuted} />
        <Text style={ss.permTitle}>Camera Access Required</Text>
        <Text style={ss.permSub}>Allow camera access to scan crops for water stress</Text>
        <TouchableOpacity style={ss.permBtn} onPress={requestPermission}>
          <Text style={ss.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.backBtnAlt} onPress={() => navigation.goBack()}>
          <Text style={ss.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={[ss.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Camera Preview ── */}
      <CameraView
        ref={cameraRef}
        style={ss.camera}
        facing="back"
      >
        {/* Grid overlay */}
        {scanActive && (
          <View style={ss.gridOverlay} pointerEvents="none">
            {Array.from({ length: GRID_LINES - 1 }).map((_, i) => (
              <View
                key={`h${i}`}
                style={[
                  ss.gridLineH,
                  { top: `${((i + 1) / GRID_LINES) * 100}%` },
                ]}
              />
            ))}
            {Array.from({ length: GRID_LINES - 1 }).map((_, i) => (
              <View
                key={`v${i}`}
                style={[
                  ss.gridLineV,
                  { left: `${((i + 1) / GRID_LINES) * 100}%` },
                ]}
              />
            ))}
          </View>
        )}

        {/* Scan line animation */}
        {scanActive && <ScanLine />}

        {/* Pulse rings */}
        {scanActive && <ScanPulse />}

        {/* Corner brackets */}
        <View style={[ss.corner, ss.cornerTL]} />
        <View style={[ss.corner, ss.cornerTR]} />
        <View style={[ss.corner, ss.cornerBL]} />
        <View style={[ss.corner, ss.cornerBR]} />
      </CameraView>

      {/* ── HUD Top Bar ── */}
      <View style={ss.hudTop}>
        <TouchableOpacity style={ss.hudBackBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={ss.hudBadge}>
          <View style={[ss.hudDot, { backgroundColor: scanActive ? P.accent : P.amber }]} />
          <Text style={ss.hudBadgeText}>
            {analyzing ? 'Analyzing...' : scanActive ? 'Live Scan Active' : 'Ready'}
          </Text>
        </View>
      </View>

      {/* ── HUD Info Strip ── */}
      <View style={ss.hudInfo}>
        <View style={ss.hudInfoItem}>
          <MaterialCommunityIcons name="grid" size={14} color={P.accent} />
          <Text style={ss.hudInfoText}>32×32 Grid</Text>
        </View>
        <View style={ss.hudInfoItem}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={14} color={P.cyan} />
          <Text style={ss.hudInfoText}>VARI + ExG + NGRDI</Text>
        </View>
        <View style={ss.hudInfoItem}>
          <MaterialCommunityIcons name="leaf" size={14} color={P.accent} />
          <Text style={ss.hudInfoText}>RGB Analysis</Text>
        </View>
      </View>

      {/* ── Bottom Controls ── */}
      <View style={ss.bottomBar}>
        <Text style={ss.captureHint}>
          Point camera at crop leaves, then tap to analyze
        </Text>

        <TouchableOpacity
          style={[ss.captureBtn, analyzing && { opacity: 0.5 }]}
          onPress={handleCapture}
          disabled={analyzing}
          activeOpacity={0.7}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color={P.bg} />
          ) : (
            <>
              <MaterialCommunityIcons name="camera-iris" size={28} color={P.bg} />
            </>
          )}
        </TouchableOpacity>

        <Text style={ss.captureLabel}>
          {analyzing ? 'Processing...' : 'Capture & Analyze'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  centered: {
    flex: 1, backgroundColor: P.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },

  // Camera
  camera: { flex: 1 },

  // Grid overlay
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0,
    width: 1, backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },

  // Scan line
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2,
    backgroundColor: P.accent,
    shadowColor: P.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },

  // Pulse
  pulseWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5,
  },

  // Corners
  corner: {
    position: 'absolute',
    width: 28, height: 28,
    borderColor: P.accent,
  },
  cornerTL: { top: 60, left: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 6 },
  cornerTR: { top: 60, right: 16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 6 },
  cornerBL: { bottom: 220, left: 16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 220, right: 16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 6 },

  // HUD
  hudTop: {
    position: 'absolute', top: 52, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  hudBackBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(11, 26, 18, 0.75)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  hudBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(11, 26, 18, 0.75)',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.15)',
  },
  hudDot: { width: 8, height: 8, borderRadius: 4 },
  hudBadgeText: { color: P.textPrimary, fontSize: 12, fontWeight: '700' },

  // HUD info strip
  hudInfo: {
    position: 'absolute', bottom: 212, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(11, 26, 18, 0.6)',
  },
  hudInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hudInfoText: { color: P.textSecondary, fontSize: 10, fontWeight: '600' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 40, paddingTop: 20,
    backgroundColor: 'rgba(11, 26, 18, 0.92)',
    borderTopWidth: 1, borderTopColor: 'rgba(74, 222, 128, 0.12)',
  },
  captureHint: {
    color: P.textMuted, fontSize: 12, fontWeight: '500',
    marginBottom: 16, textAlign: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: P.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: P.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  captureLabel: {
    color: P.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 10,
  },

  // Permission
  permTitle: { color: P.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 },
  permSub: { color: P.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  permBtn: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 28,
    backgroundColor: P.accent, borderRadius: 14,
  },
  permBtnText: { color: P.bg, fontSize: 14, fontWeight: '700' },
  backBtnAlt: { marginTop: 14 },
  backBtnAltText: { color: P.textMuted, fontSize: 13, fontWeight: '600' },
});
