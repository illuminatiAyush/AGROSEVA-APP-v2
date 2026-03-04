"""
Deep Reinforcement Learning Module for AgroSeva Irrigation System

This module provides:
- IrrigationEnv: Gym-style environment for irrigation decision-making
- DQN: Deep Q-Network model for learning optimal irrigation policies
- Training: Offline training script
- Policy: Inference-only policy loader for live system

Training is done OFFLINE, inference is done ONLINE.
"""

from .policy import load_policy, predict_action, predict_action_with_explanation, explain_action

__all__ = ['load_policy', 'predict_action', 'predict_action_with_explanation', 'explain_action']

