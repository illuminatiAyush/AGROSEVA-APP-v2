"""
Decision-Making Agent - Deep Reinforcement Learning (DRL)
"""

import numpy as np
from typing import Dict, Any
from . import config

# DRL lazy-load flags
_drl_available = None
_policy_loaded = False


def _lazy_load_drl() -> bool:
    global _drl_available, _policy_loaded

    if _drl_available is False:
        return False

    if _policy_loaded:
        return True

    try:
        from drl.policy import load_policy
        if load_policy():
            _policy_loaded = True
            _drl_available = True
            print("[AGENT] 🤖 DRL policy active")
            return True
        else:
            _drl_available = False
            print("[AGENT] ⚠️ DRL unavailable, using rule-based")
            return False
    except Exception:
        _drl_available = False
        print("[AGENT] ⚠️ DRL unavailable, using rule-based")
        return False


def _build_state(moisture: float, irrigation_on: bool, time_since_last: float) -> np.ndarray:
    return np.array([
        np.clip(moisture / 100.0, 0.0, 1.0),
        1.0 if irrigation_on else 0.0,
        np.clip(time_since_last / 300.0, 0.0, 1.0)
    ], dtype=np.float32)


def decide_action(
    moisture: float,
    irrigation_on: bool = False,
    time_since_last: float = 0.0
) -> Dict[str, Any]:

    # -------- DRL PATH --------
    if _lazy_load_drl():
        try:
            from drl.policy import predict_action_with_explanation

            state = _build_state(moisture, irrigation_on, time_since_last)
            action, explanation = predict_action_with_explanation(state, moisture)

            if action == 0:
                return {
                    "action": "DO_NOTHING",
                    "duration": 0,
                    "reason": "DRL decision: DO_NOTHING",
                    "method": "DRL",
                    "explanation": explanation
                }

            elif action == 1:
                return {
                    "action": "IRRIGATE",
                    "duration": 15,
                    "reason": "DRL decision: IRRIGATE_15S",
                    "method": "DRL",
                    "explanation": explanation
                }

            elif action == 2:
                return {
                    "action": "IRRIGATE",
                    "duration": 30,
                    "reason": "DRL decision: IRRIGATE_30S",
                    "method": "DRL",
                    "explanation": explanation
                }

            else:
                raise ValueError(f"Invalid DRL action: {action}")

        except Exception as e:
            print(f"[AGENT] ⚠️ DRL error: {e} — falling back")

    # -------- RULE-BASED FALLBACK --------
    if moisture < config.MOISTURE_THRESHOLD_LOW:
        return {
            "action": "IRRIGATE",
            "duration": config.IRRIGATION_DURATION_LONG,
            "reason": "Rule-based: soil very dry",
            "method": "RULE_BASED",
            "explanation": "Soil moisture critically low."
        }

    elif moisture < config.MOISTURE_THRESHOLD_HIGH:
        return {
            "action": "IRRIGATE",
            "duration": config.IRRIGATION_DURATION_SHORT,
            "reason": "Rule-based: soil dry",
            "method": "RULE_BASED",
            "explanation": "Soil moisture below optimal."
        }

    return {
        "action": "DO_NOTHING",
        "duration": 0,
        "reason": "Rule-based: soil adequate",
        "method": "RULE_BASED",
        "explanation": "Soil moisture adequate."
    }
