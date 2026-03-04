"""
Precision-First Disease/Issue Classification Module

Multi-stage decision pipeline prioritizing precision over recall.
Disease classification is opt-in, not default.

Allowed outputs:
- Healthy
- Water Stress
- Nitrogen Deficiency
- Fungal Disease (Early Blight)
- Inconclusive
"""

from typing import Dict, Tuple, List


def get_ndvi_equivalent(mean_vari: float) -> float:
    """
    Convert VARI to NDVI-equivalent value for reporting.
    
    Args:
        mean_vari: Mean VARI value
    
    Returns:
        Approximate NDVI value
    """
    ndvi_approx = mean_vari * 1.5 + 0.1
    ndvi_approx = max(-1.0, min(1.0, ndvi_approx))
    return round(ndvi_approx, 2)


def stage1_image_validity_gate(features: Dict) -> Tuple[bool, str, List[str]]:
    """
    Stage 1: Image Validity Gate
    
    Reject image if:
    - Green pixel ratio < 25%
    - Mean brightness too low (< 30) or too high (> 220)
    - Leaf segmentation confidence < 0.6
    
    Returns:
        Tuple of (is_valid, issue, reasoning)
    """
    reasoning = []
    
    green_ratio = features['green_pixel_ratio']
    brightness = features['brightness']
    seg_confidence = features['segmentation_confidence']
    
    # Check green pixel ratio
    if green_ratio < 0.25:
        reasoning.append(f"Green pixel ratio too low ({green_ratio:.1%} < 25%)")
        return False, "Inconclusive", reasoning
    
    # Check brightness
    if brightness < 30:
        reasoning.append(f"Image too dark (brightness {brightness:.1f} < 30)")
        return False, "Inconclusive", reasoning
    if brightness > 220:
        reasoning.append(f"Image too bright (brightness {brightness:.1f} > 220)")
        return False, "Inconclusive", reasoning
    
    # Check segmentation confidence
    if seg_confidence < 0.6:
        reasoning.append(f"Leaf segmentation confidence too low ({seg_confidence:.2f} < 0.6)")
        return False, "Inconclusive", reasoning
    
    reasoning.append("Image validity checks passed")
    return True, "", reasoning


def stage2_healthy_dominance_check(features: Dict) -> Tuple[bool, float, List[str]]:
    """
    Stage 2: Healthy Dominance Check (MUST COME FIRST)
    
    Classify as Healthy if:
    - Mean VARI > 0.35
    - VARI standard deviation < 0.12
    - No dominant brown/yellow clusters
    
    Returns:
        Tuple of (is_healthy, confidence, reasoning)
    """
    reasoning = []
    
    mean_vari = features['mean_vari']
    std_vari = features['std_vari']
    has_brown_yellow = features['has_brown_yellow_clusters']
    
    # Check VARI threshold
    if mean_vari <= 0.35:
        reasoning.append(f"Mean VARI ({mean_vari:.3f}) not high enough for healthy classification")
        return False, 0.0, reasoning
    
    # Check VARI uniformity
    if std_vari >= 0.12:
        reasoning.append(f"VARI standard deviation ({std_vari:.3f}) indicates non-uniform health")
        return False, 0.0, reasoning
    
    # Check for brown/yellow clusters
    if has_brown_yellow:
        reasoning.append("Brown/yellow clusters detected, indicating stress")
        return False, 0.0, reasoning
    
    # All conditions met - healthy
    confidence = 0.85
    if mean_vari > 0.40:
        confidence = 0.92  # Very high VARI
    if std_vari < 0.08:
        confidence = min(0.95, confidence + 0.05)  # Very uniform
    
    reasoning.extend([
        f"High VARI uniformity (mean={mean_vari:.3f}, std={std_vari:.3f})",
        "No brown/yellow clusters detected",
        "Healthy green dominance confirmed"
    ])
    
    return True, confidence, reasoning


