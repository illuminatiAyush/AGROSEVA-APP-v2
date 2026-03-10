/**
 * WaterStressService.ts
 *
 * Sends a plant photo to POST /vision/water-stress-scan and returns the
 * full multi-index analysis result including VARI/ExG/NGRDI scores,
 * crop health score, 32×32 stress grid, heatmap, zone summary,
 * stress distribution, and irrigation recommendation.
 */
import { IRRIGATION_BRAIN_API } from '@/config/api';

// ── 7-Level stress grid labels ─────────────────────────────────────────────
export type StressLabel =
  | 'dark_green'
  | 'green'
  | 'light_green'
  | 'yellow_green'
  | 'yellow'
  | 'orange'
  | 'red';

// ── Zone summary entry ─────────────────────────────────────────────────────
export interface ZoneSummaryEntry {
  count: number;
  pct: number;
}

// ── Threshold reference entry (returned by server) ─────────────────────────
export interface StressThreshold {
  label: StressLabel;
  classification: string;
  score_min: number;
  score_max: number;
  color: string;
}

// ── Vegetation indices ─────────────────────────────────────────────────────
export interface VegetationIndices {
  vari: number;
  exg: number;
  ngrdi: number;
}

// ── Full response type (mirrors the backend JSON shape) ────────────────────
export interface WaterStressResult {
  /** "success" | "no_vegetation" */
  status: 'success' | 'no_vegetation';

  /** Mean raw VARI value across all vegetation pixels */
  average_vari: number;

  /** Overall 7-level classification string */
  classification: string;

  /** Base64-encoded JPEG of heatmap (null = no vegetation) */
  heatmap_image: string | null;

  /** 32×32 grid of 7-level stress labels */
  stress_map: StressLabel[][];

  /** Count + percentage of grid cells at each stress level */
  zone_summary: Partial<Record<StressLabel, ZoneSummaryEntry>>;

  /** Full threshold reference table (7 entries) */
  thresholds: StressThreshold[];

  /** Wall-clock processing time on the server (ms) */
  processing_time_ms: number;

  /** Percentage of image pixels identified as vegetation */
  vegetation_coverage_pct: number;

  /** Crop health score on 0–10 scale */
  crop_health_score: number;

  /** Multi-index vegetation scores */
  vegetation_indices: VegetationIndices;

  /** Stress distribution by display name (percentage) */
  stress_distribution: Record<string, number>;

  /** Grid resolution (32) */
  grid_resolution: number;

  /** Farmer-facing irrigation recommendation */
  recommendation: string;

  /** Present only when status = "no_vegetation" */
  message?: string;
}

// ── Service object ─────────────────────────────────────────────────────────
export const WaterStressService = {
  /**
   * Send a plant image to the backend for multi-index water stress analysis.
   */
  scan: async (imageUri: string): Promise<WaterStressResult> => {
    console.log('[WaterStressService] Sending image to backend...');

    const formData = new FormData();

    const filename = imageUri.split('/').pop() || 'plant.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    try {
      const response = await fetch(IRRIGATION_BRAIN_API.WATER_STRESS, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[WaterStressService] Result:', JSON.stringify(data).substring(0, 200));
      return data as WaterStressResult;
    } catch (error: any) {
      console.error('[WaterStressService] Error:', error.message);
      if (error.message?.includes('Network request failed')) {
        throw new Error(
          'Cannot reach backend server. Make sure the server is running and your IP is correct in api.ts',
        );
      }
      throw error;
    }
  },
};
