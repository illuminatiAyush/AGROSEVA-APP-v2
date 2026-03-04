"""
Deep Q-Network (DQN) Model for Irrigation Decision-Making

PyTorch neural network that learns optimal irrigation policies.
Input: 3-dimensional state vector
Output: Q-values for 3 discrete actions
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class DQN(nn.Module):
    """
    Deep Q-Network for irrigation decision-making.
    
    Architecture:
    - Input: 3 values (moisture, irrigation_on, time_since_last)
    - Hidden Layer 1: 128 neurons (ReLU)
    - Hidden Layer 2: 128 neurons (ReLU)
    - Output: 3 Q-values (one per action)
    """
    
    def __init__(self, state_dim: int = 3, action_dim: int = 3, hidden_dim: int = 128):
        """
        Initialize DQN model.
        
        Args:
            state_dim: Dimension of state vector (default: 3)
            action_dim: Number of actions (default: 3)
            hidden_dim: Number of neurons in hidden layers (default: 128)
        """
        super(DQN, self).__init__()
        
        # Input layer
        self.fc1 = nn.Linear(state_dim, hidden_dim)
        
        # Hidden layers
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        
        # Output layer (Q-values for each action)
        self.fc3 = nn.Linear(hidden_dim, action_dim)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the network.
        
        Args:
            x: State tensor of shape (batch_size, state_dim)
        
        Returns:
            Q-values tensor of shape (batch_size, action_dim)
        """
        # Input -> Hidden 1 (ReLU)
        x = F.relu(self.fc1(x))
        
        # Hidden 1 -> Hidden 2 (ReLU)
        x = F.relu(self.fc2(x))
        
        # Hidden 2 -> Output (Q-values)
        x = self.fc3(x)
        
        return x


class ReplayBuffer:
    """
    Experience replay buffer for DQN training.
    
    Stores (state, action, reward, next_state, done) tuples.
    """
    
    def __init__(self, capacity: int = 10000):
        """
        Initialize replay buffer.
        
        Args:
            capacity: Maximum number of experiences to store
        """
        self.capacity = capacity
        self.buffer = []
        self.position = 0
    
    def push(self, state, action, reward, next_state, done):
        """
        Add experience to buffer.
        
        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Next state
            done: Whether episode ended
        """
        if len(self.buffer) < self.capacity:
            self.buffer.append(None)
        self.buffer[self.position] = (state, action, reward, next_state, done)
        self.position = (self.position + 1) % self.capacity
    
    def sample(self, batch_size: int):
        """
        Sample a batch of experiences.
        
        Args:
            batch_size: Number of experiences to sample
        
        Returns:
            Batch of (state, action, reward, next_state, done) tuples
        """
        import random
        batch = random.sample(self.buffer, min(batch_size, len(self.buffer)))
        
        states = torch.FloatTensor([e[0] for e in batch])
        actions = torch.LongTensor([e[1] for e in batch])
        rewards = torch.FloatTensor([e[2] for e in batch])
        next_states = torch.FloatTensor([e[3] for e in batch])
        dones = torch.BoolTensor([e[4] for e in batch])
        
        return states, actions, rewards, next_states, dones
    
    def __len__(self):
        """Return current size of buffer."""
        return len(self.buffer)



