"""
Thread-Safe Sensor Data Store

Stores latest sensor values with thread-safe access.
Used by serial reader to update values and by agent to read values.
"""

import threading
from typing import Optional, Dict
from datetime import datetime


class SensorStore:
    """
    Thread-safe storage for sensor readings.
    
    Stores latest sensor values with timestamps.
    Thread-safe for concurrent access from serial reader and agent.
    """
    
    def __init__(self):
        """Initialize sensor store."""
        self._lock = threading.Lock()
        self._data: Dict[str, float] = {}
        self._timestamp: Optional[datetime] = None
        self._source: str = "unknown"
    
    def update(self, sensor_type: str, value: float, source: str = "arduino") -> None:
        """
        Update a sensor value (thread-safe).
        
        Args:
            sensor_type: Sensor type ('moisture', 'ph', 'temperature', etc.)
            value: Sensor reading value
            source: Data source ('arduino', 'inject', etc.)
        """
        with self._lock:
            self._data[sensor_type] = value
            self._timestamp = datetime.now()
            self._source = source
    
    def update_moisture(self, value: float, source: str = "arduino") -> None:
        """
        Update moisture value (convenience method).
        
        Args:
            value: Moisture percentage (0-100)
            source: Data source
        """
        self.update("moisture", value, source)
    
    def get(self, sensor_type: str) -> Optional[float]:
        """
        Get latest sensor value (thread-safe).
        
        Args:
            sensor_type: Sensor type ('moisture', 'ph', 'temperature', etc.)
        
        Returns:
            Latest sensor value or None if not available
        """
        with self._lock:
            return self._data.get(sensor_type)
    
    def get_moisture(self) -> Optional[float]:
        """
        Get latest moisture value (convenience method).
        
        Returns:
            Latest moisture percentage or None
        """
        return self.get("moisture")
    
    def get_all(self) -> Dict[str, float]:
        """
        Get all sensor values (thread-safe).
        
        Returns:
            Dictionary of all sensor values
        """
        with self._lock:
            return self._data.copy()
    
    def get_timestamp(self) -> Optional[datetime]:
        """
        Get timestamp of last update (thread-safe).
        
        Returns:
            Timestamp of last sensor update
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
    
    def has_data(self) -> bool:
        """
        Check if any sensor data is available (thread-safe).
        
        Returns:
            True if sensor data exists
        """
        with self._lock:
            return len(self._data) > 0
    
    def clear(self) -> None:
        """Clear all sensor data (thread-safe)."""
        with self._lock:
            self._data.clear()
            self._timestamp = None
            self._source = "unknown"

