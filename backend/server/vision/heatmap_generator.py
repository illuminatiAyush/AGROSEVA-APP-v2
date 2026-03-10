"""
heatmap_generator.py — Color overlay heatmap generation (7-level gradient).

Draws a semi-transparent stress color map over the original image and returns
it as a base64-encoded JPEG string for transmission to the mobile app.

Color legend (7 levels — healthy to critical):
    dark_green   (#1B5E20) → Excellent       — No irrigation needed
    green        (#43A047) → Healthy         — No irrigation needed
    light_green  (#9CCC65) → Good            — Monitor soil moisture
    yellow_green (#D4E157) → Mild Stress     — Irrigate soon
    yellow       (#FFA726) → Moderate Stress — Irrigate today
    orange       (#EF6C00) → High Stress     — Irrigate urgently
    red          (#C62828) → Critical        — Irrigate immediately
"""

import cv2
import base64
import numpy as np

# ── Overlay Colors (BGR format for OpenCV) ────────────────────────────────────
COLORS = {
    "dark_green":   (32,  94,  27),    # #1B5E20 — deep forest green
    "green":        (71,  160, 67),    # #43A047 — healthy green
    "light_green":  (101, 204, 156),   # #9CCC65 — lime green
    "yellow_green": (87,  225, 212),   # #D4E157 — yellow-green
    "yellow":       (38,  167, 255),   # #FFA726 — amber
    "orange":       (0,   108, 239),   # #EF6C00 — deep orange
    "red":          (40,  40,  198),   # #C62828 — deep red
}

# Legend label text for each level
LEGEND_LABELS = {
    "dark_green":   "Excellent",
    "green":        "Healthy",
    "light_green":  "Good",
    "yellow_green": "Mild Stress",
    "yellow":       "Moderate",
    "orange":       "High Stress",
    "red":          "Critical",
}

# Alpha blending: 0.0 = invisible, 1.0 = fully opaque
OVERLAY_ALPHA = 0.50

# Legend bar height in pixels appended below the heatmap
LEGEND_HEIGHT = 28


def _draw_legend(img_w: int) -> np.ndarray:
    """
    Create a horizontal 7-segment legend bar image.

    Returns:
        BGR uint8 array of shape (LEGEND_HEIGHT, img_w, 3).
    """
    legend = np.zeros((LEGEND_HEIGHT, img_w, 3), dtype=np.uint8)
    legend[:] = (30, 30, 30)  # dark background

    labels = list(COLORS.keys())
    seg_w = img_w // len(labels)

    for i, label in enumerate(labels):
        x1 = i * seg_w
        x2 = x1 + seg_w if i < len(labels) - 1 else img_w
        color = COLORS[label]

        # Fill segment with label color (small swatch strip at top)
        swatch_h = 8
        legend[0:swatch_h, x1:x2] = color

        # Draw label text below swatch
        text = LEGEND_LABELS[label]
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.22
        thickness = 1
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
        tx = x1 + max(0, (x2 - x1 - tw) // 2)
        ty = swatch_h + th + 3
        cv2.putText(legend, text, (tx, ty), font, font_scale, (230, 230, 230), thickness, cv2.LINE_AA)

    return legend


def generate_heatmap_overlay(
    original_img: np.ndarray,
    stress_map: list,
    grid_size: int = 8,
    jpeg_quality: int = 92,
    include_legend: bool = True,
) -> str:
    """
    Draw a semi-transparent 7-level stress color map over the original image.

    Steps:
        1. Create a blank overlay canvas the same size as the processing image.
        2. Paint each grid cell with the appropriate 7-level stress colour.
        3. Alpha-blend the overlay onto the original image.
        4. Optionally append a compact legend bar at the bottom.
        5. Encode the result as JPEG and return as base64 string.

    Args:
        original_img:   BGR uint8 image (512×512 after processing resize).
        stress_map:     2D list of 7-level stress labels.
        grid_size:      Number of grid rows/columns.
        jpeg_quality:   JPEG encoding quality (1–100).
        include_legend: If True, append a 7-segment legend bar below the heatmap.

    Returns:
        Base64-encoded JPEG string (no "data:image/..." prefix).
    """
    h, w = original_img.shape[:2]
    cell_h = h // grid_size
    cell_w = w // grid_size

    # Create blank overlay canvas
    overlay = np.zeros_like(original_img, dtype=np.uint8)

    for row_idx, stress_row in enumerate(stress_map):
        for col_idx, label in enumerate(stress_row):
            y1 = row_idx * cell_h
            y2 = y1 + cell_h if row_idx < grid_size - 1 else h
            x1 = col_idx * cell_w
            x2 = x1 + cell_w if col_idx < grid_size - 1 else w

            color = COLORS.get(label, COLORS["red"])
            overlay[y1:y2, x1:x2] = color

    # Alpha blend
    blended = cv2.addWeighted(original_img, 1.0 - OVERLAY_ALPHA, overlay, OVERLAY_ALPHA, 0)

    # Subtle grid lines for visual clarity
    line_color = (20, 20, 20)
    for i in range(1, grid_size):
        cv2.line(blended, (0, i * cell_h), (w, i * cell_h), line_color, 1)
        cv2.line(blended, (i * cell_w, 0), (i * cell_w, h), line_color, 1)

    # Append legend bar
    if include_legend:
        legend_bar = _draw_legend(w)
        blended = np.vstack([blended, legend_bar])

    # Encode to JPEG
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
    success, jpeg_bytes = cv2.imencode(".jpg", blended, encode_params)
    if not success:
        raise RuntimeError("Failed to encode heatmap image as JPEG.")

    return base64.b64encode(jpeg_bytes.tobytes()).decode("utf-8")
