"""
PPO-based Irrigation Agent — Decision Interface

Provides the `decide_action` function used by the server to translate
live sensor data into an irrigation action via the trained PPO model.

State Vector (8 features):
    [soil_moisture, moisture_change_rate, irrigation_on,
     time_since_last_irr, hour_sin, hour_cos,
     cumulative_water_used, moisture_deficit]

Action Space (Discrete 4):
    0: DO_NOTHING
    1: IRRIGATE_10S
    2: IRRIGATE_20S
    3: IRRIGATE_30S
"""

import os
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

# Action labels for XAI explanations
ACTION_LABELS = {
    0: "DO_NOTHING",
    1: "IRRIGATE_10S",
    2: "IRRIGATE_20S",
    3: "IRRIGATE_30S",
}

ACTION_DURATIONS = {0: 0, 1: 10, 2: 20, 3: 30}

# Ideal moisture target (must match env.py)
IDEAL_MOISTURE = 0.45

# Path to trained PPO model
_MODEL_DIR = Path(__file__).resolve().parent.parent / "drl" / "models"
_MODEL_PATH = _MODEL_DIR / "best_ppo_agroseva.zip"

# Global model (lazy-loaded)
_ppo_model = None


def _load_model():
    """Lazy-load the PPO model on first call."""
    global _ppo_model
    if _ppo_model is not None:
        return _ppo_model

    if not _MODEL_PATH.exists():
        print(f"[AGENT] PPO model not found at {_MODEL_PATH}")
        print(f"[AGENT] Will use rule-based fallback")
        return None

    try:
        from stable_baselines3 import PPO
        _ppo_model = PPO.load(str(_MODEL_PATH))
        print(f"[AGENT] PPO model loaded from {_MODEL_PATH}")
        return _ppo_model
    except Exception as e:
        print(f"[AGENT] Failed to load PPO model: {e}")
        return None


def _build_state(
    moisture: float,
    prev_moisture: float,
    irrigation_on: bool,
    time_since_last_irr: float,
    hour: float,
    cumulative_water: float,
) -> np.ndarray:
    """
    Build the 8-feature observation vector from live sensor data.

    Args:
        moisture: Current soil moisture (0-1 scale, e.g., 0.45 = 45%)
        prev_moisture: Previous moisture reading
        irrigation_on: Whether irrigation is currently running
        time_since_last_irr: Minutes since last irrigation
        hour: Current hour (0-24 fractional)
        cumulative_water: Cumulative water used today (seconds)

    Returns:
        np.ndarray of shape (8,) with float32 dtype
    """
    moisture_change = moisture - prev_moisture
    hour_sin = np.sin(2.0 * np.pi * hour / 24.0)
    hour_cos = np.cos(2.0 * np.pi * hour / 24.0)
    norm_time = min(time_since_last_irr / 60.0, 1.0)
    norm_water = min(cumulative_water / 100.0, 1.0)
    deficit = max(0.0, IDEAL_MOISTURE - moisture)

    return np.array([
        np.clip(moisture, 0.0, 1.0),
        np.clip(moisture_change, -1.0, 1.0),
        1.0 if irrigation_on else 0.0,
        norm_time,
        hour_sin,
        hour_cos,
        norm_water,
        deficit,
    ], dtype=np.float32)


def _rule_based_fallback(moisture: float) -> Tuple[int, str]:
    """
    Simple rule-based fallback when PPO model is unavailable.

    Returns:
        (action, reason)
    """
    if moisture < 0.25:
        return 3, "Critically dry — irrigate 30s"
    elif moisture < 0.35:
        return 2, "Dry — irrigate 20s"
    elif moisture < 0.40:
        return 1, "Slightly dry — irrigate 10s"
    else:
        return 0, "Moisture adequate — no action"


def decide_action(
    moisture: float,
    prev_moisture: float = 0.0,
    irrigation_on: bool = False,
    time_since_last_irr: float = 0.0,
    hour: Optional[float] = None,
    cumulative_water: float = 0.0,
) -> Dict[str, Any]:
    """
    Decide the irrigation action based on current sensor data.

    Uses the trained PPO model if available, otherwise falls back
    to simple rule-based logic.

    Args:
        moisture: Current soil moisture (0-1 scale)
        prev_moisture: Previous moisture reading
        irrigation_on: Whether irrigation is currently active
        time_since_last_irr: Minutes since last irrigation
        hour: Current hour (0-24). If None, uses system clock.
        cumulative_water: Seconds of water used today

    Returns:
        dict with keys expected by server.py:
            action (str): "DO_NOTHING" or "IRRIGATE"
            duration (int): 0, 10, 20, or 30 seconds
            reason (str): Human-readable reason
            method (str): "ppo" or "rule_based"
            confidence (float): 0-1
            explanation (str): XAI explanation for UI
            action_label (str): "DO_NOTHING", "IRRIGATE_10S", etc.
    """
    import datetime

    if hour is None:
        now = datetime.datetime.now()
        hour = now.hour + now.minute / 60.0

    model = _load_model()

    if model is None:
        # Rule-based fallback
        action_int, reason = _rule_based_fallback(moisture)
        duration = ACTION_DURATIONS[action_int]
        action_str = "IRRIGATE" if action_int > 0 else "DO_NOTHING"
        return {
            "action": action_str,
            "action_int": action_int,
            "action_label": ACTION_LABELS[action_int],
            "duration": duration,
            "duration_seconds": duration,
            "method": "rule_based",
            "confidence": 0.8,
            "reason": reason,
            "explanation": reason,
            "state": [],
        }

    # Build state vector
    state = _build_state(
        moisture, prev_moisture, irrigation_on,
        time_since_last_irr, hour, cumulative_water
    )

    # PPO prediction
    action_int, _states = model.predict(state, deterministic=True)
    action_int = int(action_int)
    duration = ACTION_DURATIONS[action_int]
    action_str = "IRRIGATE" if action_int > 0 else "DO_NOTHING"

    # Build XAI explanation
    deficit = max(0.0, IDEAL_MOISTURE - moisture)
    if action_int == 0:
        explanation = f"Moisture at {moisture*100:.1f}% — no irrigation needed"
    else:
        explanation = (
            f"Moisture at {moisture*100:.1f}% (deficit {deficit*100:.1f}%) — "
            f"irrigate for {duration}s"
        )

    return {
        "action": action_str,
        "action_int": action_int,
        "action_label": ACTION_LABELS[action_int],
        "duration": duration,
        "duration_seconds": duration,
        "method": "ppo",
        "confidence": 0.95,
        "reason": explanation,
        "explanation": explanation,
        "state": state.tolist(),
    }

