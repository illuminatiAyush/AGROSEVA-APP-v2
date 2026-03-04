"""
Yield Prediction System

Calculates crop yield scores based on sensor data and environmental conditions.
READ-ONLY module - never modifies sensor data or irrigation state.
"""

from .yield_engine import compute_current_yield, calculate_yield_score
from .yield_drl_adapter import estimate_yield_impact

__all__ = ['compute_current_yield', 'estimate_yield_impact', 'calculate_yield_score']

