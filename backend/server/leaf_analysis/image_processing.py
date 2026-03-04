"""
Image Processing Module for Leaf Health Analysis

Performs:
- VARI (Visible Atmospherically Resistant Index) computation
- NDVI-like vegetation index calculation
- Gaussian blur for noise reduction
- CLAHE (Contrast Limited Adaptive Histogram Equalization) normalization
- HSV-based green thresholding for background masking

All operations are deterministic and fully offline.
"""

import numpy as np
import cv2
from typing import Tuple, Dict
from PIL import Image
import io
import base64


def decode_image(image_data: str) -> np.ndarray:
    """
    Decode base64 image string to numpy array.
    
    Args:
        image_data: Base64-encoded image string (with or without data URL prefix)
    
    Returns:
        RGB image as numpy array (H, W, 3)
    """
    # Remove data URL prefix if present
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    
    # Decode base64
    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array
    img_array = np.array(image)
    return img_array


def apply_gaussian_blur(img: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """
    Apply Gaussian blur to reduce noise.
    
    Agronomic reasoning: Noise from camera sensors and lighting variations
    can affect vegetation index calculations. Gaussian blur smooths these
    variations while preserving overall leaf structure.
    
    Args:
        img: Input RGB image (H, W, 3)
        kernel_size: Size of Gaussian kernel (must be odd, default: 5)
    
    Returns:
        Blurred image
    """
    # Ensure kernel size is odd
    if kernel_size % 2 == 0:
        kernel_size += 1
    
    return cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)


