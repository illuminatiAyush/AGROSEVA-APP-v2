"""
Legacy DQN Baseline + Comparison Utility

Contains the original DQN architecture (LEGACY — not used for inference)
and a compare_with_ppo() function that runs a rule-based policy mimicking
old DQN behavior so train.py can print a before/after comparison table.
"""

import numpy as np
from typing import Dict

import torch
import torch.nn as nn
import torch.nn.functional as F


# ════════════════════════════════════════════════════════
# LEGACY: DQN Network (kept for reference only)
# ════════════════════════════════════════════════════════

class DQN(nn.Module):
    """
    LEGACY Deep Q-Network for irrigation decision-making.

    Architecture:
    - Input: 3 values (moisture, irrigation_on, time_since_last)
    - Hidden Layer 1: 128 neurons (ReLU)
    - Hidden Layer 2: 128 neurons (ReLU)
    - Output: 3 Q-values (one per action)

    NOTE: This class is preserved for reference. The production system
    now uses PPO via stable-baselines3. See policy.py.
    """

    def __init__(self, state_dim: int = 3, action_dim: int = 3, hidden_dim: int = 128) -> None:
        super(DQN, self).__init__()
        self.fc1 = nn.Linear(state_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, action_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)


# ════════════════════════════════════════════════════════
# LEGACY: Replay Buffer (kept for reference only)
# ════════════════════════════════════════════════════════

class ReplayBuffer:
    """LEGACY experience replay buffer. Preserved for reference."""

    def __init__(self, capacity: int = 10000) -> None:
        self.capacity = capacity
        self.buffer: list = []
        self.position: int = 0

    def push(self, state, action, reward, next_state, done) -> None:
        if len(self.buffer) < self.capacity:
            self.buffer.append(None)
        self.buffer[self.position] = (state, action, reward, next_state, done)
        self.position = (self.position + 1) % self.capacity

    def sample(self, batch_size: int):
        import random
        batch = random.sample(self.buffer, min(batch_size, len(self.buffer)))
        states = torch.FloatTensor([e[0] for e in batch])
        actions = torch.LongTensor([e[1] for e in batch])
        rewards = torch.FloatTensor([e[2] for e in batch])
        next_states = torch.FloatTensor([e[3] for e in batch])
        dones = torch.BoolTensor([e[4] for e in batch])
        return states, actions, rewards, next_states, dones

    def __len__(self) -> int:
        return len(self.buffer)


# ════════════════════════════════════════════════════════
# Baseline Comparison (used by train.py)
# ════════════════════════════════════════════════════════

def compare_with_ppo(n_episodes: int = 5) -> Dict[str, float]:
    """
    Run a rule-based policy mimicking old DQN behavior on the new
    SoilIrrigationEnv and return performance metrics.

    Rule-based policy:
        moisture < 0.35 → IRRIGATE_30S (action 3)
        moisture > 0.60 → DO_NOTHING   (action 0)
        else            → DO_NOTHING   (action 0)

    Args:
        n_episodes: Number of evaluation episodes to run.

    Returns:
        Dict with keys:
            mean_reward     — average total episode reward
            mean_water_used — average total water seconds per episode
            pct_in_band     — % of timesteps where moisture is within
                              ±5% of 0.45 ideal
    """
    from .env import SoilIrrigationEnv, IDEAL_MOISTURE

    env = SoilIrrigationEnv()
    total_rewards: list = []
    total_waters: list = []
    total_in_band: list = []

    for _ in range(n_episodes):
        obs, info = env.reset()
        done = False
        ep_reward = 0.0
        ep_water = 0.0
        ep_steps = 0
        in_band_count = 0

        while not done:
            moisture = obs[0]  # first feature = observed moisture

            # Rule-based: mimic old DQN band policy
            if moisture < 0.35:
                action = 3  # IRRIGATE_30S
            else:
                action = 0  # DO_NOTHING

            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated

            ep_reward += reward
            ep_steps += 1

            # Track water usage from info
            # Water used this step: action durations
            durations = {0: 0, 1: 10, 2: 20, 3: 30}
            ep_water += durations.get(action, 0)

            # Check if within ±5% of ideal
            actual_moisture = info.get("moisture_percent", 0.0) / 100.0
            if abs(actual_moisture - IDEAL_MOISTURE) <= 0.05:
                in_band_count += 1

        total_rewards.append(ep_reward)
        total_waters.append(ep_water)
        total_in_band.append(in_band_count / max(ep_steps, 1) * 100.0)

    return {
        "mean_reward": float(np.mean(total_rewards)),
        "mean_water_used": float(np.mean(total_waters)),
        "pct_in_band": float(np.mean(total_in_band)),
    }


if __name__ == "__main__":
    results = compare_with_ppo()
    print("Rule-based (old DQN proxy) baseline:")
    for k, v in results.items():
        print(f"  {k}: {v:.2f}")
