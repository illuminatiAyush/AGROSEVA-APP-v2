"""
Yield Engine

Calculates crop yield scores based on sensor data and environmental conditions.
This is the source of truth for yield calculations.

Yield score is a percentage (0-100) representing expected crop yield
relative to optimal conditions.

CRITICAL: This module is READ-ONLY. It never modifies sensor data or irrigation state.
"""

from typing import Optional, Dict, Any


def compute_current_yield(
    moisture: Optional[float] = None,
    temperature: Optional[float] = None,
    ph: Optional[float] = None,
    crop_stage: str = "vegetative"
) -> Dict[str, Any]:
    """
    Compute CURRENT yield score (0-100%).
    
    Deterministic, explainable, sensor READ-ONLY.
    
    Args:
        moisture: Soil moisture percentage (0-100), optional
        temperature: Temperature in Celsius, optional
        ph: Soil pH value (0-14), optional
        crop_stage: Crop growth stage string (seedling, vegetative, flowering, fruiting, mature)
    
    Returns:
        {
            "current": float,  # Yield score 0-100
            "reason": str       # Human-readable explanation
        }
    
    Safety:
        - Missing sensors → skip gracefully
        - Never raises exceptions
        - Never returns None
    """
    # Default to 70% if no data available
    score = 70.0
    factors = []
    
    # === MOISTURE FACTOR (40% weight) ===
    if moisture is not None:
        if 40 <= moisture <= 70:
            score += 20.0
            factors.append("optimal moisture")
        elif 30 <= moisture < 40 or 70 < moisture <= 80:
            score += 10.0
            factors.append("acceptable moisture")
        elif 20 <= moisture < 30 or 80 < moisture <= 90:
            score -= 5.0
            factors.append("suboptimal moisture")
        elif moisture < 20:
            score -= 25.0
            factors.append("critically low moisture")
        elif moisture > 90:
            score -= 20.0
            factors.append("waterlogged soil")
    else:
        factors.append("moisture sensor unavailable")
    
    # === TEMPERATURE FACTOR (25% weight) ===
    if temperature is not None:
        if 20 <= temperature <= 30:
            score += 15.0
            factors.append("optimal temperature")
        elif 15 <= temperature < 20 or 30 < temperature <= 35:
            score += 5.0
            factors.append("acceptable temperature")
        elif 10 <= temperature < 15 or 35 < temperature <= 40:
            score -= 10.0
            factors.append("suboptimal temperature")
        elif temperature < 10 or temperature > 40:
            score -= 20.0
            factors.append("extreme temperature")
    else:
        factors.append("temperature sensor unavailable")
    
    # === pH FACTOR (20% weight) ===
    if ph is not None:
        if 6.0 <= ph <= 7.5:
            score += 12.0
            factors.append("optimal pH")
        elif 5.5 <= ph < 6.0 or 7.5 < ph <= 8.0:
            score += 5.0
            factors.append("acceptable pH")
        elif 5.0 <= ph < 5.5 or 8.0 < ph <= 8.5:
            score -= 8.0
            factors.append("suboptimal pH")
        elif ph < 5.0 or ph > 8.5:
            score -= 15.0
            factors.append("extreme pH")
    else:
        factors.append("pH sensor unavailable")
    
    # === CROP STAGE MODIFIER ===
    stage_modifiers = {
        "seedling": 0.95,
        "vegetative": 1.0,
        "flowering": 1.05,
        "fruiting": 1.0,
        "mature": 0.98
    }
    stage_multiplier = stage_modifiers.get(crop_stage.lower(), 1.0)
    score *= stage_multiplier
    
    # Clamp to 0-100
    score = max(0.0, min(100.0, score))
    
    # Generate reason
    if not factors:
        reason = "No sensor data available - using baseline estimate"
    else:
        primary_factors = [f for f in factors if "optimal" in f or "acceptable" in f]
        if primary_factors:
            reason = f"Yield score based on {', '.join(primary_factors[:2])} during {crop_stage} stage"
        else:
            reason = f"Yield score reflects current conditions during {crop_stage} stage"
    
    return {
        "current": round(score, 1),
        "reason": reason
    }


# Legacy function for backward compatibility (if needed)
def calculate_yield_score(
    crop: str = "generic",
    stage: str = "vegetative",
    moisture: float,
    temperature: Optional[float] = None,
    ph: Optional[float] = None,
    humidity: Optional[float] = None
) -> float:
    """
    Calculate yield score based on sensor data and crop conditions.
    
    Args:
        crop: Crop type (e.g., "wheat", "rice", "corn", "generic")
        stage: Crop growth stage ("seedling", "vegetative", "flowering", "fruiting", "mature")
        moisture: Soil moisture percentage (0-100)
        temperature: Temperature in Celsius (optional)
        ph: Soil pH value (optional, 0-14)
        humidity: Air humidity percentage (optional, 0-100)
    
    Returns:
        Yield score as percentage (0-100), where 100 = optimal yield
    """
    
    # Base score starts at 70 (assumes decent conditions)
    score = 70.0
    
    # === MOISTURE FACTOR (40% weight) ===
    # Optimal moisture range: 40-70%
    if moisture is not None:
        if 40 <= moisture <= 70:
            # Optimal range: +20 points
            score += 20.0
        elif 30 <= moisture < 40 or 70 < moisture <= 80:
            # Acceptable range: +10 points
            score += 10.0
        elif 20 <= moisture < 30 or 80 < moisture <= 90:
            # Suboptimal: -5 points
            score -= 5.0
        elif moisture < 20:
            # Critical low: -25 points
            score -= 25.0
        elif moisture > 90:
            # Critical high (waterlogged): -20 points
            score -= 20.0
    
    # === TEMPERATURE FACTOR (25% weight) ===
    if temperature is not None:
        # Optimal temperature range: 20-30°C
        if 20 <= temperature <= 30:
            score += 15.0
        elif 15 <= temperature < 20 or 30 < temperature <= 35:
            score += 5.0
        elif 10 <= temperature < 15 or 35 < temperature <= 40:
            score -= 10.0
        elif temperature < 10 or temperature > 40:
            score -= 20.0
    
    # === pH FACTOR (20% weight) ===
    if ph is not None:
        # Optimal pH range: 6.0-7.5
        if 6.0 <= ph <= 7.5:
            score += 12.0
        elif 5.5 <= ph < 6.0 or 7.5 < ph <= 8.0:
            score += 5.0
        elif 5.0 <= ph < 5.5 or 8.0 < ph <= 8.5:
            score -= 8.0
        elif ph < 5.0 or ph > 8.5:
            score -= 15.0
    
    # === HUMIDITY FACTOR (15% weight) ===
    if humidity is not None:
        # Optimal humidity range: 50-70%
        if 50 <= humidity <= 70:
            score += 10.0
        elif 40 <= humidity < 50 or 70 < humidity <= 80:
            score += 3.0
        elif humidity < 40 or humidity > 80:
            score -= 5.0
    
    # === CROP STAGE MODIFIER ===
    # Different stages have different sensitivity to conditions
    stage_modifiers = {
        "seedling": 0.95,      # More sensitive, slightly lower base
        "vegetative": 1.0,      # Standard
        "flowering": 1.05,      # Critical stage, slight boost if conditions good
        "fruiting": 1.0,       # Standard
        "mature": 0.98         # Less sensitive
    }
    
    stage_multiplier = stage_modifiers.get(stage.lower(), 1.0)
    score *= stage_multiplier
    
    # Clamp score to 0-100 range
    score = max(0.0, min(100.0, score))
    
    return round(score, 1)

