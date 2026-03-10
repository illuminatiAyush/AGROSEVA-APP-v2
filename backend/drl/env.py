"""
SoilIrrigationEnv — Gymnasium Environment for PPO-based Irrigation Agent

8-feature state, 4 discrete actions, shaped reward with time-of-day dynamics.
Simulates 24 hours of soil moisture with 5-minute timesteps (288 steps/episode).
Fully offline — no API calls, no internet dependency.
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Tuple, Optional, Dict, Any


# ════════════════════════════════════════════════════════
# Constants
# ════════════════════════════════════════════════════════

IDEAL_MOISTURE: float = 0.45
MIN_MOISTURE: float = 0.05
MAX_MOISTURE: float = 0.95
EPISODE_LENGTH: int = 288              # 24 hours at 5-min steps
BASE_EVAPORATION: float = 0.002
MAX_WATER_BUDGET: float = 100.0        # normalized daily water units
SENSOR_NOISE_STD: float = 0.005
IRRIGATION_RATE: float = 0.008         # moisture gain per second of irrigation
MINUTES_PER_STEP: int = 5
MAX_TIME_SINCE_IRR: float = 60.0       # minutes, for normalization


class SoilIrrigationEnv(gym.Env):
    """
    Gymnasium environment for training a PPO irrigation agent.

    State Vector (8 features):
        [soil_moisture, moisture_change_rate, irrigation_on,
         time_since_last_irr, hour_sin, hour_cos,
         cumulative_water_used, moisture_deficit]

    Action Space (Discrete 4):
        0: DO_NOTHING
        1: IRRIGATE_10S  → moisture += 10 × 0.008
        2: IRRIGATE_20S  → moisture += 20 × 0.008
        3: IRRIGATE_30S  → moisture += 30 × 0.008

    Reward:
        Shaped 6-term function rewarding precision, closeness to ideal,
        water efficiency, and penalizing dry/wet extremes and ignoring trends.
    """

    metadata: Dict[str, Any] = {"render_modes": ["human"], "render_fps": 4}

    def __init__(self, render_mode: Optional[str] = None) -> None:
        """Initialize SoilIrrigationEnv."""
        super().__init__()

        self.render_mode = render_mode

        # Observation: 8 floats
        self.observation_space = spaces.Box(
            low=np.array([-1.0, -1.0, 0.0, 0.0, -1.0, -1.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32,
        )

        # Actions: 0=nothing, 1=10s, 2=20s, 3=30s
        self.action_space = spaces.Discrete(4)

        # Internal state (set properly in reset)
        self.soil_moisture: float = 0.0
        self.prev_moisture: float = 0.0
        self.irrigation_on: bool = False
        self.time_since_last_irr: float = 0.0
        self.cumulative_water_used: float = 0.0
        self.current_step: int = 0
        self.hour: float = 0.0  # fractional hour [0, 24)

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Reset environment to a randomized initial state.

        Returns:
            observation: Initial 8-feature state vector
            info: Auxiliary information dict
        """
        super().reset(seed=seed)

        self.soil_moisture = self.np_random.uniform(0.25, 0.65)
        self.prev_moisture = self.soil_moisture
        self.irrigation_on = False
        self.time_since_last_irr = 0.0
        self.cumulative_water_used = 0.0
        self.current_step = 0
        self.hour = self.np_random.uniform(0.0, 24.0)

        observation = self._get_observation()
        info = self._get_info()

        return observation, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one 5-minute timestep.

        Args:
            action: 0=DO_NOTHING, 1=IRRIGATE_10S, 2=IRRIGATE_20S, 3=IRRIGATE_30S

        Returns:
            observation, reward, terminated, truncated, info
        """
        self.prev_moisture = self.soil_moisture

        # ── Apply irrigation ──────────────────────────────
        water_this_step: float = 0.0
        action_durations = {0: 0, 1: 10, 2: 20, 3: 30}
        duration = action_durations.get(action, 0)

        if duration > 0:
            water_gain = duration * IRRIGATION_RATE
            self.soil_moisture += water_gain
            water_this_step = duration  # raw seconds
            self.irrigation_on = True
            self.time_since_last_irr = 0.0
        else:
            self.irrigation_on = False

        # ── Time-aware evaporation ────────────────────────
        hour_sin = np.sin(2.0 * np.pi * self.hour / 24.0)
        time_multiplier = 1.0 + 0.8 * hour_sin   # peaks at solar noon (~6 AM-noon)
        noise = self.np_random.normal(0.0, 0.0005)
        evaporation = BASE_EVAPORATION * time_multiplier + noise
        self.soil_moisture -= evaporation

        # ── Clamp moisture ────────────────────────────────
        self.soil_moisture = float(np.clip(self.soil_moisture, MIN_MOISTURE, MAX_MOISTURE))

        # ── Update trackers ───────────────────────────────
        self.cumulative_water_used += water_this_step
        if not self.irrigation_on:
            self.time_since_last_irr += MINUTES_PER_STEP

        # ── Advance clock ─────────────────────────────────
        self.hour = (self.hour + MINUTES_PER_STEP / 60.0) % 24.0
        self.current_step += 1

        # ── Reward ────────────────────────────────────────
        reward = self._calculate_reward(action, water_this_step)

        # ── Termination ───────────────────────────────────
        terminated = self.current_step >= EPISODE_LENGTH
        truncated = False

        observation = self._get_observation()
        info = self._get_info()

        return observation, reward, terminated, truncated, info

    # ────────────────────────────────────────────────────
    # Private helpers
    # ────────────────────────────────────────────────────

    def _get_observation(self) -> np.ndarray:
        """
        Build the 8-feature observation vector with sensor noise.

        Returns:
            np.ndarray of shape (8,) with float32 dtype
        """
        # Sensor noise on moisture reading
        observed_moisture = self.soil_moisture + self.np_random.normal(0.0, SENSOR_NOISE_STD)
        observed_moisture = float(np.clip(observed_moisture, 0.0, 1.0))

        moisture_change_rate = self.soil_moisture - self.prev_moisture
        moisture_change_rate = float(np.clip(moisture_change_rate, -1.0, 1.0))

        hour_sin = np.sin(2.0 * np.pi * self.hour / 24.0)
        hour_cos = np.cos(2.0 * np.pi * self.hour / 24.0)

        norm_time_since = min(self.time_since_last_irr / MAX_TIME_SINCE_IRR, 1.0)
        norm_water = min(self.cumulative_water_used / MAX_WATER_BUDGET, 1.0)
        deficit = max(0.0, IDEAL_MOISTURE - self.soil_moisture)

        return np.array([
            observed_moisture,
            moisture_change_rate,
            1.0 if self.irrigation_on else 0.0,
            norm_time_since,
            hour_sin,
            hour_cos,
            norm_water,
            deficit,
        ], dtype=np.float32)

    def _calculate_reward(self, action: int, water_used: float) -> float:
        """
        Compute shaped reward.

        Components:
            r_precision  : -|moisture - IDEAL|
            r_closeness  : +0.5 if within ±3% of ideal
            r_water      : -0.01 × water seconds used
            r_dry        : -5.0 × max(0, 0.20 - moisture)²
            r_wet        : -5.0 × max(0, moisture - 0.75)²
            r_trend      : -0.3 if moisture dropping, below ideal, and doing nothing

        Args:
            action: action taken this step
            water_used: seconds of irrigation this step

        Returns:
            Total scalar reward
        """
        moisture_error = abs(self.soil_moisture - IDEAL_MOISTURE)
        moisture_change_rate = self.soil_moisture - self.prev_moisture

        r_precision = -moisture_error
        r_closeness = 0.5 if moisture_error < 0.03 else 0.0
        r_water = -0.01 * water_used
        r_dry = -5.0 * max(0.0, 0.20 - self.soil_moisture) ** 2
        r_wet = -5.0 * max(0.0, self.soil_moisture - 0.75) ** 2
        r_trend = (
            -0.3
            if (moisture_change_rate < -0.01 and action == 0 and self.soil_moisture < IDEAL_MOISTURE)
            else 0.0
        )

        return r_precision + r_closeness + r_water + r_dry + r_wet + r_trend

    def _get_info(self) -> Dict[str, Any]:
        """Return auxiliary info dict."""
        return {
            "moisture_percent": self.soil_moisture * 100.0,
            "hour": self.hour,
            "step": self.current_step,
            "water_used": self.cumulative_water_used,
            "irrigation_on": self.irrigation_on,
        }

    def render(self) -> None:
        """Print human-readable state (optional, for debugging)."""
        if self.render_mode == "human":
            m = self.soil_moisture * 100.0
            print(
                f"Step {self.current_step:3d} | "
                f"Hour {self.hour:5.1f} | "
                f"Moisture {m:5.1f}% | "
                f"Irr {'ON' if self.irrigation_on else 'OFF'} | "
                f"Water {self.cumulative_water_used:.1f}"
            )


# ════════════════════════════════════════════════════════
# Standalone validation
# ════════════════════════════════════════════════════════

if __name__ == "__main__":
    from stable_baselines3.common.env_checker import check_env

    check_env(SoilIrrigationEnv())
    print("[OK] Environment validation passed.")
