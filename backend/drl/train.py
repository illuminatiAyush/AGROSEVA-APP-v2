"""
PPO Training Pipeline for AgroSeva Irrigation Agent

Trains a PPO agent on SoilIrrigationEnv, saves the best model via
EvalCallback, prints a DQN-vs-PPO comparison table, and generates
reward curve and episode visualization plots.

Usage:
    cd backend
    python -m drl.train
"""

import time
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch
import matplotlib
matplotlib.use("Agg")  # non-interactive backend (no GUI needed)
import matplotlib.pyplot as plt

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecMonitor
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.monitor import Monitor

from .env import SoilIrrigationEnv, IDEAL_MOISTURE, EPISODE_LENGTH
from .policy import build_model, TRAIN_CONFIG
from .dqn import compare_with_ppo


# ════════════════════════════════════════════════════════
# Path setup
# ════════════════════════════════════════════════════════

_BASE_DIR = Path(__file__).parent
_PLOTS_DIR = _BASE_DIR / "plots"
_MODELS_DIR = _BASE_DIR / "models"
_LOGS_DIR = _BASE_DIR / "logs"
_POLICY_PTH = _BASE_DIR / "policy.pth"


# ════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════

def _make_env():
    """Factory for a single monitored env instance."""
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    env = SoilIrrigationEnv()
    return Monitor(env, filename=str(_LOGS_DIR / "monitor"))


def _evaluate_ppo(model: PPO, n_episodes: int = 5) -> Dict[str, float]:
    """
    Evaluate trained PPO model and return metrics comparable to compare_with_ppo().

    Args:
        model: Trained PPO model
        n_episodes: Number of evaluation episodes

    Returns:
        Dict with mean_reward, mean_water_used, pct_in_band
    """
    env = SoilIrrigationEnv()

    total_rewards: List[float] = []
    total_waters: List[float] = []
    total_in_band: List[float] = []

    action_durations = {0: 0, 1: 10, 2: 20, 3: 30}

    for _ in range(n_episodes):
        obs, info = env.reset()
        done = False
        ep_reward = 0.0
        ep_water = 0.0
        ep_steps = 0
        in_band_count = 0

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            action = int(action)

            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated

            ep_reward += reward
            ep_water += action_durations.get(action, 0)
            ep_steps += 1

            actual_m = info.get("moisture_percent", 0.0) / 100.0
            if abs(actual_m - IDEAL_MOISTURE) <= 0.05:
                in_band_count += 1

        total_rewards.append(ep_reward)
        total_waters.append(ep_water)
        total_in_band.append(in_band_count / max(ep_steps, 1) * 100.0)

    return {
        "mean_reward": float(np.mean(total_rewards)),
        "mean_water_used": float(np.mean(total_waters)),
        "pct_in_band": float(np.mean(total_in_band)),
    }


def _plot_reward_curve(log_dir: Path) -> None:
    """
    Plot and save training reward curve from Monitor logs.

    Args:
        log_dir: Directory containing monitor CSV logs
    """
    _PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    # Collect rewards from monitor files
    rewards: List[float] = []
    for csv_file in sorted(log_dir.rglob("*.monitor.csv")):
        try:
            lines = csv_file.read_text().strip().split("\n")
            # Skip header lines (lines starting with #)
            data_lines = [l for l in lines if not l.startswith("#") and l.strip()]
            if len(data_lines) > 1:  # first line is column names
                for line in data_lines[1:]:
                    parts = line.split(",")
                    if len(parts) >= 1:
                        try:
                            rewards.append(float(parts[0]))
                        except ValueError:
                            pass
        except Exception:
            pass

    if not rewards:
        print("[TRAIN] [WARN] No reward data found for plotting, skipping reward curve.")
        return

    # Smooth with rolling average
    window = min(20, len(rewards) // 3 + 1)
    smoothed = np.convolve(rewards, np.ones(window) / window, mode="valid")

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(rewards, alpha=0.25, color="steelblue", label="Raw")
    ax.plot(
        range(window - 1, window - 1 + len(smoothed)),
        smoothed,
        color="darkblue",
        linewidth=2,
        label=f"Smoothed (window={window})",
    )
    ax.set_xlabel("Episode")
    ax.set_ylabel("Episode Reward")
    ax.set_title("AgroSeva PPO — Training Reward Curve")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()

    save_path = _PLOTS_DIR / "reward_curve.png"
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"[TRAIN] [CHART] Reward curve saved to {save_path}")


