"""
Inference-Only Policy Loader for DRL Agent

Loads trained DQN model and provides prediction interface.
NO training code - only inference for live system.
"""

import torch
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from .dqn import DQN


# Path to trained model
MODEL_PATH = Path(__file__).parent / "policy.pth"

# Global policy network (loaded once, used for all predictions)
_policy_net: Optional[DQN] = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_policy() -> bool:
    """
    Load trained DQN policy from disk.
    
    Returns:
        True if loaded successfully, False otherwise
    """
    global _policy_net
    
    if not MODEL_PATH.exists():
        print(f"[DRL] ⚠️ Trained model not found at {MODEL_PATH}")
        print(f"[DRL] ⚠️ Run 'python backend/drl/train.py' first to train the model")
        return False
    
    try:
        _policy_net = DQN(state_dim=3, action_dim=3, hidden_dim=128).to(_device)
        _policy_net.load_state_dict(torch.load(MODEL_PATH, map_location=_device))
        _policy_net.eval()  # Set to evaluation mode (no gradients)
        print(f"[DRL] ✅ Loaded trained policy from {MODEL_PATH}")
        return True
    except Exception as e:
        print(f"[DRL] ❌ Error loading policy: {e}")
        return False


def predict_action(state: np.ndarray) -> int:
    """
    Predict optimal action given current state.
    
    Args:
        state: State vector [moisture (0-1), irrigation_on (0/1), time_since_last (0-1)]
               - moisture: Normalized moisture (0.0 = 0%, 1.0 = 100%)
               - irrigation_on: 0.0 if OFF, 1.0 if ON
               - time_since_last: Normalized time since last irrigation (0.0 = just irrigated, 1.0 = max)
    
    Returns:
        Action: 0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S
    """
    global _policy_net
    
    if _policy_net is None:
        # Try to load if not already loaded
        if not load_policy():
            # Fallback: return DO_NOTHING if model not available
            print("[DRL] ⚠️ Policy not loaded, returning DO_NOTHING")
            return 0
    
    # Convert state to tensor
    state_tensor = torch.FloatTensor(state).unsqueeze(0).to(_device)
    
    # Get Q-values (no gradients needed for inference)
    with torch.no_grad():
        q_values = _policy_net(state_tensor)
        action = q_values.argmax().item()
    
    return action


def explain_action(state: np.ndarray, action: int, moisture_percent: float) -> str:
    """
    Generate human-readable explanation for DRL decision (XAI).
    
    Args:
        state: State vector [moisture (0-1), irrigation_on (0/1), time_since_last (0-1)]
        action: Predicted action (0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S)
        moisture_percent: Actual moisture percentage (0-100)
    
    Returns:
        Human-readable explanation string
    """
    optimal_min = 35.0
    optimal_max = 60.0
    
    if action == 0:  # DO_NOTHING
        if optimal_min <= moisture_percent <= optimal_max:
            return f"Soil moisture is optimal ({moisture_percent:.1f}%), within the ideal range of 35-60%. No irrigation needed to maintain healthy crop conditions."
        elif moisture_percent > optimal_max:
            return f"Soil moisture is adequate ({moisture_percent:.1f}%), above the optimal range. The DRL agent determined that irrigation would waste water and potentially cause over-saturation."
        else:
            # This case is less common (moisture < 35% but DO_NOTHING)
            return f"Current moisture is {moisture_percent:.1f}%. The DRL agent evaluated the state and determined that waiting is optimal at this time."
    
    elif action == 1:  # IRRIGATE_15S
        if moisture_percent < optimal_min:
            deficit = optimal_min - moisture_percent
            return f"Soil moisture is {moisture_percent:.1f}%, below the optimal range (35-60%). The DRL agent determined that a 15-second irrigation will improve soil conditions, prevent crop stress, and maximize long-term reward while minimizing water usage."
        else:
            return f"Current moisture is {moisture_percent:.1f}%. The DRL agent selected a 15-second irrigation to optimize soil conditions based on learned optimal policies."
    
    elif action == 2:  # IRRIGATE_30S
        if moisture_percent < 25.0:
            return f"Soil moisture is critically low ({moisture_percent:.1f}%), well below the optimal range. The DRL agent determined that a 30-second irrigation is necessary to restore healthy soil conditions, prevent severe crop stress, and maximize agricultural yield."
        elif moisture_percent < optimal_min:
            deficit = optimal_min - moisture_percent
            return f"Soil moisture is {moisture_percent:.1f}%, below the optimal range (35-60%). The DRL agent determined that a 30-second irrigation will effectively restore optimal moisture levels, improving crop health and reward outcomes."
        else:
            return f"Current moisture is {moisture_percent:.1f}%. The DRL agent selected a 30-second irrigation based on learned optimal policies for this state."
    
    return "DRL agent made an irrigation decision based on learned optimal policies."


def predict_action_with_explanation(state: np.ndarray, moisture_percent: float) -> Tuple[int, str]:
    """
    Predict action and generate explanation (XAI).
    
    Args:
        state: State vector [moisture (0-1), irrigation_on (0/1), time_since_last (0-1)]
        moisture_percent: Actual moisture percentage (0-100)
    
    Returns:
        Tuple of (action, explanation):
        - action: 0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S
        - explanation: Human-readable explanation string
    """
    action = predict_action(state)
    explanation = explain_action(state, action, moisture_percent)
    print(f"[DRL] Generated explanation: {explanation}")
    return action, explanation


def get_action_mapping() -> dict:
    """
    Get mapping from action index to irrigation duration.
    
    Returns:
        Dictionary mapping action -> duration in seconds
    """
    return {
        0: 0,      # DO_NOTHING
        1: 15,     # IRRIGATE_15S
        2: 30      # IRRIGATE_30S
    }

