"""
Health Scoring Module for Leaf Health Analysis

Converts extracted features (VARI statistics, green pixel ratio) into a
normalized 0-100 Leaf Health Score using deterministic, explainable logic.

The scoring system is based on agronomic research:
- Higher VARI values indicate healthier vegetation
- Lower VARI standard deviation indicates uniform health (good)
- Higher green pixel ratio indicates more leaf area (good)
"""

from typing import Dict


def normalize_vari_to_score(mean_vari: float) -> float:
    """
    Normalize mean VARI value to 0-100 score component.
    
    Agronomic reasoning: VARI values typically range from -0.5 to 0.5.
    Healthy vegetation has VARI > 0.1, stressed vegetation has VARI < 0.1.
    
    Normalization:
    - VARI >= 0.3: Excellent (100 points)
    - VARI >= 0.1: Good (70-100 points, linear)
    - VARI >= 0.0: Fair (40-70 points, linear)
    - VARI >= -0.1: Poor (20-40 points, linear)
    - VARI < -0.1: Very Poor (0-20 points, linear)
    
    Args:
        mean_vari: Mean VARI value from image processing
    
    Returns:
        Score component (0-100)
    """
    if mean_vari >= 0.3:
        return 100.0
    elif mean_vari >= 0.1:
        # Linear interpolation: 0.1 -> 70, 0.3 -> 100
        return 70.0 + (mean_vari - 0.1) / (0.3 - 0.1) * 30.0
    elif mean_vari >= 0.0:
        # Linear interpolation: 0.0 -> 40, 0.1 -> 70
        return 40.0 + (mean_vari - 0.0) / (0.1 - 0.0) * 30.0
    elif mean_vari >= -0.1:
        # Linear interpolation: -0.1 -> 20, 0.0 -> 40
        return 20.0 + (mean_vari - (-0.1)) / (0.0 - (-0.1)) * 20.0
    else:
        # Linear interpolation: -0.5 -> 0, -0.1 -> 20
        min_vari = -0.5
        if mean_vari < min_vari:
            mean_vari = min_vari
        return (mean_vari - min_vari) / (-0.1 - min_vari) * 20.0


def normalize_std_vari_to_score(std_vari: float) -> float:
    """
    Normalize VARI standard deviation to 0-100 score component.
    
    Agronomic reasoning: Lower standard deviation indicates uniform health
    across the leaf (good). High standard deviation indicates patchy health
    or disease spots (bad).
    
    Normalization:
    - std_vari <= 0.05: Excellent uniformity (100 points)
    - std_vari <= 0.10: Good uniformity (80-100 points, linear)
    - std_vari <= 0.15: Fair uniformity (60-80 points, linear)
    - std_vari <= 0.20: Poor uniformity (40-60 points, linear)
    - std_vari > 0.20: Very poor uniformity (0-40 points, linear)
    
    Args:
        std_vari: VARI standard deviation from image processing
    
    Returns:
        Score component (0-100)
    """
    if std_vari <= 0.05:
        return 100.0
    elif std_vari <= 0.10:
        # Linear interpolation: 0.05 -> 100, 0.10 -> 80
        return 100.0 - (std_vari - 0.05) / (0.10 - 0.05) * 20.0
    elif std_vari <= 0.15:
        # Linear interpolation: 0.10 -> 80, 0.15 -> 60
        return 80.0 - (std_vari - 0.10) / (0.15 - 0.10) * 20.0
    elif std_vari <= 0.20:
        # Linear interpolation: 0.15 -> 60, 0.20 -> 40
        return 60.0 - (std_vari - 0.15) / (0.20 - 0.15) * 20.0
    else:
        # Linear interpolation: 0.20 -> 40, 0.30 -> 0
        max_std = 0.30
        if std_vari > max_std:
            std_vari = max_std
        return 40.0 - (std_vari - 0.20) / (max_std - 0.20) * 40.0


def normalize_green_ratio_to_score(green_pixel_ratio: float) -> float:
    """
    Normalize green pixel ratio to 0-100 score component.
    
    Agronomic reasoning: Higher green pixel ratio indicates more leaf area
    in the image (better framing, more data). Very low ratios may indicate
    poor image quality or incorrect framing.
    
    Normalization:
    - green_ratio >= 0.5: Excellent coverage (100 points)
    - green_ratio >= 0.3: Good coverage (80-100 points, linear)
    - green_ratio >= 0.2: Fair coverage (60-80 points, linear)
    - green_ratio >= 0.1: Poor coverage (40-60 points, linear)
    - green_ratio < 0.1: Very poor coverage (0-40 points, linear)
    
    Args:
        green_pixel_ratio: Fraction of green pixels (0-1)
    
    Returns:
        Score component (0-100)
    """
    if green_pixel_ratio >= 0.5:
        return 100.0
    elif green_pixel_ratio >= 0.3:
        # Linear interpolation: 0.3 -> 80, 0.5 -> 100
        return 80.0 + (green_pixel_ratio - 0.3) / (0.5 - 0.3) * 20.0
    elif green_pixel_ratio >= 0.2:
        # Linear interpolation: 0.2 -> 60, 0.3 -> 80
        return 60.0 + (green_pixel_ratio - 0.2) / (0.3 - 0.2) * 20.0
    elif green_pixel_ratio >= 0.1:
        # Linear interpolation: 0.1 -> 40, 0.2 -> 60
        return 40.0 + (green_pixel_ratio - 0.1) / (0.2 - 0.1) * 20.0
    else:
        # Linear interpolation: 0.0 -> 0, 0.1 -> 40
        return green_pixel_ratio / 0.1 * 40.0


def compute_health_score(mean_vari: float, std_vari: float, green_pixel_ratio: float) -> float:
    """
    Compute overall Leaf Health Score (0-100) from extracted features.
    
    Weighted combination:
    - Mean VARI: 60% weight (primary indicator of chlorophyll/health)
    - Std VARI: 25% weight (uniformity indicator)
    - Green ratio: 15% weight (data quality indicator)
    
    Agronomic reasoning: Mean VARI is the strongest indicator of plant health,
    so it gets the highest weight. Uniformity (std) is important for detecting
    patchy diseases. Green ratio ensures we have enough leaf data.
    
    Args:
        mean_vari: Mean VARI value
        std_vari: VARI standard deviation
        green_pixel_ratio: Fraction of green pixels
    
    Returns:
        Leaf Health Score (0-100)
    """
    # Normalize each component to 0-100
    vari_score = normalize_vari_to_score(mean_vari)
    std_score = normalize_std_vari_to_score(std_vari)
    ratio_score = normalize_green_ratio_to_score(green_pixel_ratio)
    
    # Weighted combination
    health_score = (
        0.60 * vari_score +  # Primary health indicator
        0.25 * std_score +   # Uniformity indicator
        0.15 * ratio_score   # Data quality indicator
    )
    
    # Clamp to 0-100
    health_score = max(0.0, min(100.0, health_score))
    
    return round(health_score, 1)


def compute_health_score_from_features(features: Dict) -> float:
    """
    Convenience function to compute health score from feature dictionary.
    
    Args:
        features: Dictionary with 'mean_vari', 'std_vari', 'green_pixel_ratio'
    
    Returns:
        Leaf Health Score (0-100)
    """
    return compute_health_score(
        features['mean_vari'],
        features['std_vari'],
        features['green_pixel_ratio']
    )


