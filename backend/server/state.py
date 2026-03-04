"""
Thread-Safe State Storage

Stores latest sensor values with thread-safe access.
Used by serial reader to update values and by agent/routes to read values.
"""

import threading
from typing import Optional, Dict
from datetime import datetime
import time


class State:
    """
    Thread-safe storage for sensor readings.
    
    Stores latest sensor values with timestamps.
    Thread-safe for concurrent access from serial reader and agent/routes.
    """
    
    def __init__(self):
        """Initialize state storage."""
        self._lock = threading.Lock()
        self._moisture: Optional[float] = None
        self._temperature: Optional[float] = None  # Temperature in Celsius
        self._ph: Optional[float] = None  # pH value
        self._timestamp: Optional[float] = None  # Unix timestamp
        self._source: str = "unknown"
        self._irrigation_state: str = "OFF"  # "ON" or "OFF"
        self._last_decision_explanation: Optional[str] = None  # XAI explanation
    
    def update_moisture(self, value: float, source: str = "arduino") -> None:
        """
        Update moisture value (thread-safe).
        
        STATE INTEGRITY: Once a sensor value is known, it stays until replaced by newer data.
        Updating one sensor does not reset others.
        
        Args:
            value: Moisture percentage (0-100)
            source: Data source ('arduino', etc.)
        """
        with self._lock:
            self._moisture = float(value)  # Ensure it's a float
            self._timestamp = time.time()  # Update timestamp on any sensor update
            self._source = source
            # Log EXACTLY as required
            print(f"[STATE] Moisture updated: {value}%")
    
    def update_temperature(self, value: float, source: str = "arduino") -> None:
        """
        Update temperature value (thread-safe).
        
        STATE INTEGRITY: Once a sensor value is known, it stays until replaced by newer data.
        Updating one sensor does not reset others.
        
        Args:
            value: Temperature in Celsius
            source: Data source ('arduino', etc.)
        """
        with self._lock:
            self._temperature = float(value)
            self._timestamp = time.time()  # Update timestamp on any sensor update
            self._source = source
            # Log EXACTLY as required
            print(f"[STATE] Temperature updated: {value}°C")
    
    def update_ph(self, value: float, source: str = "arduino") -> None:
        """
        Update pH value (thread-safe).
        
        STATE INTEGRITY: Once a sensor value is known, it stays until replaced by newer data.
        Updating one sensor does not reset others.
        
        Args:
            value: pH value (typically 0-14)
            source: Data source ('arduino', etc.)
        """
        with self._lock:
            self._ph = float(value)
            self._timestamp = time.time()  # Update timestamp on any sensor update
            self._source = source
            # Log EXACTLY as required
            print(f"[STATE] pH updated: {value}")
    
    def get_moisture(self) -> Optional[float]:
        """
        Get latest moisture value (thread-safe).
        
        Returns:
            Latest moisture percentage or None if not available
        """
        with self._lock:
            return self._moisture
    
    def get_temperature(self) -> Optional[float]:
        """
        Get latest temperature value (thread-safe).
        
        Returns:
            Latest temperature in Celsius or None if not available
        """
        with self._lock:
            return self._temperature
    
    def get_ph(self) -> Optional[float]:
        """
        Get latest pH value (thread-safe).
        
        Returns:
            Latest pH value or None if not available
        """
        with self._lock:
            return self._ph
    
    def get_timestamp(self) -> Optional[float]:
        """
        Get timestamp of last update (thread-safe).
        
        Returns:
            Unix timestamp of last sensor update
        """
        with self._lock:
            return self._timestamp
    
    def get_source(self) -> str:
        """
        Get source of last update (thread-safe).
        
        Returns:
            Source identifier
        """
        with self._lock:
            return self._source
    
    def has_moisture(self) -> bool:
        """
        Check if moisture data is available (thread-safe).
        
        Returns:
            True if moisture data exists
        """
        with self._lock:
            return self._moisture is not None
    
    def set_irrigation_state(self, state: str) -> None:
        """
        Update irrigation state (thread-safe).
        
        Args:
            state: "ON" or "OFF"
        """
        with self._lock:
            self._irrigation_state = state
    
    def get_irrigation_state(self) -> str:
        """
        Get current irrigation state (thread-safe).
        
        Returns:
            "ON" or "OFF"
        """
        with self._lock:
            return self._irrigation_state
    
    def set_explanation(self, text: str) -> None:
        """
        Update decision explanation (thread-safe).
        
        Args:
            text: Human-readable explanation of the decision
        """
        with self._lock:
            self._last_decision_explanation = text
            print(f"[STATE] Updated explanation: {text}")
    
    def get_explanation(self) -> Optional[str]:
        """
        Get last decision explanation (thread-safe).
        
        Returns:
            Explanation text or None if not available
        """
        with self._lock:
            return self._last_decision_explanation
    
    def get_state(self) -> Dict:
        """
        Get complete state (thread-safe).
        
        Returns:
            Dictionary with all sensor values, timestamp, source, irrigation_state, and explanation
        """
        with self._lock:
            return {
                "moisture": self._moisture,
                "temperature": self._temperature,
                "ph": self._ph,
                "timestamp": self._timestamp,
                "source": self._source,
                "irrigation_state": self._irrigation_state,
                "explanation": self._last_decision_explanation
            }

