"""
Decision-Making Agent

Evaluates sensor data and makes autonomous irrigation decisions.
Uses rule-based logic as a placeholder for reward-based DRL policy.
"""

from typing import Dict, Optional, Any
import config


def decide_action(sensor_data: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """
    Make irrigation decision based on sensor data.
    
    CURRENT POLICY (documented as placeholder for DRL):
    - IF moisture < 25% → IRRIGATE for 30 seconds
    - IF 25% ≤ moisture < 35% → IRRIGATE for 15 seconds
    - ELSE (moisture >= 35%) → DO_NOTHING
    
    This logic is a placeholder for a reward-based DRL policy.
    The DRL agent will learn optimal irrigation strategies from experience,
    considering multiple factors (moisture, pH, temperature, historical data,
    crop type, weather, etc.) and optimizing for:
    - Water efficiency
    - Crop yield
    - Energy consumption
    - Long-term soil health
    
    Args:
        sensor_data: Dictionary with sensor readings
                    Required: "moisture" (float, 0-100)
                    Optional: "ph" (float, 0-14), "temperature" (float, Celsius)
    
    Returns:
        Dictionary with:
        - action: "IRRIGATE" or "DO_NOTHING"
        - duration: seconds (0 if DO_NOTHING)
        - reason: explanation string
    """
    moisture = sensor_data.get("moisture")
    
    # Validate moisture data (required for decision)
    if moisture is None:
        return {
            "action": "DO_NOTHING",
            "duration": 0,
            "reason": "Moisture sensor data not available - cannot make irrigation decision"
        }
    
    # Decision Logic (Rule-based, placeholder for DRL)
    # This logic is explicitly a placeholder for a reward-based DRL policy.
    # The DRL agent will replace these hardcoded thresholds with learned policies
    # that adapt to different conditions and optimize for multiple objectives.
    
    if moisture < config.MOISTURE_THRESHOLD_LOW:
        # Very dry soil - irrigate longer
        duration = config.IRRIGATION_DURATION_LONG
        return {
            "action": "IRRIGATE",
            "duration": duration,
            "reason": f"Soil very dry (moisture {moisture}% < {config.MOISTURE_THRESHOLD_LOW}%) - irrigating for {duration}s"
        }
    elif moisture < config.MOISTURE_THRESHOLD_HIGH:
        # Moderately dry soil - irrigate shorter
        duration = config.IRRIGATION_DURATION_SHORT
        return {
            "action": "IRRIGATE",
            "duration": duration,
            "reason": f"Soil dry (moisture {moisture}% < {config.MOISTURE_THRESHOLD_HIGH}%) - irrigating for {duration}s"
        }
    else:
        # Adequate moisture - no irrigation needed
        return {
            "action": "DO_NOTHING",
            "duration": 0,
            "reason": f"Soil moisture adequate (moisture {moisture}% >= {config.MOISTURE_THRESHOLD_HIGH}%)"
        }