def stage3_stress_vs_disease_separation(features: Dict) -> Tuple[str, float, List[str]]:
    """
    Stage 3: Stress vs Disease Separation
    
    Stress = uniform color degradation (low texture variance)
    Disease = localized irregular lesions (high texture variance)
    
    Returns:
        Tuple of (issue, confidence, reasoning)
    """
    reasoning = []
    
    mean_vari = features['mean_vari']
    std_vari = features['std_vari']
    texture_variance = features['texture_variance']
    has_brown_yellow = features['has_brown_yellow_clusters']
    brown_yellow_ratio = features['brown_yellow_ratio']
    
    # High texture variance indicates disease (irregular lesions)
    # Low texture variance indicates uniform stress
    texture_threshold = 500.0  # Empirical threshold
    
    if texture_variance > texture_threshold:
        # High texture variance - could be disease, but we need more evidence
        reasoning.append(f"High texture variance ({texture_variance:.1f}) suggests irregular patterns")
        reasoning.append("Insufficient evidence for disease classification")
        return "Inconclusive", 0.55, reasoning
    
    # Low texture variance - uniform stress pattern
    # Determine type of stress based on VARI and color patterns
    
    # Nitrogen deficiency: moderate VARI drop, uniform yellowing
    if 0.10 <= mean_vari < 0.25 and std_vari < 0.15 and has_brown_yellow and brown_yellow_ratio > 0.20:
        confidence = 0.75
        if mean_vari < 0.15:
            confidence = 0.80
        
        reasoning.extend([
            f"Uniform yellowing pattern (VARI={mean_vari:.3f})",
            f"Low texture variance ({texture_variance:.1f}) indicates uniform stress",
            f"Brown/yellow coverage ({brown_yellow_ratio:.1%}) suggests nutrient deficiency"
        ])
        return "Nitrogen Deficiency", confidence, reasoning
    
    # Water stress: lower VARI, uniform pattern, less yellow
    if 0.05 <= mean_vari < 0.20 and std_vari < 0.18 and texture_variance < texture_threshold:
        confidence = 0.70
        if mean_vari < 0.10:
            confidence = 0.75
        
        reasoning.extend([
            f"Reduced chlorophyll (VARI={mean_vari:.3f})",
            f"Uniform stress pattern (std={std_vari:.3f})",
            "Consistent with water stress symptoms"
        ])
        return "Water Stress", confidence, reasoning
    
    # Borderline case - inconclusive
    reasoning.append("Stress pattern detected but type unclear")
    reasoning.append("Insufficient evidence for specific classification")
    return "Inconclusive", 0.60, reasoning


def stage4_fungal_disease_strict(features: Dict) -> Tuple[bool, float, List[str]]:
    """
    Stage 4: Fungal Disease Detection (STRICT - HARDEST TO TRIGGER)
    
    Classify Early Blight ONLY IF ALL are true:
    - Brown/black circular spots detected
    - Spot diameter variance > threshold (irregular sizes)
    - High local contrast regions
    - Lesions cover < 40% leaf area (not total leaf death)
    
    Returns:
        Tuple of (is_fungal, confidence, reasoning)
    """
    reasoning = []
    
    has_lesions = features['has_lesions']
    lesion_coverage = features['lesion_coverage']
    spot_variance = features['spot_variance']
    contrast_score = features['contrast_score']
    texture_variance = features['texture_variance']
    
    # Condition 1: Lesions must be detected
    if not has_lesions:
        reasoning.append("No fungal lesions detected")
        return False, 0.0, reasoning
    
    # Condition 2: Lesion coverage must be < 40%
    if lesion_coverage >= 0.40:
        reasoning.append(f"Lesion coverage too high ({lesion_coverage:.1%} >= 40%) - may be total leaf death")
        return False, 0.0, reasoning
    
    # Condition 3: Spot variance must be significant (irregular sizes)
    spot_variance_threshold = 1000.0
    if spot_variance < spot_variance_threshold:
        reasoning.append(f"Spot size variance too low ({spot_variance:.1f} < {spot_variance_threshold}) - not irregular enough")
        return False, 0.0, reasoning
    
    # Condition 4: High local contrast (lesion boundaries)
    contrast_threshold = 15.0
    if contrast_score < contrast_threshold:
        reasoning.append(f"Local contrast too low ({contrast_score:.1f} < {contrast_threshold}) - no clear lesion boundaries")
        return False, 0.0, reasoning
    
    # Condition 5: High texture variance (irregular patterns)
    texture_threshold = 600.0
    if texture_variance < texture_threshold:
        reasoning.append(f"Texture variance too low ({texture_variance:.1f} < {texture_threshold}) - pattern too uniform")
        return False, 0.0, reasoning
    
    # All conditions met - fungal disease detected
    confidence = 0.80
    if lesion_coverage > 0.10 and lesion_coverage < 0.30:
        confidence = 0.85  # Optimal lesion coverage range
    if spot_variance > 2000.0:
        confidence = min(0.90, confidence + 0.05)  # Very irregular spots
    
    reasoning.extend([
        f"Brown/black circular spots detected (coverage={lesion_coverage:.1%})",
        f"High spot size variance ({spot_variance:.1f}) indicates irregular lesion sizes",
        f"High local contrast ({contrast_score:.1f}) confirms lesion boundaries",
        f"High texture variance ({texture_variance:.1f}) indicates irregular disease pattern",
        "All fungal disease criteria met"
    ])
    
    return True, confidence, reasoning


