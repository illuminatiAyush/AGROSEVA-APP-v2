"""
Deep Reinforcement Learning Module for AgroSeva Irrigation System

PPO-based smart irrigation agent (upgraded from legacy DQN).
- SoilIrrigationEnv: 8-feature Gymnasium environment
- PPO via stable-baselines3: offline, edge-deployable
- Training is done OFFLINE, inference is done ONLINE.
"""

from .env import SoilIrrigationEnv
from .policy import build_model, PPO_CONFIG, TRAIN_CONFIG
from .train import train

__all__ = [
    "SoilIrrigationEnv",
    "build_model",
    "PPO_CONFIG",
    "TRAIN_CONFIG",
    "train",
]
