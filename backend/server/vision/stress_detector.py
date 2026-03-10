"""
stress_detector.py — Grid-based water stress classification.

Divides the processed image into a grid of cells, computes the average
VARI value per cell, and assigns a granular stress label to each cell
and an overall classification.

Stress Labels (7 levels — coarse to fine):
    "dark_green"   → Excellent         (VARI > 0.40)
    "green"        → Healthy           (0.30 < VARI ≤ 0.40)
    "light_green"  → Good              (0.25 < VARI ≤ 0.30)
    "yellow_green" → Mild Stress       (0.20 < VARI ≤ 0.25)
    "yellow"       → Moderate Stress   (0.15 < VARI ≤ 0.20)
    "orange"       → High Stress       (0.08 < VARI ≤ 0.15)
    "red"          → Critical          (VARI ≤ 0.08 or no vegetation)

Global Classification Strings (7 levels):
    "Excellent — No Irrigation Needed"
    "Healthy — No Irrigation Needed"
    "Good — Monitor Soil Moisture"
    "Mild Stress — Irrigate Soon"
    "Moderate Stress — Irrigate Today"
    "High Stress — Irrigate Urgently"
    "Critical — Irrigate Immediately"
"""

import numpy as np

# ── VARI Thresholds (7 levels, descending) ─────────────────────────────────────
THRESHOLD_EXCELLENT    = 0.40   # VARI > this → Excellent  (dark_green)
THRESHOLD_HEALTHY      = 0.30   # 0.30–0.40  → Healthy    (green)
THRESHOLD_GOOD         = 0.25   # 0.25–0.30  → Good       (light_green)
THRESHOLD_MILD         = 0.20   # 0.20–0.25  → Mild       (yellow_green)
THRESHOLD_MODERATE     = 0.15   # 0.15–0.20  → Moderate   (yellow)
THRESHOLD_HIGH         = 0.08   # 0.08–0.15  → High       (orange)
# VARI ≤ 0.08 → Critical (red)

# ── Grid size ─────────────────────────────────────────────────────────────────
DEFAULT_GRID = 8   # 8×8 grid of cells

# ── All valid stress labels (used for downstream validation) ──────────────────
ALL_LABELS = (
    "dark_green", "green", "light_green",
    "yellow_green", "yellow", "orange", "red",
)

# ── Global classification strings ─────────────────────────────────────────────
GLOBAL_CLASSIFICATIONS = {
    "dark_green":   "Excellent — No Irrigation Needed",
    "green":        "Healthy — No Irrigation Needed",
    "light_green":  "Good — Monitor Soil Moisture",
    "yellow_green": "Mild Stress — Irrigate Soon",
    "yellow":       "Moderate Stress — Irrigate Today",
    "orange":       "High Stress — Irrigate Urgently",
    "red":          "Critical — Irrigate Immediately",
}


def classify_cell_vari(vari_value: float) -> str:
    """
    Classify a single cell's average VARI into one of 7 stress labels.

    Args:
        vari_value: Average VARI for the cell (may be NaN if no vegetation).

    Returns:
        One of: "dark_green", "green", "light_green", "yellow_green",
                "yellow", "orange", "red"
    """
    if np.isnan(vari_value):
        return "red"  # No vegetation → treat as critical/background
    if vari_value > THRESHOLD_EXCELLENT:
        return "dark_green"
    elif vari_value > THRESHOLD_HEALTHY:
        return "green"
    elif vari_value > THRESHOLD_GOOD:
        return "light_green"
    elif vari_value > THRESHOLD_MILD:
        return "yellow_green"
    elif vari_value > THRESHOLD_MODERATE:
        return "yellow"
    elif vari_value > THRESHOLD_HIGH:
        return "orange"
    else:
        return "red"


def analyze_grid(
    vari_map: np.ndarray,
    mask: np.ndarray,
    grid_size: int = DEFAULT_GRID
) -> list:
    """
    Divide the VARI map into a grid and classify each cell into one of 7 levels.

    Args:
        vari_map:  Float32 VARI array (NaN for non-vegetation).
        mask:      Boolean vegetation mask.
        grid_size: Number of rows/columns to divide the image into.

    Returns:
        2D list of stress labels (grid_size × grid_size).
        Each element is one of ALL_LABELS.
    """
    h, w = vari_map.shape
    cell_h = h // grid_size
    cell_w = w // grid_size

    stress_map = []

    for row in range(grid_size):
        stress_row = []
        for col in range(grid_size):
            y1 = row * cell_h
            y2 = y1 + cell_h if row < grid_size - 1 else h
            x1 = col * cell_w
            x2 = x1 + cell_w if col < grid_size - 1 else w

            cell_vari = vari_map[y1:y2, x1:x2]
            cell_mask = mask[y1:y2, x1:x2]

            valid_values = cell_vari[cell_mask & ~np.isnan(cell_vari)]
            if len(valid_values) == 0:
                cell_mean = np.nan
            else:
                cell_mean = float(np.mean(valid_values))

            stress_row.append(classify_cell_vari(cell_mean))
        stress_map.append(stress_row)

    return stress_map


def classify_global(avg_vari: float) -> str:
    """
    Assign an overall irrigation classification from the image-wide VARI mean.

    Returns one of the 7 GLOBAL_CLASSIFICATIONS values.
    """
    label = classify_cell_vari(avg_vari)
    return GLOBAL_CLASSIFICATIONS[label]


def zone_summary(stress_map: list) -> dict:
    """
    Count the number of grid cells at each stress level.

    Args:
        stress_map: 2D list of stress labels.

    Returns:
        Dict mapping each label → count of cells. Zero-filled for absent labels.
    """
    counts = {label: 0 for label in ALL_LABELS}
    total = 0
    for row in stress_map:
        for cell in row:
            if cell in counts:
                counts[cell] += 1
                total += 1
    # Add percentage breakdown
    summary = {}
    for label in ALL_LABELS:
        count = counts[label]
        pct = round(count / total * 100, 1) if total > 0 else 0.0
        summary[label] = {"count": count, "pct": pct}
    return summary
