"""
Relay Controller

Controls Arduino relay via serial communication.
Sends ON/OFF commands and tracks relay state.
"""

import serial
import threading
import time
from typing import Optional
import config


class RelayController:
    """
    Controls relay via serial communication with Arduino.
    
    Sends simple commands:
    - "ON\n" → Turn relay ON
    - "OFF\n" → Turn relay OFF
    
    Handles:
    - Serial connection management
    - State tracking
    - Duration-based auto-off
    - Thread-safe operations
    """
    
    def __init__(self):
        """Initialize relay controller."""
        self._lock = threading.Lock()
        self.serial_connection: Optional[serial.Serial] = None
        self.is_on = False
        self.turned_on_at: Optional[float] = None
        self.scheduled_off_at: Optional[float] = None
        self.auto_off_thread: Optional[threading.Thread] = None
        self._stop_auto_off = False
    
    def connect(self) -> bool:
        """
        Connect to Arduino via serial port (thread-safe).
        
        Returns:
            True if connected successfully, False otherwise
        """
        with self._lock:
            try:
                if self.serial_connection and self.serial_connection.is_open:
                    return True
                
                print(f"[RELAY] Connecting to Arduino on {config.SERIAL_PORT} at {config.BAUD_RATE} baud...")
                self.serial_connection = serial.Serial(
                    port=config.SERIAL_PORT,
                    baudrate=config.BAUD_RATE,
                    timeout=config.SERIAL_TIMEOUT
                )
                time.sleep(2)  # Wait for Arduino to reset
                
                if self.serial_connection.is_open:
                    print(f"[RELAY] ✅ Connected to Arduino on {config.SERIAL_PORT}")
                    return True
                else:
                    print(f"[RELAY] ❌ Failed to open serial port")
                    return False
                    
            except serial.SerialException as e:
                print(f"[RELAY] ❌ Serial connection error: {e}")
                print(f"[RELAY] 💡 Make sure Arduino is connected to {config.SERIAL_PORT}")
                return False
            except Exception as e:
                print(f"[RELAY] ❌ Unexpected error: {e}")
                return False
    
    def disconnect(self) -> None:
        """Disconnect from Arduino (thread-safe)."""
        with self._lock:
            if self.serial_connection and self.serial_connection.is_open:
                self.serial_connection.close()
                print("[RELAY] Disconnected from Arduino")
    
    def turn_on(self) -> bool:
        """
        Turn relay ON (thread-safe).
        
        Returns:
            True if command sent successfully, False otherwise
        """
        with self._lock:
            if not self.connect():
                return False
            
            try:
                self.serial_connection.write(b"ON\n")
                self.serial_connection.flush()
                
                self.is_on = True
                self.turned_on_at = time.time()
                
                print(f"[RELAY] ✅ Relay ON")
                return True
                
            except Exception as e:
                print(f"[RELAY] ❌ Error sending ON command: {e}")
                return False
    
    def turn_off(self) -> bool:
        """
        Turn relay OFF (thread-safe).
        
        Returns:
            True if command sent successfully, False otherwise
        """
        with self._lock:
            if not self.connect():
                return False
            
            try:
                self.serial_connection.write(b"OFF\n")
                self.serial_connection.flush()
                
                if self.turned_on_at:
                    duration = time.time() - self.turned_on_at
                    print(f"[RELAY] ✅ Relay OFF (was ON for {duration:.1f} seconds)")
                else:
                    print(f"[RELAY] ✅ Relay OFF")
                
                self.is_on = False
                self.turned_on_at = None
                self.scheduled_off_at = None
                
                # Stop auto-off thread
                self._stop_auto_off = True
                
                return True
                
            except Exception as e:
                print(f"[RELAY] ❌ Error sending OFF command: {e}")
                return False
    
    def turn_on_for(self, duration_seconds: int) -> bool:
        """
        Turn relay ON for specified duration, then automatically turn OFF.
        
        Args:
            duration_seconds: Duration in seconds
        
        Returns:
            True if command sent successfully, False otherwise
        """
        if not self.turn_on():
            return False
        
        # Schedule auto-off
        self.scheduled_off_at = time.time() + duration_seconds
        
        # Start auto-off thread
        if self.auto_off_thread is None or not self.auto_off_thread.is_alive():
            self._stop_auto_off = False
            self.auto_off_thread = threading.Thread(
                target=self._auto_off_worker,
                args=(duration_seconds,),
                daemon=True
            )
            self.auto_off_thread.start()
        
        print(f"[RELAY] ⏰ Will turn OFF automatically after {duration_seconds} seconds")
        return True
    
    def _auto_off_worker(self, duration_seconds: int) -> None:
        """Background worker to turn OFF relay after duration."""
        time.sleep(duration_seconds)
        
        if not self._stop_auto_off and self.is_on:
            print(f"[RELAY] ⏰ Auto-OFF triggered after {duration_seconds} seconds")
            self.turn_off()
    
    def get_status(self) -> dict:
        """
        Get relay controller status (thread-safe).
        
        Returns:
            Dictionary with relay state
        """
        with self._lock:
            status = {
                "is_on": self.is_on,
                "connected": self.serial_connection is not None and self.serial_connection.is_open if self.serial_connection else False,
                "port": config.SERIAL_PORT,
                "baud_rate": config.BAUD_RATE
            }
            
            if self.is_on and self.turned_on_at:
                elapsed = time.time() - self.turned_on_at
                status["elapsed_seconds"] = elapsed
                if self.scheduled_off_at:
                    remaining = self.scheduled_off_at - time.time()
                    status["remaining_seconds"] = max(0, remaining)
            
            return status

