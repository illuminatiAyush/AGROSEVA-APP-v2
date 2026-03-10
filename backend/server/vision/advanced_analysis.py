"""
advanced_analysis.py — Multi-Index Vegetation Analysis Engine (32×32 Grid).

Upgraded pipeline for precision crop stress mapping:

    Image → Lighting Normalization → Vegetation Segmentation
    → Multi-Index Analysis (VARI + ExG + NGRDI)
    → Stress Score Fusion → Spatial Smoothing
    → 32×32 Grid Analysis → 7-Level Classification
    → High-Resolution Heatmap → Crop Health Score + Recommendation

This module does NOT modify any existing DRL, disease detection, or legacy
vision analysis code.  It is imported exclusively by vision/routes.py.
"""

import cv2
import base64
import numpy as np

# ── Constants ──────────────────────────────────────────────────────────────────
GRID_SIZE = 32  # 32×32 = 1024 zones
PROCESS_SIZE = (512, 512)
EPSILON = 1e-6

# ── Fusion weights ─────────────────────────────────────────────────────────────
W_VARI  = 0.45
W_EXG   = 0.35
W_NGRDI = 0.20

# ── 7-Level stress thresholds (on fused 0–1 scale) ────────────────────────────
LEVEL_THRESHOLDS = [
    (0.85, "dark_green",   "Excellent"),
    (0.70, "green",        "Healthy"),
    (0.60, "light_green",  "Good"),
    (0.50, "yellow_green", "Mild Stress"),
    (0.40, "yellow",       "Moderate Stress"),
    (0.30, "orange",       "High Stress"),
    # < 0.30 → red / Critical
]

ALL_LABELS = (
    "dark_green", "green", "light_green",
    "yellow_green", "yellow", "orange", "red",
)

GLOBAL_CLASSIFICATIONS = {
    "dark_green":   "Excellent — No Irrigation Needed",
    "green":        "Healthy — No Irrigation Needed",
    "light_green":  "Good — Monitor Soil Moisture",
    "yellow_green": "Mild Stress — Irrigate Soon",
    "yellow":       "Moderate Stress — Irrigate Today",
    "orange":       "High Stress — Irrigate Urgently",
    "red":          "Critical — Irrigate Immediately",
}

LEVEL_DISPLAY_NAMES = {
    "dark_green":   "Excellent",
    "green":        "Healthy",
    "light_green":  "Good",
    "yellow_green": "Mild Stress",
    "yellow":       "Moderate Stress",
    "orange":       "High Stress",
    "red":          "Critical",
}

# ── Heatmap overlay colors (BGR for OpenCV) ────────────────────────────────────
OVERLAY_COLORS_BGR = {
    "dark_green":   (32,  94,  27),
    "green":        (71,  160, 67),
    "light_green":  (101, 204, 156),
    "yellow_green": (87,  225, 212),
    "yellow":       (38,  167, 255),
    "orange":       (0,   108, 239),
    "red":          (40,  40,  198),
}

OVERLAY_ALPHA = 0.40

