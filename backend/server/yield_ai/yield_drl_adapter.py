"""
Yield DRL Adapter

Estimates FUTURE yield impact of a DRL action.
DRL action is READ-ONLY - this adapter never influences decisions.

ARCHITECTURE:
- DRL chooses irrigation action (0, 1, or 2) - READ-ONLY
- This adapter estimates yield impact of that action
- Returns projected yield and delta

CRITICAL: This module is READ-ONLY. It never modifies sensor data or irrigation state.
"""

from typing import Optional, Dict, Any
from .yield_engine import compute_current_yield, calculate_yield_score


def estimate_yield_impact(
    current_yield: float,
    drl_action: int,
    moisture: float
) -> Dict[str, Any]:
    """
    Estimate FUTURE yield impact of a DRL action.
    
    DRL action is READ-ONLY - this function never influences decisions.
    
    Args:
        current_yield: Current yield score (0-100)
        drl_action: DRL action (0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S)
        moisture: Current soil moisture percentage (0-100)
    
    Returns:
        {
            "projected": float,  # Projected yield after action (0-100)
            "delta": float,       # Change in yield (projected - current)
            "reason": str         # Human-readable explanation
        }
    
    Logic:
        - action 0 (DO_NOTHING) → delta = 0
        - action 1 (IRRIGATE_15S) → delta = +3 to +6%
        - action 2 (IRRIGATE_30S) → delta = +6 to +10%
    
    Safety:
        - Never raises exceptions
        - Never returns None
    """
    # Map DRL action to yield delta
    # Action 0: DO_NOTHING → no change
    if drl_action == 0:
        delta = 0.0
        action_desc = "no irrigation"
        reason = "No irrigation action maintains current yield levels"
    
    # Action 1: IRRIGATE_15S → +3 to +6% improvement
    elif drl_action == 1:
        # Delta depends on current moisture (more improvement if drier)
        if moisture < 30:
            delta = 6.0  # Maximum improvement for very dry soil
        elif moisture < 40:
            delta = 5.0
        elif moisture < 50:
            delta = 4.0
        else:
            delta = 3.0  # Minimum improvement if already moist
        action_desc = "15-second irrigation"
        reason = f"15-second irrigation improves yield by {delta:.1f}% by restoring optimal moisture"
    
    # Action 2: IRRIGATE_30S → +6 to +10% improvement
    elif drl_action == 2:
        # Delta depends on current moisture (more improvement if drier)
        if moisture < 30:
            delta = 10.0  # Maximum improvement for very dry soil
        elif moisture < 40:
            delta = 8.5
        elif moisture < 50:
            delta = 7.0
        else:
            delta = 6.0  # Minimum improvement if already moist
        action_desc = "30-second irrigation"
        reason = f"30-second irrigation improves yield by {delta:.1f}% by restoring optimal moisture"
    
    else:
        # Invalid action → no change
        delta = 0.0
        action_desc = "unknown action"
        reason = "Unknown action - no yield impact estimated"
    
    # Calculate projected yield
    projected = current_yield + delta
    projected = max(0.0, min(100.0, projected))  # Clamp to 0-100
    
    return {
        "projected": round(projected, 1),
        "delta": round(delta, 1),
        "reason": reason
    }


# Legacy function for backward compatibility (if needed)
def estimate_yield_impact_legacy(
    crop: str = "generic",
    stage: str = "vegetative",
    moisture: float,
    temperature: Optional[float] = None,
    ph: Optional[float] = None,
    humidity: Optional[float] = None,
    drl_action: int = 0
) -> Dict[str, Any]:
    """
    Estimate yield impact of a DRL irrigation action.
    
    Args:
        crop: Crop type (default: "generic")
        stage: Crop growth stage (default: "vegetative")
        moisture: Current soil moisture percentage (0-100)
        temperature: Current temperature in Celsius (optional)
        ph: Current soil pH value (optional)
        humidity: Current air humidity percentage (optional)
        drl_action: DRL action (0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S)
    
    Returns:
        Dictionary with:
        {
            "current_yield": float,      # Current yield score (0-100)
            "projected_yield": float,     # Projected yield after action (0-100)
            "delta": float,               # Change in yield (projected - current)
            "reason": str                 # Human-readable explanation
        }
    """
    
    # Calculate current yield score
    current_yield = calculate_yield_score(
        crop=crop,
        stage=stage,
        moisture=moisture,
        temperature=temperature,
        ph=ph,
        humidity=humidity
    )
    
    # Simulate moisture change from DRL action
    # Action 0 (DO_NOTHING) → no change
    # Action 1 (IRRIGATE_15S) → +8% moisture
    # Action 2 (IRRIGATE_30S) → +15% moisture
    moisture_delta = 0.0
    action_description = "no irrigation"
    
    if drl_action == 1:
        moisture_delta = 8.0
        action_description = "15-second irrigation"
    elif drl_action == 2:
        moisture_delta = 15.0
        action_description = "30-second irrigation"
    
    # Calculate projected moisture (clamped to 0-100)
    projected_moisture = max(0.0, min(100.0, moisture + moisture_delta))
    
    # Calculate projected yield with new moisture
    projected_yield = calculate_yield_score(
        crop=crop,
        stage=stage,
        moisture=projected_moisture,
        temperature=temperature,
        ph=ph,
        humidity=humidity
    )
    
    # Calculate delta
    delta = projected_yield - current_yield
    
    # Generate reason based on stage and delta
    reason = _generate_yield_reason(
        stage=stage,
        delta=delta,
        action_description=action_description,
        current_moisture=moisture,
        projected_moisture=projected_moisture
    )
    
    return {
        "current_yield": round(current_yield, 1),
        "projected_yield": round(projected_yield, 1),
        "delta": round(delta, 1),
        "reason": reason
    }


def _generate_yield_reason(
    stage: str,
    delta: float,
    action_description: str,
    current_moisture: float,
    projected_moisture: float
) -> str:
    """
    Generate human-readable explanation of yield impact.
    
    Args:
        stage: Crop growth stage
        delta: Yield change (positive = improvement, negative = decline)
        action_description: Description of DRL action
        current_moisture: Current moisture level
        projected_moisture: Projected moisture after action
    
    Returns:
        Human-readable explanation string
    """
    
    # Stage-specific messages
    stage_names = {
        "seedling": "seedling stage",
        "vegetative": "vegetative stage",
        "flowering": "flowering stage",
        "fruiting": "fruiting stage",
        "mature": "mature stage"
    }
    stage_name = stage_names.get(stage.lower(), "current stage")
    
    # Determine impact level
    if delta > 5.0:
        impact = "significantly improves"
        detail = f"preventing moisture stress at the {stage_name}"
    elif delta > 2.0:
        impact = "improves"
        detail = f"maintaining optimal conditions during {stage_name}"
    elif delta > -2.0:
        impact = "maintains"
        detail = f"current yield levels at the {stage_name}"
    elif delta > -5.0:
        impact = "slightly reduces"
        detail = f"due to suboptimal moisture at {stage_name}"
    else:
        impact = "reduces"
        detail = f"due to unfavorable conditions at {stage_name}"
    
    # Build explanation
    if delta != 0.0:
        return (
            f"{action_description.capitalize()} {impact} projected yield by {abs(delta):.1f}%, "
            f"{detail}."
        )
    else:
        return (
            f"{action_description.capitalize()} maintains current yield levels. "
            f"Moisture is adequate for {stage_name}."
        )

