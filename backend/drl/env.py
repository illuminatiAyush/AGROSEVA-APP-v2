"""
Irrigation Environment for Deep Reinforcement Learning

Gym-style environment for training DRL agents on irrigation decision-making.
Simulates realistic soil moisture dynamics and provides reward-based learning.
"""

import numpy as np
from typing import Tuple, Optional
import gym
from gymnasium import spaces


class IrrigationEnv(gym.Env):
    """
    Irrigation Environment for DRL Training
    
    State Space (normalized floats):
    - soil_moisture: 0.0-1.0 (0% = completely dry, 1.0 = 100% saturated)
    - irrigation_on: 0.0 or 1.0 (boolean: is irrigation currently active)
    - time_since_last_irrigation: 0.0-1.0 (normalized: 0 = just irrigated, 1.0 = max time)
    
    Action Space (Discrete):
    - 0: DO_NOTHING
    - 1: IRRIGATE_15S
    - 2: IRRIGATE_30S
    
    Reward Function:
    - +1.0 if moisture in optimal range (35-60%)
    - -1.0 if moisture < 25% (too dry)
    - -0.5 if moisture > 70% (too wet)
    - -0.2 for any irrigation action (water cost)
    - -2.0 if irrigating while already wet (>60%) (waste penalty)
    """
    
    metadata = {"render_modes": ["human"], "render_fps": 4}
    
    def __init__(self, max_steps: int = 1000):
        """
        Initialize irrigation environment.
        
        Args:
            max_steps: Maximum steps per episode
        """
        super().__init__()
        
        # State space: [moisture (0-1), irrigation_on (0/1), time_since_last (0-1)]
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32
        )
        
        # Action space: 3 discrete actions
        self.action_space = spaces.Discrete(3)
        
        # Environment parameters
        self.max_steps = max_steps
        self.current_step = 0
        
        # State variables
        self.moisture = 0.5  # Start at 50% (normalized: 0.5)
        self.irrigation_on = False
        self.irrigation_remaining = 0  # Steps remaining for current irrigation
        self.time_since_last_irrigation = 0.0
        self.max_time_since_irrigation = 300.0  # 5 minutes max (normalized to 1.0)
        
        # Moisture dynamics parameters
        self.moisture_decay_rate = 0.001  # Natural drying per step
        self.irrigation_rate_15s = 0.15   # Moisture increase per step (15s irrigation)
        self.irrigation_rate_30s = 0.20   # Moisture increase per step (30s irrigation)
        self.irrigation_duration_15s = 15  # Steps for 15s irrigation
        self.irrigation_duration_30s = 30  # Steps for 30s irrigation
        
    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, dict]:
        """
        Reset environment to initial state.
        
        Returns:
            observation: Initial state vector
            info: Additional information
        """
        super().reset(seed=seed)
        
        # Reset state
        self.current_step = 0
        self.moisture = np.random.uniform(0.3, 0.7)  # Random initial moisture (30-70%)
        self.irrigation_on = False
        self.irrigation_remaining = 0
        self.time_since_last_irrigation = 0.0
        
        observation = self._get_observation()
        info = {"moisture_percent": self.moisture * 100}
        
        return observation, info
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, dict]:
        """
        Execute one step in the environment.
        
        Args:
            action: Action to take (0=DO_NOTHING, 1=IRRIGATE_15S, 2=IRRIGATE_30S)
        
        Returns:
            observation: Next state
            reward: Reward for this step
            terminated: Episode ended (reached max steps)
            truncated: Episode truncated (not used)
            info: Additional information
        """
        # Update irrigation state
        if self.irrigation_remaining > 0:
            self.irrigation_remaining -= 1
            if self.irrigation_remaining == 0:
                self.irrigation_on = False
        else:
            self.irrigation_on = False
        
        # Execute action
        if action == 1:  # IRRIGATE_15S
            if not self.irrigation_on:
                self.irrigation_on = True
                self.irrigation_remaining = self.irrigation_duration_15s
                self.time_since_last_irrigation = 0.0
        elif action == 2:  # IRRIGATE_30S
            if not self.irrigation_on:
                self.irrigation_on = True
                self.irrigation_remaining = self.irrigation_duration_30s
                self.time_since_last_irrigation = 0.0
        
        # Update moisture dynamics (realistic simulation)
        if self.irrigation_on:
            # Moisture increases during irrigation
            if action == 1 or self.irrigation_remaining > self.irrigation_duration_15s:
                self.moisture += self.irrigation_rate_15s
            else:
                self.moisture += self.irrigation_rate_30s
        else:
            # Natural drying (moisture decreases)
            self.moisture -= self.moisture_decay_rate
        
        # Clamp moisture to [0, 1]
        self.moisture = np.clip(self.moisture, 0.0, 1.0)
        
        # Update time since last irrigation
        if not self.irrigation_on:
            self.time_since_last_irrigation += 1.0
        
        # Calculate reward
        reward = self._calculate_reward(action)
        
        # Check if episode is done
        self.current_step += 1
        terminated = self.current_step >= self.max_steps
        
        # Get next observation
        observation = self._get_observation()
        
        # Info dict
        info = {
            "moisture_percent": self.moisture * 100,
            "irrigation_on": self.irrigation_on,
            "step": self.current_step
        }
        
        return observation, reward, terminated, False, info
    
    def _get_observation(self) -> np.ndarray:
        """
        Get current state observation.
        
        Returns:
            Normalized state vector [moisture, irrigation_on, time_since_last]
        """
        # Normalize time since last irrigation
        time_normalized = min(self.time_since_last_irrigation / self.max_time_since_irrigation, 1.0)
        
        return np.array([
            self.moisture,  # Already normalized 0-1
            1.0 if self.irrigation_on else 0.0,  # Boolean to float
            time_normalized
        ], dtype=np.float32)
    
    def _calculate_reward(self, action: int) -> float:
        """
        Calculate reward based on current state and action.
        
        Reward Function:
        - +1.0 if moisture in optimal range (35-60%)
        - -1.0 if moisture < 25% (too dry)
        - -0.5 if moisture > 70% (too wet)
        - -0.2 for any irrigation action (water cost)
        - -2.0 if irrigating while already wet (>60%) (waste penalty)
        
        Args:
            action: Action taken
        
        Returns:
            Reward value
        """
        moisture_percent = self.moisture * 100
        reward = 0.0
        
        # Moisture-based rewards
        if 35.0 <= moisture_percent <= 60.0:
            reward += 1.0  # Optimal range
        elif moisture_percent < 25.0:
            reward -= 1.0  # Too dry
        elif moisture_percent > 70.0:
            reward -= 0.5  # Too wet
        
        # Action-based costs
        if action == 1 or action == 2:  # Irrigation action
            reward -= 0.2  # Water cost
            
            # Penalty for irrigating when already wet
            if moisture_percent > 60.0:
                reward -= 2.0  # Waste penalty
        
        return reward
    
    def render(self):
        """Render environment state (optional, for debugging)."""
        moisture_percent = self.moisture * 100
        print(f"Step {self.current_step}: Moisture={moisture_percent:.1f}%, "
              f"Irrigation={'ON' if self.irrigation_on else 'OFF'}, "
              f"Time since last={self.time_since_last_irrigation:.1f}s")