def _plot_episode_viz(model: PPO) -> None:
    """
    Run one episode and plot moisture trajectory, irrigation actions,
    and evaporation-related hour info.

    Args:
        model: Trained PPO model
    """
    _PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    env = SoilIrrigationEnv()
    obs, info = env.reset()

    moistures: List[float] = []
    hours: List[float] = []
    actions_taken: List[int] = []
    steps: List[int] = []

    done = False
    step_idx = 0

    while not done:
        action, _ = model.predict(obs, deterministic=True)
        action = int(action)

        obs, reward, terminated, truncated, info = env.step(action)
        done = terminated or truncated

        moistures.append(info["moisture_percent"])
        hours.append(info["hour"])
        actions_taken.append(action)
        steps.append(step_idx)
        step_idx += 1

    # ── Plot ──────────────────────────────────────────
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True,
                                    gridspec_kw={"height_ratios": [3, 1]})

    # Top: Moisture over time
    ax1.plot(steps, moistures, color="seagreen", linewidth=1.5, label="Soil Moisture %")
    ax1.axhline(y=IDEAL_MOISTURE * 100, color="orange", linestyle="--",
                linewidth=1.5, label=f"Ideal ({IDEAL_MOISTURE*100:.0f}%)")
    ax1.axhspan(40, 50, alpha=0.08, color="green", label="±5% target band")
    ax1.set_ylabel("Soil Moisture (%)")
    ax1.set_title("AgroSeva PPO — Single Episode Visualization")
    ax1.legend(loc="upper right", fontsize=8)
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim(0, 100)

    # Bottom: Irrigation actions
    action_colors = {0: "white", 1: "skyblue", 2: "dodgerblue", 3: "navy"}
    action_labels = {0: "Nothing", 1: "10s", 2: "20s", 3: "30s"}
    colors = [action_colors.get(a, "gray") for a in actions_taken]
    ax2.bar(steps, [1] * len(steps), color=colors, width=1.0, edgecolor="none")
    ax2.set_ylabel("Action")
    ax2.set_xlabel("Timestep (5-min intervals)")
    ax2.set_yticks([])

    # Legend for actions
    from matplotlib.patches import Patch
    patches = [Patch(facecolor=action_colors[a], label=action_labels[a])
               for a in [0, 1, 2, 3]]
    ax2.legend(handles=patches, loc="upper right", fontsize=8, ncol=4)

    fig.tight_layout()
    save_path = _PLOTS_DIR / "episode_viz.png"
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"[TRAIN] [CHART] Episode visualization saved to {save_path}")


def _print_comparison(baseline: Dict[str, float], ppo: Dict[str, float]) -> None:
    """Print formatted comparison table."""
    print()
    print("+------------------------------+----------+----------+")
    print("| Metric                       | Old DQN  | PPO      |")
    print("+------------------------------+----------+----------+")
    print(f"| Mean Episode Reward          | {baseline['mean_reward']:>7.2f}  | {ppo['mean_reward']:>7.2f}  |")
    print(f"| Water Used per Episode       | {baseline['mean_water_used']:>7.1f}  | {ppo['mean_water_used']:>7.1f}  |")
    print(f"| % Time in Target Band (+/-5%)| {baseline['pct_in_band']:>6.1f}%  | {ppo['pct_in_band']:>6.1f}%  |")
    print("+------------------------------+----------+----------+")
    print()


# ════════════════════════════════════════════════════════
# Main training function
# ════════════════════════════════════════════════════════

def train() -> None:
    """
    Full PPO training pipeline:
    1. Create vectorized training env
    2. Setup eval callback
    3. Train model
    4. Save model + policy.pth
    5. Run baseline comparison
    6. Generate plots
    """
    print("=" * 70)
    print("[*] AgroSeva PPO Training - Smart Irrigation Agent")
    print("=" * 70)

    # ── Directories ───────────────────────────────────
    _PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Vectorized training env ───────────────────────
    n_envs = TRAIN_CONFIG["n_envs"]
    print(f"Creating {n_envs} parallel training environments...")

    train_env = DummyVecEnv([_make_env for _ in range(n_envs)])

    # ── Eval env (single, monitored) ──────────────────
    eval_env = DummyVecEnv([_make_env])

    # ── Eval callback ─────────────────────────────────
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=TRAIN_CONFIG["model_save_path"],
        eval_freq=TRAIN_CONFIG["eval_freq"],
        n_eval_episodes=5,
        deterministic=True,
        verbose=1,
    )

    # ── Build model ───────────────────────────────────
    model = build_model(train_env)
    total_ts = TRAIN_CONFIG["total_timesteps"]
    print(f"Training PPO for {total_ts:,} timesteps...")
    print()

    # ── Train ─────────────────────────────────────────
    t0 = time.time()
    model.learn(total_timesteps=total_ts, callback=eval_callback)
    elapsed = time.time() - t0
    print()
    print(f"[OK] Training complete in {elapsed / 60.0:.2f} minutes")

    # ── Save final model ──────────────────────────────
    final_path = TRAIN_CONFIG["final_save_path"]
    model.save(final_path)
    print(f"[OK] Final model saved to {final_path}")

    # ── Export policy.pth (PyTorch state dict) ────────
    torch.save(model.policy.state_dict(), str(_POLICY_PTH))
    print(f"[OK] Policy weights saved to {_POLICY_PTH}")

    # ── Baseline comparison ───────────────────────────
    print()
    print("Running baseline comparison (old DQN rule-based proxy)...")
    baseline = compare_with_ppo(n_episodes=5)

    print("Evaluating trained PPO...")
    ppo_results = _evaluate_ppo(model, n_episodes=5)

    _print_comparison(baseline, ppo_results)

    # ── Plots ─────────────────────────────────────────
    print("Generating plots...")
    _plot_reward_curve(_LOGS_DIR)
    _plot_episode_viz(model)

    # ── Done ──────────────────────────────────────────
    print()
    print("=" * 70)
    print("[OK] AgroSeva PPO training pipeline complete!")
    print(f"   Model: {final_path}")
    print(f"   Weights: {_POLICY_PTH}")
    print(f"   Plots: {_PLOTS_DIR}")
    print("=" * 70)


# ════════════════════════════════════════════════════════
# Entry point
# ════════════════════════════════════════════════════════

if __name__ == "__main__":
    train()