def apply_clahe(img: np.ndarray, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) normalization.
    
    Agronomic reasoning: CLAHE enhances local contrast in leaf images, making
    subtle color variations (indicating health issues) more detectable. Unlike
    global histogram equalization, CLAHE prevents over-amplification of noise
    in uniform regions.
    
    Args:
        img: Input RGB image (H, W, 3)
        clip_limit: Threshold for contrast limiting (default: 2.0)
        tile_grid_size: Grid size for adaptive processing (default: 8x8)
    
    Returns:
        CLAHE-normalized image
    """
    # Convert RGB to LAB color space (CLAHE works better in LAB)
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    # Apply CLAHE to L channel (lightness)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    l_channel_clahe = clahe.apply(l_channel)
    
    # Merge channels back
    lab_clahe = cv2.merge([l_channel_clahe, a_channel, b_channel])
    
    # Convert back to RGB
    rgb_clahe = cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2RGB)
    return rgb_clahe


def create_green_mask(img: np.ndarray, 
                      hsv_lower: Tuple[int, int, int] = (35, 40, 40),
                      hsv_upper: Tuple[int, int, int] = (85, 255, 255)) -> np.ndarray:
    """
    Create binary mask for green vegetation using HSV color space.
    
    Agronomic reasoning: HSV color space separates hue (color), saturation,
    and value (brightness), making it ideal for detecting green vegetation
    regardless of lighting conditions. This masks out background (soil, pots,
    shadows) to focus analysis on the leaf itself.
    
    Thresholds:
    - Hue: 35-85 (green range in HSV, where 0-180 is used in OpenCV)
    - Saturation: 40-255 (excludes gray/white backgrounds)
    - Value: 40-255 (excludes very dark shadows)
    
    Args:
        img: Input RGB image (H, W, 3)
        hsv_lower: Lower HSV bounds (H, S, V) - default tuned for green leaves
        hsv_upper: Upper HSV bounds (H, S, V) - default tuned for green leaves
    
    Returns:
        Binary mask (1 = green vegetation, 0 = background)
    """
    # Convert RGB to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    # Create mask for green pixels
    mask = cv2.inRange(hsv, np.array(hsv_lower), np.array(hsv_upper))
    
    # Apply morphological operations to clean up mask
    # Remove small noise
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    # Fill small holes
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    return mask


def compute_vari(img: np.ndarray, mask: np.ndarray) -> Tuple[float, float, float]:
    """
    Compute VARI (Visible Atmospherically Resistant Index).
    
    VARI Formula: (G - R) / (G + R - B)
    where R, G, B are red, green, blue channels.
    
    Agronomic reasoning: VARI is designed for visible spectrum cameras (no NIR
    required). It's sensitive to chlorophyll content and vegetation health.
    Higher VARI values indicate healthier, more chlorophyll-rich vegetation.
    
    Typical ranges:
    - Healthy vegetation: 0.1 to 0.5
    - Stressed vegetation: -0.1 to 0.1
    - Non-vegetation: < -0.1
    
    Args:
        img: RGB image (H, W, 3)
        mask: Binary mask (1 = leaf, 0 = background)
    
    Returns:
        Tuple of (mean_vari, std_vari, green_pixel_ratio)
        - mean_vari: Mean VARI value for masked pixels
        - std_vari: Standard deviation of VARI values
        - green_pixel_ratio: Fraction of pixels that are green (masked)
    """
    # Extract channels
    r = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    b = img[:, :, 2].astype(np.float32)
    
    # Avoid division by zero: add small epsilon to denominator
    epsilon = 1e-6
    denominator = g + r - b + epsilon
    
    # Compute VARI
    vari = (g - r) / denominator
    
    # Apply mask (only compute for green pixels)
    masked_vari = vari[mask > 0]
    
    if len(masked_vari) == 0:
        # No green pixels detected - return default values
        return 0.0, 0.0, 0.0
    
    # Compute statistics
    mean_vari = float(np.mean(masked_vari))
    std_vari = float(np.std(masked_vari))
    
    # Compute green pixel ratio (fraction of image that is vegetation)
    total_pixels = mask.size
    green_pixels = np.sum(mask > 0)
    green_pixel_ratio = float(green_pixels / total_pixels)
    
    return mean_vari, std_vari, green_pixel_ratio


def compute_brightness(img: np.ndarray, mask: np.ndarray) -> float:
    """
    Compute mean brightness of masked leaf region.
    
    Args:
        img: RGB image (H, W, 3)
        mask: Binary mask (1 = leaf, 0 = background)
    
    Returns:
        Mean brightness (0-255)
    """
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Apply mask
    masked_gray = gray[mask > 0]
    
    if len(masked_gray) == 0:
        return 128.0  # Default middle brightness
    
    return float(np.mean(masked_gray))


def compute_leaf_segmentation_confidence(mask: np.ndarray, green_pixel_ratio: float) -> float:
    """
    Compute confidence that leaf segmentation is correct.
    
    Args:
        mask: Binary mask
        green_pixel_ratio: Fraction of green pixels
    
    Returns:
        Confidence score (0.0-1.0)
    """
    # Base confidence on green pixel ratio
    ratio_confidence = min(1.0, green_pixel_ratio / 0.3)  # 30% = full confidence
    
    # Check mask connectivity (well-segmented leaves should have few large components)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    
    if num_labels <= 1:
        return 0.0  # No leaf detected
    
    # Find largest component
    largest_component_size = np.max(stats[1:, cv2.CC_STAT_AREA])
    total_leaf_pixels = np.sum(mask > 0)
    
    if total_leaf_pixels == 0:
        return 0.0
    
    # High confidence if largest component is > 70% of total
    connectivity_confidence = min(1.0, largest_component_size / (total_leaf_pixels * 0.7))
    
    # Combined confidence
    return (ratio_confidence * 0.6 + connectivity_confidence * 0.4)


def detect_brown_yellow_clusters(img: np.ndarray, mask: np.ndarray) -> Tuple[bool, float]:
    """
    Detect dominant brown/yellow clusters in leaf (indicating stress/disease).
    
    Uses k-means clustering in LAB color space to identify color clusters.
    
    Args:
        img: RGB image (H, W, 3)
        mask: Binary mask (1 = leaf, 0 = background)
    
    Returns:
        Tuple of (has_dominant_cluster, cluster_ratio)
        - has_dominant_cluster: True if brown/yellow cluster covers > 15% of leaf
        - cluster_ratio: Fraction of leaf covered by brown/yellow
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    
    # Extract masked pixels
    masked_pixels = lab[mask > 0]
    
    if len(masked_pixels) < 100:
        return False, 0.0  # Not enough pixels
    
    # Reshape for k-means
    pixels_float = masked_pixels.reshape(-1, 3).astype(np.float32)
    
    # K-means with 4 clusters
    k = 4
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(pixels_float, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    # Check each cluster for brown/yellow characteristics
    # Brown/yellow in LAB: L (lightness) medium, A (green-red) positive, B (blue-yellow) positive
    brown_yellow_mask = np.zeros(mask.shape, dtype=np.uint8)
    brown_yellow_pixels = 0
    
    for i in range(k):
        center = centers[i]
        l_val, a_val, b_val = center
        
        # Brown/yellow criteria: medium lightness, positive A and B
        if 30 < l_val < 80 and a_val > 0 and b_val > 0:
            cluster_pixels = (labels.flatten() == i).sum()
            brown_yellow_pixels += cluster_pixels
    
    total_leaf_pixels = np.sum(mask > 0)
    cluster_ratio = brown_yellow_pixels / total_leaf_pixels if total_leaf_pixels > 0 else 0.0
    
    has_dominant = cluster_ratio > 0.15  # 15% threshold
    
    return has_dominant, float(cluster_ratio)


def compute_texture_variance(img: np.ndarray, mask: np.ndarray) -> float:
    """
    Compute texture variance using Laplacian operator.
    
    High variance indicates irregular texture (disease lesions).
    Low variance indicates uniform texture (healthy or uniform stress).
    
    Args:
        img: RGB image (H, W, 3)
        mask: Binary mask (1 = leaf, 0 = background)
    
    Returns:
        Texture variance (higher = more irregular)
    """
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Apply Laplacian operator
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    
    # Apply mask
    masked_laplacian = laplacian[mask > 0]
    
    if len(masked_laplacian) == 0:
        return 0.0
    
    # Compute variance
    return float(np.var(masked_laplacian))


def detect_fungal_lesions(img: np.ndarray, mask: np.ndarray) -> Tuple[bool, float, float, float]:
    """
    Detect fungal disease lesions (Early Blight characteristics).
    
    Looks for:
    - Brown/black circular spots
    - High local contrast regions
    - Irregular lesion patterns
    
    Args:
        img: RGB image (H, W, 3)
        mask: Binary mask (1 = leaf, 0 = background)
    
    Returns:
        Tuple of (has_lesions, lesion_coverage, spot_variance, contrast_score)
        - has_lesions: True if lesions detected
        - lesion_coverage: Fraction of leaf covered by lesions (0-1)
        - spot_variance: Variance in spot sizes (higher = more irregular)
        - contrast_score: Local contrast measure (higher = more contrast)
    """
    # Convert to LAB for better color analysis
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    # Create mask for dark brown/black regions (lesions)
    # In LAB: low L (dark), positive A (reddish), low B (less yellow)
    lesion_mask = np.zeros(mask.shape, dtype=np.uint8)
    lesion_mask[
        (l_channel < 50) &  # Dark
        (a_channel > 10) &  # Reddish
        (b_channel < 30) &  # Less yellow
        (mask > 0)  # Within leaf
    ] = 255
    
    # Morphological operations to clean up
    kernel = np.ones((5, 5), np.uint8)
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Compute lesion coverage
    total_leaf_pixels = np.sum(mask > 0)
    lesion_pixels = np.sum(lesion_mask > 0)
    lesion_coverage = lesion_pixels / total_leaf_pixels if total_leaf_pixels > 0 else 0.0
    
    # Detect circular spots using contour analysis
    contours, _ = cv2.findContours(lesion_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    spot_areas = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 50:  # Filter tiny noise
            spot_areas.append(area)
    
    # Compute spot size variance
    spot_variance = float(np.var(spot_areas)) if len(spot_areas) > 1 else 0.0
    
    # Compute local contrast (high contrast indicates lesions)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    masked_gray = gray[mask > 0]
    
    if len(masked_gray) == 0:
        return False, 0.0, 0.0, 0.0
    
    # Local contrast using standard deviation of local means
    kernel_size = 15
    local_mean = cv2.boxFilter(masked_gray.astype(np.float32), -1, (kernel_size, kernel_size))
    contrast_score = float(np.std(local_mean))
    
    # Lesions detected if coverage > 0.02 (2%) and we have spots
    has_lesions = lesion_coverage > 0.02 and len(spot_areas) > 0
    
    return has_lesions, float(lesion_coverage), spot_variance, contrast_score


def process_leaf_image(image_data: str) -> Dict[str, any]:
    """
    Complete image processing pipeline for leaf health analysis.
    
    Pipeline:
    1. Decode base64 image
    2. Apply Gaussian blur (noise reduction)
    3. Apply CLAHE normalization (contrast enhancement)
    4. Create green mask (background removal)
    5. Compute VARI statistics
    6. Compute additional analysis features
    
    Args:
        image_data: Base64-encoded image string
    
    Returns:
        Dictionary containing:
        - processed_image: Processed RGB image (numpy array)
        - mask: Binary mask (numpy array)
        - mean_vari: Mean VARI value
        - std_vari: VARI standard deviation
        - green_pixel_ratio: Fraction of green pixels
        - brightness: Mean brightness of leaf region
        - segmentation_confidence: Confidence in leaf segmentation
        - has_brown_yellow_clusters: Whether brown/yellow clusters detected
        - brown_yellow_ratio: Fraction of leaf with brown/yellow
        - texture_variance: Texture variance (Laplacian)
        - has_lesions: Whether fungal lesions detected
        - lesion_coverage: Fraction of leaf covered by lesions
        - spot_variance: Variance in lesion spot sizes
        - contrast_score: Local contrast measure
    """
    # Step 1: Decode image
    img = decode_image(image_data)
    
    # Step 2: Apply Gaussian blur (noise reduction)
    img_blurred = apply_gaussian_blur(img, kernel_size=5)
    
    # Step 3: Apply CLAHE normalization (contrast enhancement)
    img_normalized = apply_clahe(img_blurred, clip_limit=2.0, tile_grid_size=(8, 8))
    
    # Step 4: Create green mask (background removal)
    mask = create_green_mask(img_normalized)
    
    # Step 5: Compute VARI statistics
    mean_vari, std_vari, green_pixel_ratio = compute_vari(img_normalized, mask)
    
    # Step 6: Compute additional analysis features
    brightness = compute_brightness(img_normalized, mask)
    segmentation_confidence = compute_leaf_segmentation_confidence(mask, green_pixel_ratio)
    has_brown_yellow, brown_yellow_ratio = detect_brown_yellow_clusters(img_normalized, mask)
    texture_variance = compute_texture_variance(img_normalized, mask)
    has_lesions, lesion_coverage, spot_variance, contrast_score = detect_fungal_lesions(img_normalized, mask)
    
    return {
        'processed_image': img_normalized,
        'mask': mask,
        'mean_vari': mean_vari,
        'std_vari': std_vari,
        'green_pixel_ratio': green_pixel_ratio,
        'brightness': brightness,
        'segmentation_confidence': segmentation_confidence,
        'has_brown_yellow_clusters': has_brown_yellow,
        'brown_yellow_ratio': brown_yellow_ratio,
        'texture_variance': texture_variance,
        'has_lesions': has_lesions,
        'lesion_coverage': lesion_coverage,
        'spot_variance': spot_variance,
        'contrast_score': contrast_score
    }

