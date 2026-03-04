# Deep Reinforcement Learning Module

This module implements a Deep Q-Network (DQN) agent for autonomous irrigation decision-making.

## Quick Start

### 1. Train the Model (Offline)

```bash
cd backend
python -m drl.train
```

This will:
- Train the DQN agent for ~5-10 minutes
- Save the trained model to `backend/drl/policy.pth`
- Print reward progression during training

### 2. Run the Server (Online Inference)

```bash
python -m server.server
```

The server will:
- Automatically load the trained DRL policy
- Use DRL to make irrigation decisions
- Fall back to rule-based logic if model not available

## Module Structure

- **`env.py`**: Gym-style environment (`IrrigationEnv`) for training
- **`dqn.py`**: DQN neural network architecture and replay buffer
- **`train.py`**: Offline training script
- **`policy.py`**: Inference-only policy loader (used by live system)
- **`policy.pth`**: Trained model (generated after training)

## DRL Formulation

### State Space (3D, normalized)
- `soil_moisture`: 0.0-1.0 (0% = dry, 1.0 = 100% saturated)
- `irrigation_on`: 0.0 or 1.0 (boolean)
- `time_since_last_irrigation`: 0.0-1.0 (normalized)

### Action Space (Discrete, 3 actions)
- `0`: DO_NOTHING
- `1`: IRRIGATE_15S
- `2`: IRRIGATE_30S

### Reward Function
- `+1.0` if moisture in optimal range (35-60%)
- `-1.0` if moisture < 25% (too dry)
- `-0.5` if moisture > 70% (too wet)
- `-0.2` for any irrigation action (water cost)
- `-2.0` if irrigating while already wet (>60%)

## Training Details

- **Episodes**: 500 (~5-10 minutes)
- **Network**: 2 hidden layers, 128 neurons each
- **Learning Rate**: 0.001
- **Batch Size**: 64
- **Experience Replay**: 10,000 capacity
- **Epsilon Decay**: 0.995 (exploration → exploitation)

## Safety

**DRL never bypasses safety limits:**
- Max ON time (30 seconds) always enforced
- Cooldown period (10 seconds) always enforced
- Safety manager checks all decisions before execution

## Fallback

If trained model is not available, system automatically uses rule-based logic:
- Moisture < 25% → IRRIGATE 30s
- 25% ≤ moisture < 35% → IRRIGATE 15s
- Moisture ≥ 35% → DO_NOTHING



