"""
Safety Manager

Enforces safety limits to prevent dangerous operations.
Includes timeouts, cooldowns, and emergency stop.
Thread-safe operations.
"""

import threading
from typing import Optional, Tuple
from datetime import datetime
from . import config


class SafetyManager:
    """
    Thread-safe safety manager for irrigation system.
    
    Prevents:
    - Over-irrigation (max duration)
    - Rapid cycling (cooldown periods)
    - Double activation
    - Emergency situations
    """
    
    def __init__(self):
        """Initialize safety manager."""
        self._lock = threading.Lock()
        self.emergency_stop = config.EMERGENCY_STOP
        self.last_irrigation_end: Optional[datetime] = None
        self.current_irrigation_start: Optional[datetime] = None
    
    def check_can_irrigate(self, duration_seconds: int) -> Tuple[bool, Optional[str]]:
        """
        Check if irrigation is allowed (thread-safe).
        
        Args:
            duration_seconds: Requested irrigation duration
        
        Returns:
            Tuple of (allowed: bool, reason: Optional[str])
            If allowed is False, reason explains why
        """
        with self._lock:
            # Check emergency stop
            if self.emergency_stop:
                return False, "Emergency stop is active"
            
            # Check duration limit
            if duration_seconds > config.MAX_ON_TIME:
                return False, f"Duration {duration_seconds}s exceeds maximum {config.MAX_ON_TIME}s"
            
            if duration_seconds <= 0:
                return False, "Invalid duration (must be > 0)"
            
            # Check if already irrigating
            if self.current_irrigation_start is not None:
                return False, "Irrigation already in progress"
            
            # Check cooldown period
            if self.last_irrigation_end is not None:
                time_since_last = (datetime.now() - self.last_irrigation_end).total_seconds()
                if time_since_last < config.COOLDOWN:
                    remaining = config.COOLDOWN - time_since_last
                    return False, f"Cooldown period active - wait {remaining:.1f} more seconds"
            
            return True, None
    
    def record_irrigation_start(self, duration_seconds: int) -> None:
        """
        Record that irrigation has started (thread-safe).
        
        Args:
            duration_seconds: Irrigation duration
        """
        with self._lock:
            self.current_irrigation_start = datetime.now()
    
    def record_irrigation_end(self) -> None:
        """Record that irrigation has ended (thread-safe)."""
        with self._lock:
            self.last_irrigation_end = datetime.now()
            self.current_irrigation_start = None
    
    def set_emergency_stop(self, enabled: bool) -> None:
        """
        Set emergency stop state (thread-safe).
        
        Args:
            enabled: True to activate emergency stop, False to deactivate
        """
        with self._lock:
            self.emergency_stop = enabled
            if enabled:
                print("[SAFETY] ⚠️ EMERGENCY STOP ACTIVATED")
            else:
                print("[SAFETY] ✅ Emergency stop deactivated")
    
    def is_irrigating(self) -> bool:
        """
        Check if irrigation is currently in progress (thread-safe).
        
        Returns:
            True if irrigation is active
        """
        with self._lock:
            return self.current_irrigation_start is not None
    
    def get_time_since_last_irrigation(self) -> Optional[float]:
        """
        Get seconds since last irrigation ended (thread-safe).
        
        Returns:
            Seconds since last irrigation, or None if never irrigated
        """
        with self._lock:
            if self.last_irrigation_end is None:
                return None
            return (datetime.now() - self.last_irrigation_end).total_seconds()
    
    def get_status(self) -> dict:
        """
        Get safety manager status (thread-safe).
        
        Returns:
            Dictionary with safety status
        """
        with self._lock:
            return {
                "emergency_stop": self.emergency_stop,
                "is_irrigating": self.is_irrigating(),
                "time_since_last_irrigation": self.get_time_since_last_irrigation(),
                "cooldown_seconds": config.COOLDOWN,
                "max_on_time": config.MAX_ON_TIME
            }

