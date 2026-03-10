/**
 * LiveCameraOverlayScreen.tsx
 *
 * 🔒 FUTURE FEATURE — CURRENTLY DISABLED
 *
 * This file implements the real-time camera overlay mode for plant water stress
 * detection. It processes camera frames on-device using VARI vegetation index
 * and renders a translucent colored grid overlay over the live camera preview.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 *   Camera → Frame Processor → Vegetation Detection → VARI Index → 8×8 Grid
 *   → Stress Classification → Overlay Mask → Rendered over Preview
 *
 * INTEGRATION PLAN (when ready to enable):
 *   1. Install dependencies:
 *        npx expo install react-native-vision-camera
 *        npx expo install vision-camera-frame-processors
 *        npx expo install react-native-worklets-core
 *
 *   2. Switch from Expo Go to a development build:
 *        npx expo run:android  (or run:ios)
 *
 *   3. In CameraScreen.tsx, add "Live Scan" as a third scan mode:
 *        type ScanMode = 'disease' | 'water_stress' | 'live_scan';
 *      And render <LiveCameraOverlayScreen /> when mode === 'live_scan'
 *
 *   4. Uncomment this entire file.
 *
 * ARCHITECTURE:
 *   - Gallery path continues using POST /vision/water-stress-scan (backend — 7-level)
 *   - Camera path uses this screen for real-time on-device overlay
 *   - Backend is NOT modified by this feature
 *
 * PERFORMANCE TARGETS:
 *   - Processing resolution: 128×128 (fast, < 40ms per frame)
 *   - Skip every other frame → effective 30fps with ~40ms analysis cadence
 *   - Grid: 8×8 cells, classified and colored in real time
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════════════════════
// ALL CODE BELOW IS COMMENTED OUT — REQUIRES DEVELOPMENT BUILD + DEPENDENCIES
// ══════════════════════════════════════════════════════════════════════════════

/*
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  runAtTargetFps,
} from 'react-native-vision-camera';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import ReanimatedView from 'react-native-reanimated/lib/typescript/component/View';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── 7-level VARI thresholds (mirrors backend stress_detector.py) ──────────────
const THRESHOLD_EXCELLENT = 0.40;
const THRESHOLD_HEALTHY   = 0.30;
const THRESHOLD_GOOD      = 0.25;
const THRESHOLD_MILD      = 0.20;
const THRESHOLD_MODERATE  = 0.15;
const THRESHOLD_HIGH      = 0.08;
// ≤ 0.08  → CRITICAL (red)

// ── Color map for 7 stress levels (RGBA overlays) ─────────────────────────────
const OVERLAY_COLORS: Record<string, string> = {
  dark_green:   'rgba(27,  94,  32,  0.42)',  // Excellent
  green:        'rgba(46,  125, 50,  0.40)',  // Healthy
  light_green:  'rgba(85,  139, 47,  0.38)',  // Good
  yellow_green: 'rgba(130, 119, 23,  0.40)',  // Mild Stress
  yellow:       'rgba(230, 81,  0,   0.42)',  // Moderate Stress
  orange:       'rgba(191, 54,  12,  0.44)',  // High Stress
  red:          'rgba(183, 28,  28,  0.50)',  // Critical
};

const OVERLAY_LABELS: Record<string, string> = {
  dark_green:   'Excellent',
  green:        'Healthy',
  light_green:  'Good',
  yellow_green: 'Mild Stress',
  yellow:       'Moderate',
  orange:       'High Stress',
  red:          'Critical',
};

const GRID_SIZE = 8;
const PROCESS_W = 128;
const PROCESS_H = 128;

// ── Worklet: classify a single VARI value into 7 levels ──────────────────────
function classifyCellVari(vari: number): string {
  'worklet';
  if (vari > THRESHOLD_EXCELLENT) return 'dark_green';
  if (vari > THRESHOLD_HEALTHY)   return 'green';
  if (vari > THRESHOLD_GOOD)      return 'light_green';
  if (vari > THRESHOLD_MILD)      return 'yellow_green';
  if (vari > THRESHOLD_MODERATE)  return 'yellow';
  if (vari > THRESHOLD_HIGH)      return 'orange';
  return 'red';
}

// ── Worklet: detect vegetation pixel (G > R AND G > B) ───────────────────────
function isVegetation(r: number, g: number, b: number): boolean {
  'worklet';
  return g > r && g > b;
}

// ── Worklet: compute VARI for a cell ─────────────────────────────────────────
function computeCellVari(r: number, g: number, b: number): number {
  'worklet';
  const denom = g + r - b + 1e-6;
  const vari = (g - r) / denom;
  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, vari));
}

// ── Main component ────────────────────────────────────────────────────────────
interface LiveCameraOverlayScreenProps {
  onClose: () => void;
}

export default function LiveCameraOverlayScreen({ onClose }: LiveCameraOverlayScreenProps) {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [stressGrid, setStressGrid] = useState<string[][]>([]);
  const [dominantLabel, setDominantLabel] = useState<string>('');
  const [vegetationPct, setVegetationPct] = useState(0);
  const frameCount = useRef(0);

  // Request camera permission on mount
  useEffect(() => {
    Camera.requestCameraPermission().then((status) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  // ── Frame processor (runs on native thread as a worklet) ──────────────────
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // Process only every second frame for performance
    frameCount.current += 1;
    if (frameCount.current % 2 !== 0) return;

    const { width, height, planes } = frame;

    // Build 8×8 cell stress grid
    const cellW = Math.floor(width / GRID_SIZE);
    const cellH = Math.floor(height / GRID_SIZE);
    const grid: string[][] = [];
    let totalVegPixels = 0;
    let totalPixels = 0;
    const labelCounts: Record<string, number> = {};

    for (let row = 0; row < GRID_SIZE; row++) {
      const gridRow: string[] = [];

      for (let col = 0; col < GRID_SIZE; col++) {
        // Sample center pixel of each cell (fast approximation)
        const sampleX = Math.floor(col * cellW + cellW / 2);
        const sampleY = Math.floor(row * cellH + cellH / 2);

        // Access raw RGBA pixel data from the frame
        // Note: actual implementation depends on the frame format (NV21/YUV/RGBA)
        // React Native Vision Camera provides frame.toArrayBuffer() or plugins
        // This sample assumes an RGBA frame for clarity.
        const pixelIndex = (sampleY * width + sampleX) * 4;
        const pixelData = planes[0].data;
        const r = pixelData[pixelIndex + 0];
        const g = pixelData[pixelIndex + 1];
        const b = pixelData[pixelIndex + 2];

        totalPixels++;

        if (!isVegetation(r, g, b)) {
          gridRow.push('red');  // Non-vegetation cells are shown as background
        } else {
          totalVegPixels++;
          const vari = computeCellVari(r, g, b);
          const label = classifyCellVari(vari);
          gridRow.push(label);
          labelCounts[label] = (labelCounts[label] ?? 0) + 1;
        }
      }
      grid.push(gridRow);
    }

    // Find dominant stress label
    let maxCount = 0;
    let dominant = '';
    for (const [label, count] of Object.entries(labelCounts)) {
      if (count > maxCount) { maxCount = count; dominant = label; }
    }

    // Update React state (runs on JS thread)
    runAtTargetFps(15, () => {
      setStressGrid(grid);
      setDominantLabel(dominant);
      setVegetationPct(Math.round((totalVegPixels / totalPixels) * 100));
    });
  }, []);

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No camera device found.</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Camera permission not granted.</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const CELL_W = SCREEN_WIDTH / GRID_SIZE;
  const CELL_H = (SCREEN_HEIGHT * 0.7) / GRID_SIZE;

  return (
    <View style={styles.root}>
      {// Live Camera Preview }
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      {// Translucent 8×8 Grid Overlay }
      <View style={styles.overlayContainer} pointerEvents="none">
        {stressGrid.map((row, rIdx) => (
          <View key={rIdx} style={{ flexDirection: 'row' }}>
            {row.map((label, cIdx) => (
              <View
                key={cIdx}
                style={{
                  width: CELL_W,
                  height: CELL_H,
                  backgroundColor: OVERLAY_COLORS[label] ?? 'transparent',
                  borderWidth: 0.5,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {// HUD Status Bar — shows current dominant stress level at the top }
      <View style={styles.hudTop}>
        <View style={[styles.hudBadge, { backgroundColor: dominantLabel ? OVERLAY_COLORS[dominantLabel]?.replace('0.4', '0.85') : 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.hudBadgeText}>
            {dominantLabel ? OVERLAY_LABELS[dominantLabel] : 'Scanning...'}
          </Text>
          {vegetationPct > 0 && (
            <Text style={styles.hudVegText}>{vegetationPct}% vegetation</Text>
          )}
        </View>
      </View>

      {// No vegetation message }
      {vegetationPct < 5 && stressGrid.length > 0 && (
        <View style={styles.noVegOverlay}>
          <Text style={styles.noVegText}>No vegetation detected</Text>
          <Text style={styles.noVegHint}>Point camera at crop leaves</Text>
        </View>
      )}

      {// Bottom legend }
      <View style={styles.legendBar}>
        {Object.entries(OVERLAY_LABELS).map(([label, name]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: OVERLAY_COLORS[label]?.replace('0.4', '1') }]} />
            <Text style={styles.legendText}>{name}</Text>
          </View>
        ))}
      </View>

      {// Close button }
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>✕  Exit Live Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 24 },
  errorText: { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 },

  overlayContainer: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },

  hudTop: {
    position: 'absolute',
    top: 56, left: 0, right: 0,
    alignItems: 'center',
  },
  hudBadge: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  hudBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hudVegText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  noVegOverlay: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: 0, right: 0,
    alignItems: 'center',
  },
  noVegText: { color: '#fff', fontSize: 18, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 6 },
  noVegHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  legendBar: {
    position: 'absolute',
    bottom: 80, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  legendItem: { alignItems: 'center', gap: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '600' },

  closeBtn: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
*/

// ══════════════════════════════════════════════════════════════════════════════
// DEPENDENCY INSTALLATION (run when ready to enable):
// ══════════════════════════════════════════════════════════════════════════════
// npx expo install react-native-vision-camera
// npx expo install react-native-worklets-core
// npx expo run:android    ← required (Expo Go won't work with frame processors)
// ══════════════════════════════════════════════════════════════════════════════

export {};  // Keep TypeScript happy — this is a module even with commented content
