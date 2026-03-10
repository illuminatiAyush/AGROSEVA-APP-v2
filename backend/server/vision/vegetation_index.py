"""
vegetation_index.py — Vegetation segmentation and VARI index computation.

VARI (Visible Atmospherically Resistant Index) is a simple RGB-derived
index that correlates with plant chlorophyll content and water status.

Formula:
    VARI = (G - R) / (G + R - B + ε)

Where ε (epsilon) prevents division-by-zero.

Interpretation (empirical thresholds):
    VARI > 0.25   → Healthy / No irrigation needed
    0.15–0.25     → Mild stress / Irrigation needed
    ≤ 0.15        → Severe stress / Urgent irrigation needed
"""

import numpy as np
from .image_utils import bgr_to_rgb_float

# Small constant to prevent division-by-zero in the VARI denominator
EPSILON = 1e-6


def create_vegetation_mask(img: np.ndarray) -> np.ndarray:
    """
    Create a boolean mask that identifies vegetation pixels.

    Rule: A pixel is vegetation if Green > Red AND Green > Blue.
    This simple heuristic effectively isolates most green plant tissue
    while excluding soil, sky, and other background elements.

    Args:
        img: BGR uint8 image array.

    Returns:
        Boolean mask of shape (H, W). True = vegetation pixel.
    """
    R, G, B = bgr_to_rgb_float(img)
    mask = (G > R) & (G > B)
    return mask


def compute_vari(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Compute the VARI vegetation index for every pixel in the image.

    VARI = (G - R) / (G + R - B + ε)

    Values outside the vegetation mask are set to NaN so they are
    excluded from all downstream statistical computations.

    Args:
        img:  BGR uint8 image array.
        mask: Boolean vegetation mask (True = valid pixel).

    Returns:
        Float32 array of shape (H, W) with VARI values.
        Non-vegetation pixels are NaN.
    """
    R, G, B = bgr_to_rgb_float(img)

    numerator   = G - R
    denominator = G + R - B + EPSILON

    vari = numerator / denominator

    # Clamp to a sensible range: VARI is theoretically −1 to 1,
    # but outliers from near-zero denominators can be extreme.
    vari = np.clip(vari, -1.0, 1.0)

    # Mask non-vegetation pixels
    vari_masked = vari.astype(np.float32)
    vari_masked[~mask] = np.nan

    return vari_masked


def compute_average_vari(vari_map: np.ndarray, mask: np.ndarray) -> float:
    """
    Calculate the mean VARI score over all vegetation pixels.

    Args:
        vari_map: Float32 VARI array (NaN for non-vegetation).
        mask:     Boolean vegetation mask.

    Returns:
        Mean VARI value as float, or 0.0 if no vegetation detected.
    """
    vegetation_values = vari_map[mask & ~np.isnan(vari_map)]
    if len(vegetation_values) == 0:
        return 0.0
    return float(np.mean(vegetation_values))


def has_vegetation(mask: np.ndarray, min_fraction: float = 0.03) -> bool:
    """
    Check whether the image contains enough vegetation to be analysed.

    Args:
        mask:         Boolean vegetation mask.
        min_fraction: Minimum required fraction of vegetation pixels (default 3%).

    Returns:
        True if sufficient vegetation is present, False otherwise.
    """
    total_pixels = mask.size
    vegetation_pixels = np.sum(mask)
    fraction = vegetation_pixels / total_pixels
    return fraction >= min_fraction