# Threshold reference (returned in every response for self-documentation)
THRESHOLD_REFERENCE = [
    {"label": "dark_green",   "classification": GLOBAL_CLASSIFICATIONS["dark_green"],   "score_min": 0.85, "score_max": 1.00, "color": "#1B5E20"},
    {"label": "green",        "classification": GLOBAL_CLASSIFICATIONS["green"],        "score_min": 0.70, "score_max": 0.85, "color": "#43A047"},
    {"label": "light_green",  "classification": GLOBAL_CLASSIFICATIONS["light_green"],  "score_min": 0.60, "score_max": 0.70, "color": "#9CCC65"},
    {"label": "yellow_green", "classification": GLOBAL_CLASSIFICATIONS["yellow_green"], "score_min": 0.50, "score_max": 0.60, "color": "#D4E157"},
    {"label": "yellow",       "classification": GLOBAL_CLASSIFICATIONS["yellow"],       "score_min": 0.40, "score_max": 0.50, "color": "#FFA726"},
    {"label": "orange",       "classification": GLOBAL_CLASSIFICATIONS["orange"],       "score_min": 0.30, "score_max": 0.40, "color": "#EF6C00"},
    {"label": "red",          "classification": GLOBAL_CLASSIFICATIONS["red"],          "score_min": 0.00, "score_max": 0.30, "color": "#C62828"},
]


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Lighting Normalization
# ══════════════════════════════════════════════════════════════════════════════
def normalize_lighting(img: np.ndarray) -> np.ndarray:
    """
    Normalize image lighting via LAB color space L-channel equalization.

    RGB → LAB → Normalize L → LAB → RGB (BGR in OpenCV terms).
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    # CLAHE for adaptive histogram equalization on the L channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_normalized = clahe.apply(l_channel)

    lab_normalized = cv2.merge([l_normalized, a_channel, b_channel])
    return cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Vegetation Segmentation
# ══════════════════════════════════════════════════════════════════════════════
def create_vegetation_mask(img: np.ndarray) -> np.ndarray:
    """
    Segment vegetation pixels using green ratio: G / (R + B) > 0.55.

    Args:
        img: BGR uint8 image.

    Returns:
        Boolean mask, True = vegetation pixel.
    """
    img_f = img.astype(np.float32)
    B = img_f[:, :, 0]
    G = img_f[:, :, 1]
    R = img_f[:, :, 2]

    denominator = R + B + EPSILON
    green_ratio = G / denominator
    mask = green_ratio > 0.55
    return mask


def has_vegetation(mask: np.ndarray, min_fraction: float = 0.03) -> bool:
    """Check if at least min_fraction of pixels are vegetation."""
    return (np.sum(mask) / mask.size) >= min_fraction


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Multi-Index Vegetation Analysis
# ══════════════════════════════════════════════════════════════════════════════
def compute_multi_indices(img: np.ndarray, mask: np.ndarray) -> dict:
    """
    Compute VARI, ExG, and NGRDI vegetation indices.

    All indices are normalized to [0, 1] range.

    Returns:
        Dict with 'vari', 'exg', 'ngrdi' keys → float32 arrays (NaN for non-veg).
        Also 'vari_avg', 'exg_avg', 'ngrdi_avg' for mean values.
    """
    img_f = img.astype(np.float32)
    B = img_f[:, :, 0]
    G = img_f[:, :, 1]
    R = img_f[:, :, 2]

    # ── VARI = (G - R) / (G + R - B + ε) ──
    vari = (G - R) / (G + R - B + EPSILON)
    vari = np.clip(vari, -1.0, 1.0)
    # Normalize -1..1 → 0..1
    vari_norm = (vari + 1.0) / 2.0

    # ── ExG = 2G - R - B  (normalized by channel range) ──
    exg = 2.0 * G - R - B
    # Theoretical: -510..510 for uint8 input
    exg_norm = (exg + 510.0) / 1020.0
    exg_norm = np.clip(exg_norm, 0.0, 1.0)

    # ── NGRDI = (G - R) / (G + R + ε) ──
    ngrdi = (G - R) / (G + R + EPSILON)
    ngrdi = np.clip(ngrdi, -1.0, 1.0)
    # Normalize -1..1 → 0..1
    ngrdi_norm = (ngrdi + 1.0) / 2.0

    # Mask non-vegetation
    for arr in (vari_norm, exg_norm, ngrdi_norm):
        arr[~mask] = np.nan

    # Compute averages over vegetation pixels
    def safe_mean(arr):
        valid = arr[mask & ~np.isnan(arr)]
        return float(np.mean(valid)) if len(valid) > 0 else 0.0

    return {
        "vari": vari_norm.astype(np.float32),
        "exg": exg_norm.astype(np.float32),
        "ngrdi": ngrdi_norm.astype(np.float32),
        "vari_avg": round(safe_mean(vari_norm), 4),
        "exg_avg": round(safe_mean(exg_norm), 4),
        "ngrdi_avg": round(safe_mean(ngrdi_norm), 4),
        # Also store raw VARI average (un-normalized, for backward compat)
        "vari_raw_avg": round(safe_mean((vari + 1.0) / 2.0 * 2.0 - 1.0), 4),
    }


# Provide backward-compatible raw VARI average
def compute_average_vari_raw(img: np.ndarray, mask: np.ndarray) -> float:
    """Compute raw (un-normalized) VARI mean for backward compatibility."""
    img_f = img.astype(np.float32)
    B, G, R = img_f[:, :, 0], img_f[:, :, 1], img_f[:, :, 2]
    vari = (G - R) / (G + R - B + EPSILON)
    vari = np.clip(vari, -1.0, 1.0)
    vari[~mask] = np.nan
    valid = vari[mask & ~np.isnan(vari)]
    return float(np.mean(valid)) if len(valid) > 0 else 0.0


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Stress Score Fusion
# ══════════════════════════════════════════════════════════════════════════════
def fuse_stress_score(indices: dict) -> np.ndarray:
    """
    Fuse VARI, ExG, NGRDI into a single stress score (0–1).

    stress_score = 0.45 * VARI_norm + 0.35 * ExG_norm + 0.20 * NGRDI_norm
    """
    vari = indices["vari"]
    exg  = indices["exg"]
    ngrdi = indices["ngrdi"]

    # Replace NaN with 0 for computation, then re-mask
    v = np.nan_to_num(vari, nan=0.0)
    e = np.nan_to_num(exg, nan=0.0)
    n = np.nan_to_num(ngrdi, nan=0.0)

    fused = W_VARI * v + W_EXG * e + W_NGRDI * n
    fused = np.clip(fused, 0.0, 1.0)

    # Re-mask non-vegetation as NaN
    nan_mask = np.isnan(vari)  # any index NaN → pixel is non-veg
    fused[nan_mask] = np.nan

    return fused.astype(np.float32)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Spatial Smoothing
# ══════════════════════════════════════════════════════════════════════════════
def apply_spatial_smoothing(score_map: np.ndarray) -> np.ndarray:
    """
    Apply Gaussian smoothing (9,9) to the fused stress map.
    NaN pixels are temporarily replaced with 0, smoothed, then re-masked.
    """
    nan_mask = np.isnan(score_map)
    temp = np.nan_to_num(score_map, nan=0.0)
    smoothed = cv2.GaussianBlur(temp, (9, 9), 0)
    smoothed[nan_mask] = np.nan
    return smoothed.astype(np.float32)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — 32×32 Grid Analysis
# ══════════════════════════════════════════════════════════════════════════════
def classify_cell(score: float) -> str:
    """Classify a fused score (0–1) into one of 7 stress levels."""
    if np.isnan(score):
        return "red"
    for threshold, label, _ in LEVEL_THRESHOLDS:
        if score >= threshold:
            return label
    return "red"


def analyze_grid(
    score_map: np.ndarray,
    mask: np.ndarray,
    grid_size: int = GRID_SIZE,
) -> tuple:
    """
    Divide fused stress map into grid_size × grid_size cells.

    Returns:
        (labels_2d, scores_2d)
        labels_2d: list[list[str]]  — 7-level label per cell
        scores_2d: list[list[float]] — average fused score per cell
    """
    h, w = score_map.shape
    cell_h = h // grid_size
    cell_w = w // grid_size

    labels_2d = []
    scores_2d = []

    for row in range(grid_size):
        label_row = []
        score_row = []
        for col in range(grid_size):
            y1 = row * cell_h
            y2 = y1 + cell_h if row < grid_size - 1 else h
            x1 = col * cell_w
            x2 = x1 + cell_w if col < grid_size - 1 else w

            cell_scores = score_map[y1:y2, x1:x2]
            cell_mask = mask[y1:y2, x1:x2]
            valid = cell_scores[cell_mask & ~np.isnan(cell_scores)]

            if len(valid) == 0:
                cell_mean = np.nan
            else:
                cell_mean = float(np.mean(valid))

            label_row.append(classify_cell(cell_mean))
            score_row.append(round(cell_mean, 4) if not np.isnan(cell_mean) else 0.0)

        labels_2d.append(label_row)
        scores_2d.append(score_row)

    return labels_2d, scores_2d


# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Zone Summary + Stress Distribution
# ══════════════════════════════════════════════════════════════════════════════
def compute_zone_summary(labels_2d: list) -> dict:
    """Count cells per stress level with percentages."""
    counts = {label: 0 for label in ALL_LABELS}
    total = 0
    for row in labels_2d:
        for cell in row:
            if cell in counts:
                counts[cell] += 1
                total += 1

    summary = {}
    for label in ALL_LABELS:
        count = counts[label]
        pct = round(count / total * 100, 1) if total > 0 else 0.0
        summary[label] = {"count": count, "pct": pct}
    return summary


def compute_stress_distribution(zone_summary: dict) -> dict:
    """Convert zone_summary to display-name keyed distribution."""
    distribution = {}
    for label in ALL_LABELS:
        display_name = LEVEL_DISPLAY_NAMES.get(label, label)
        distribution[display_name] = zone_summary.get(label, {}).get("pct", 0.0)
    return distribution


# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Crop Health Score
# ══════════════════════════════════════════════════════════════════════════════
def compute_crop_health_score(scores_2d: list) -> float:
    """
    Compute crop health score (0–10 scale) as weighted average of grid cells.

    Non-vegetation cells (score 0.0) are excluded from the average.
    """
    all_scores = [s for row in scores_2d for s in row if s > 0.0]
    if not all_scores:
        return 0.0
    avg = np.mean(all_scores)
    # Scale 0–1 → 0–10
    return round(float(avg * 10.0), 1)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 9 — Heatmap Generation
# ══════════════════════════════════════════════════════════════════════════════
LEGEND_HEIGHT = 32


def _draw_legend(img_w: int) -> np.ndarray:
    """Create a horizontal 7-segment legend bar."""
    legend = np.zeros((LEGEND_HEIGHT, img_w, 3), dtype=np.uint8)
    legend[:] = (30, 30, 30)

    labels = list(OVERLAY_COLORS_BGR.keys())
    seg_w = img_w // len(labels)

    for i, label in enumerate(labels):
        x1 = i * seg_w
        x2 = x1 + seg_w if i < len(labels) - 1 else img_w
        color = OVERLAY_COLORS_BGR[label]

        swatch_h = 10
        legend[0:swatch_h, x1:x2] = color

        text = LEVEL_DISPLAY_NAMES.get(label, label)
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.25
        thickness = 1
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
        tx = x1 + max(0, (x2 - x1 - tw) // 2)
        ty = swatch_h + th + 4
        cv2.putText(legend, text, (tx, ty), font, font_scale,
                    (230, 230, 230), thickness, cv2.LINE_AA)

    return legend


def generate_heatmap_overlay(
    original_img: np.ndarray,
    labels_2d: list,
    grid_size: int = GRID_SIZE,
    jpeg_quality: int = 92,
) -> str:
    """
    Generate stress heatmap overlay as base64 JPEG.

    Paints each grid cell with its stress-level color, alpha-blends with
    original, draws grid lines, appends legend bar.
    """
    h, w = original_img.shape[:2]
    cell_h = h // grid_size
    cell_w = w // grid_size

    overlay = np.zeros_like(original_img, dtype=np.uint8)

    for row_idx, label_row in enumerate(labels_2d):
        for col_idx, label in enumerate(label_row):
            y1 = row_idx * cell_h
            y2 = y1 + cell_h if row_idx < grid_size - 1 else h
            x1 = col_idx * cell_w
            x2 = x1 + cell_w if col_idx < grid_size - 1 else w
            color = OVERLAY_COLORS_BGR.get(label, OVERLAY_COLORS_BGR["red"])
            overlay[y1:y2, x1:x2] = color

    # Alpha blend: original 60%, overlay 40%
    blended = cv2.addWeighted(original_img, 0.6, overlay, OVERLAY_ALPHA, 0)

    # Subtle grid lines
    line_color = (20, 20, 20)
    for i in range(1, grid_size):
        cv2.line(blended, (0, i * cell_h), (w, i * cell_h), line_color, 1)
        cv2.line(blended, (i * cell_w, 0), (i * cell_w, h), line_color, 1)

    # Legend bar
    legend_bar = _draw_legend(w)
    blended = np.vstack([blended, legend_bar])

    # Encode
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
    success, jpeg_bytes = cv2.imencode(".jpg", blended, encode_params)
    if not success:
        raise RuntimeError("Failed to encode heatmap as JPEG.")

    return base64.b64encode(jpeg_bytes.tobytes()).decode("utf-8")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 10 — Global Classification + Recommendation
# ══════════════════════════════════════════════════════════════════════════════
def classify_global(health_score: float) -> str:
    """Map crop health score (0–10) to a global classification string."""
    # Convert 0–10 back to 0–1 for threshold comparison
    score_01 = health_score / 10.0
    label = classify_cell(score_01)
    return GLOBAL_CLASSIFICATIONS.get(label, GLOBAL_CLASSIFICATIONS["red"])


def get_recommendation(health_score: float, distribution: dict) -> str:
    """Generate a farmer-facing irrigation recommendation."""
    if health_score >= 8.5:
        return (
            "Excellent crop health. Your plants are well-hydrated and thriving. "
            "No irrigation action required. Monitor again in 48–72 hours."
        )
    elif health_score >= 7.0:
        return (
            "Healthy crop condition. Vegetation shows good water availability. "
            "Continue your current irrigation schedule and monitor in 24–48 hours."
        )
    elif health_score >= 6.0:
        return (
            "Good overall health with some areas showing early signs of stress. "
            "Check soil moisture levels and consider light irrigation within the next 12 hours."
        )
    elif health_score >= 5.0:
        return (
            "Mild water stress detected across parts of the crop area. "
            "Schedule irrigation within the next 6–8 hours to prevent further stress buildup."
        )
    elif health_score >= 4.0:
        return (
            "Moderate water stress observed. Multiple zones show reduced vegetation vigor. "
            "Irrigate today — prioritize the most affected areas first."
        )
    elif health_score >= 3.0:
        return (
            "High water stress detected. Significant portions of the crop are under severe stress. "
            "Irrigate urgently within the next 2–3 hours to prevent yield loss."
        )
    else:
        return (
            "Critical water stress! Most of the crop area is severely dehydrated. "
            "Irrigate immediately to prevent irreversible damage and potential crop loss."
        )


# ══════════════════════════════════════════════════════════════════════════════
# FULL PIPELINE — Single entry point
# ══════════════════════════════════════════════════════════════════════════════
def run_advanced_analysis(img: np.ndarray) -> dict:
    """
    Execute the complete multi-index vegetation analysis pipeline.

    Args:
        img: BGR uint8 image (already resized to 512×512).

    Returns:
        Full analysis result dict (or no_vegetation result).
    """
    # Step 1: Lighting normalization
    img_norm = normalize_lighting(img)

    # Step 2: Vegetation segmentation
    mask = create_vegetation_mask(img_norm)
    veg_coverage = float(np.sum(mask) / mask.size * 100.0)

    if not has_vegetation(mask):
        return {
            "status": "no_vegetation",
            "vegetation_coverage_pct": round(veg_coverage, 1),
        }

    # Step 3: Multi-index computation
    indices = compute_multi_indices(img_norm, mask)

    # Backward-compatible raw VARI average
    avg_vari = compute_average_vari_raw(img_norm, mask)

    # Step 4: Stress score fusion
    fused = fuse_stress_score(indices)

    # Step 5: Spatial smoothing
    smoothed = apply_spatial_smoothing(fused)

    # Step 6: 32×32 grid analysis
    labels_2d, scores_2d = analyze_grid(smoothed, mask, GRID_SIZE)

    # Step 7: Zone summary + distribution
    zone_summary = compute_zone_summary(labels_2d)
    stress_distribution = compute_stress_distribution(zone_summary)

    # Step 8: Crop health score
    health_score = compute_crop_health_score(scores_2d)

    # Step 9: Heatmap
    heatmap_b64 = generate_heatmap_overlay(img, labels_2d, GRID_SIZE)

    # Step 10: Classification + recommendation
    classification = classify_global(health_score)
    recommendation = get_recommendation(health_score, stress_distribution)

    return {
        "status": "success",
        "average_vari": round(avg_vari, 4),
        "classification": classification,
        "vegetation_coverage_pct": round(veg_coverage, 1),
        "crop_health_score": health_score,
        "heatmap_image": heatmap_b64,
        "stress_map": labels_2d,
        "zone_summary": zone_summary,
        "vegetation_indices": {
            "vari": indices["vari_avg"],
            "exg": indices["exg_avg"],
            "ngrdi": indices["ngrdi_avg"],
        },
        "stress_distribution": stress_distribution,
        "grid_resolution": GRID_SIZE,
        "recommendation": recommendation,
        "thresholds": THRESHOLD_REFERENCE,
    }
