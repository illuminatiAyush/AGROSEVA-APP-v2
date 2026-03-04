"""
Offline Training Script for DQN Irrigation Agent

Trains a Deep Q-Network on the IrrigationEnv environment.
Uses experience replay and epsilon-greedy exploration.
Saves trained model as backend/drl/policy.pth

Run this ONCE before deploying the system.
Training takes ~5-10 minutes (configurable).
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from pathlib import Path

# Import from same package (relative imports)
from .env import IrrigationEnv
from .dqn import DQN, ReplayBuffer


# Training hyperparameters
LEARNING_RATE = 0.001
BATCH_SIZE = 64
GAMMA = 0.99  # Discount factor
EPSILON_START = 1.0
EPSILON_END = 0.01
EPSILON_DECAY = 0.995
TARGET_UPDATE = 10  # Update target network every N episodes
REPLAY_BUFFER_SIZE = 10000
MIN_REPLAY_SIZE = 1000  # Start training after this many experiences

# Training configuration
EPISODES = 500  # Number of episodes (~5-10 minutes)
MAX_STEPS_PER_EPISODE = 1000
SAVE_PATH = Path(__file__).parent / "policy.pth"


def train_dqn():
    """
    Train DQN agent on IrrigationEnv.
    
    Uses:
    - Experience replay
    - Epsilon-greedy exploration
    - Target network for stable learning
    - Reward progression logging
    """
    print("="*70)
    print("🌱 AgroSeva DRL Training - DQN Irrigation Agent")
    print("="*70)
    print(f"Training for {EPISODES} episodes (~5-10 minutes)")
    print(f"Model will be saved to: {SAVE_PATH}")
    print("="*70)
    print()
    
    # Initialize environment
    env = IrrigationEnv(max_steps=MAX_STEPS_PER_EPISODE)
    
    # Initialize networks
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    policy_net = DQN(state_dim=3, action_dim=3, hidden_dim=128).to(device)
    target_net = DQN(state_dim=3, action_dim=3, hidden_dim=128).to(device)
    target_net.load_state_dict(policy_net.state_dict())
    target_net.eval()  # Target network is only for evaluation
    
    # Optimizer
    optimizer = optim.Adam(policy_net.parameters(), lr=LEARNING_RATE)
    
    # Replay buffer
    replay_buffer = ReplayBuffer(capacity=REPLAY_BUFFER_SIZE)
    
    # Training statistics
    epsilon = EPSILON_START
    episode_rewards = []
    episode_lengths = []
    
    print("Starting training...")
    print()
    
    for episode in range(EPISODES):
        state, info = env.reset()
        state = torch.FloatTensor(state).unsqueeze(0).to(device)
        
        episode_reward = 0.0
        episode_length = 0
        done = False
        
        while not done:
            # Epsilon-greedy action selection
            if np.random.random() < epsilon:
                action = env.action_space.sample()  # Random action
            else:
                with torch.no_grad():
                    q_values = policy_net(state)
                    action = q_values.argmax().item()
            
            # Execute action
            next_state, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            # Store experience
            replay_buffer.push(
                state.cpu().numpy()[0],
                action,
                reward,
                next_state,
                done
            )
            
            # Update state
            next_state_tensor = torch.FloatTensor(next_state).unsqueeze(0).to(device)
            state = next_state_tensor
            
            # Training step (if enough experiences)
            if len(replay_buffer) >= MIN_REPLAY_SIZE:
                # Sample batch
                states, actions, rewards, next_states, dones = replay_buffer.sample(BATCH_SIZE)
                states = states.to(device)
                actions = actions.to(device)
                rewards = rewards.to(device)
                next_states = next_states.to(device)
                dones = dones.to(device)
                
                # Current Q-values
                q_values = policy_net(states)
                q_value = q_values.gather(1, actions.unsqueeze(1))
                
                # Next Q-values from target network
                with torch.no_grad():
                    next_q_values = target_net(next_states)
                    next_q_value = next_q_values.max(1)[0].detach()
                    target_q_value = rewards + (GAMMA * next_q_value * ~dones)
                
                # Compute loss
                loss = nn.MSELoss()(q_value.squeeze(), target_q_value)
                
                # Optimize
                optimizer.zero_grad()
                loss.backward()
                # Gradient clipping for stability
                torch.nn.utils.clip_grad_norm_(policy_net.parameters(), 1.0)
                optimizer.step()
            
            episode_reward += reward
            episode_length += 1
        
        # Update epsilon (decay)
        epsilon = max(EPSILON_END, epsilon * EPSILON_DECAY)
        
        # Update target network periodically
        if episode % TARGET_UPDATE == 0:
            target_net.load_state_dict(policy_net.state_dict())
        
        # Store statistics
        episode_rewards.append(episode_reward)
        episode_lengths.append(episode_length)
        
        # Log progress
        if (episode + 1) % 50 == 0:
            avg_reward = np.mean(episode_rewards[-50:])
            avg_length = np.mean(episode_lengths[-50:])
            print(f"Episode {episode + 1}/{EPISODES} | "
                  f"Avg Reward: {avg_reward:.2f} | "
                  f"Avg Length: {avg_length:.1f} | "
                  f"Epsilon: {epsilon:.3f}")
    
    # Save trained model
    print()
    print("="*70)
    print("Training complete! Saving model...")
    torch.save(policy_net.state_dict(), SAVE_PATH)
    print(f"✅ Model saved to: {SAVE_PATH}")
    print()
    
    # Print final statistics
    print("Training Statistics:")
    print(f"  Total Episodes: {EPISODES}")
    print(f"  Final Avg Reward (last 50): {np.mean(episode_rewards[-50:]):.2f}")
    print(f"  Best Episode Reward: {max(episode_rewards):.2f}")
    print(f"  Final Epsilon: {epsilon:.3f}")
    print("="*70)
    print()
    print("✅ Training complete! Model ready for deployment.")
    print("   Run: python -m server.server to use the trained policy.")


if __name__ == "__main__":
    train_dqn()

