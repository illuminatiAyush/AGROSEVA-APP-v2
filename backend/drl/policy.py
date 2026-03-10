"""
PPO Policy Configuration for AgroSeva Irrigation Agent

Defines hyperparameters, training configuration, and a factory function
to instantiate a stable-baselines3 PPO model. No training logic here —
see train.py for the training pipeline.
"""

from pathlib import Path
from typing import Dict, Any

from stable_baselines3 import PPO


# ════════════════════════════════════════════════════════
# PPO Hyperparameters
# ════════════════════════════════════════════════════════

PPO_CONFIG: Dict[str, Any] = {
    "policy": "MlpPolicy",
    "learning_rate": 3e-4,
    "n_steps": 512,
    "batch_size": 64,
    "n_epochs": 10,
    "gamma": 0.99,
    "ent_coef": 0.01,
    "clip_range": 0.2,
    "vf_coef": 0.5,
    "verbose": 1,
    "policy_kwargs": dict(net_arch=[64, 64]),
}


# ════════════════════════════════════════════════════════
# Training Configuration
# ════════════════════════════════════════════════════════

_BASE_DIR = Path(__file__).parent

TRAIN_CONFIG: Dict[str, Any] = {
    "n_envs": 4,
    "total_timesteps": 200_000,
    "eval_freq": 5_000,
    "model_save_path": str(_BASE_DIR / "models" / "best_ppo_agroseva"),
    "final_save_path": str(_BASE_DIR / "models" / "ppo_agroseva_final"),
    "log_dir": str(_BASE_DIR / "logs"),
}


# ════════════════════════════════════════════════════════
# Factory
# ════════════════════════════════════════════════════════

def build_model(env) -> PPO:
    """
    Instantiate a PPO model with AgroSeva configuration.

    Args:
        env: Gymnasium-compatible (vectorized) environment.

    Returns:
        Configured PPO model ready for training.
    """
    return PPO(env=env, **PPO_CONFIG)