def diagnose_leaf(features: Dict, health_score: float) -> Dict:
    """
    Complete precision-first diagnosis pipeline.
    
    Multi-stage decision process:
    1. Image validity gate
    2. Healthy dominance check (easiest to trigger)
    3. Stress vs Disease separation
    4. Fungal disease detection (hardest to trigger)
    
    Philosophy: Disease classification is opt-in, not default.
    If evidence is insufficient → return "Inconclusive" or "Healthy".
    
    Args:
        features: Dictionary with all extracted features
        health_score: Computed health score (0-100)
    
    Returns:
        Dictionary with:
        - issue: One of 5 allowed labels
        - confidence: Confidence score (0.0-1.0)
        - recommendation: Actionable recommendation
        - ndvi: Approximate NDVI equivalent value
        - reasoning: List of explanation strings
    """
    all_reasoning = []
    
    # Stage 1: Image Validity Gate
    is_valid, invalid_issue, validity_reasoning = stage1_image_validity_gate(features)
    all_reasoning.extend(validity_reasoning)
    
    if not is_valid:
        return {
            'issue': 'Inconclusive',  # Always use one of 5 allowed labels
            'confidence': 0.0,
            'recommendation': "Image quality insufficient for analysis. Please retake the image with better lighting and ensure the leaf is clearly visible and well-framed.",
            'ndvi': get_ndvi_equivalent(features['mean_vari']),
            'reasoning': all_reasoning
        }
    
    # Stage 2: Healthy Dominance Check (MUST COME FIRST)
    is_healthy, healthy_confidence, healthy_reasoning = stage2_healthy_dominance_check(features)
    all_reasoning.extend(healthy_reasoning)
    
    if is_healthy:
        # Apply confidence suppression
        final_confidence = min(healthy_confidence, 0.85)  # Cap at 0.85 unless very strong
        
        return {
            'issue': 'Healthy',
            'confidence': round(final_confidence, 2),
            'recommendation': "Leaf appears healthy. Continue current care practices. Monitor regularly for any changes.",
            'ndvi': get_ndvi_equivalent(features['mean_vari']),
            'reasoning': all_reasoning
        }
    
    # Stage 3: Stress vs Disease Separation
    stress_issue, stress_confidence, stress_reasoning = stage3_stress_vs_disease_separation(features)
    all_reasoning.extend(stress_reasoning)
    
    # Stage 4: Fungal Disease Detection (STRICT)
    is_fungal, fungal_confidence, fungal_reasoning = stage4_fungal_disease_strict(features)
    
    if is_fungal:
        # Fungal disease detected - highest priority
        all_reasoning.extend(fungal_reasoning)
        
        # Apply confidence suppression
        final_confidence = min(fungal_confidence, 0.85)
        
        return {
            'issue': 'Fungal Disease (Early Blight)',
            'confidence': round(final_confidence, 2),
            'recommendation': "Early Blight (fungal disease) detected. Immediate action: isolate affected plants, apply fungicide (Mancozeb 75% WP @ 2g/liter water), improve air circulation, and remove severely affected leaves. Consult agricultural expert if condition persists.",
            'ndvi': get_ndvi_equivalent(features['mean_vari']),
            'reasoning': all_reasoning
        }
    
    # If we got here, we have stress but not disease
    # Use stress classification from Stage 3
    
    # Apply confidence suppression - if confidence < 0.7, mark as Inconclusive
    if stress_confidence < 0.70:
        all_reasoning.append("Confidence too low for definitive classification")
        return {
            'issue': 'Inconclusive',
            'confidence': round(stress_confidence, 2),
            'recommendation': "Leaf shows signs of stress, but classification is uncertain. Please retake image with better lighting and ensure leaf is clearly visible. Monitor plant closely for changes.",
            'ndvi': get_ndvi_equivalent(features['mean_vari']),
            'reasoning': all_reasoning
        }
    
    # Return stress classification
    recommendations = {
        'Water Stress': "Water stress detected. Increase irrigation frequency. Check soil moisture levels. Ensure adequate drainage to prevent root rot.",
        'Nitrogen Deficiency': "Nitrogen deficiency detected. Apply nitrogen-rich fertilizer (NPK 19:19:19 or urea). Ensure proper soil pH (6.0-7.0) for nutrient uptake.",
        'Inconclusive': "Stress pattern detected but type unclear. Monitor plant closely and consider retaking image with better conditions."
    }
    
    final_confidence = min(stress_confidence, 0.80)  # Cap confidence
    
    return {
        'issue': stress_issue,
        'confidence': round(final_confidence, 2),
        'recommendation': recommendations.get(stress_issue, "Monitor plant closely for changes."),
        'ndvi': get_ndvi_equivalent(features['mean_vari']),
        'reasoning': all_reasoning
    }
