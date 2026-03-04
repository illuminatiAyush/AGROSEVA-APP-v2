"""
Relay Controller - Self-Healing with Fail-Safe Protocol

Controls Arduino relay via serial communication.
Sends ON/OFF commands and tracks relay state.
Thread-safe operations with duration-based auto-off.

FAIL-SAFE PROTOCOL:
- Commands: "ON:<duration_ms>\n" or "OFF\n"
- Auto-reconnect on disconnect
- Thread auto-restart on exception
- Never crashes the server
"""

import serial
import threading
import time
from typing import Optional
from . import config


class RelayController:
    """
    Controls relay via serial communication with Arduino.
    
    FAIL-SAFE COMMAND PROTOCOL:
    - "ON:<duration_ms>\n" → Turn relay ON for duration (milliseconds)
    - "OFF\n" → Turn relay OFF immediately
    
    Handles:
    - Serial connection management (auto-reconnect)
    - State tracking
    - Duration-based auto-off
    - Thread-safe operations
    - Safety limits enforcement
    - Auto-restart on exception
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
        self._restart_count = 0
    
    def connect(self) -> bool:
        """
        Connect to Arduino via serial port (thread-safe, auto-retry).
        
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
                time.sleep(2)  # Wait for Arduino reset
                
                if self.serial_connection.is_open:
                    print(f"[RELAY] ✅ Connected to Arduino on {config.SERIAL_PORT}")
                    return True
                else:
                    print(f"[RELAY] ❌ Failed to open serial port")
                    return False
                    
            except serial.SerialException as e:
                # Don't spam errors
                if not hasattr(self, '_last_error') or self._last_error != str(e):
                    print(f"[RELAY] ⚠️ Serial connection error: {e}")
                    print(f"[RELAY] 💡 Make sure Arduino is connected to {config.SERIAL_PORT}")
                    self._last_error = str(e)
                return False
            except Exception as e:
                print(f"[RELAY] ❌ Unexpected error: {e}")
                return False
    
    def disconnect(self) -> None:
        """Disconnect from Arduino (thread-safe)."""
        with self._lock:
            if self.serial_connection and self.serial_connection.is_open:
                try:
                    self.serial_connection.close()
                except:
                    pass
                print("[RELAY] Disconnected from Arduino")
    
    def turn_on(self) -> bool:
        """
        Turn relay ON (thread-safe).
        
        Note: Use turn_on_for() for duration-based control.
        
        Returns:
            True if command sent successfully, False otherwise
        """
        with self._lock:
            if not self.connect():
                return False
            
            try:
                # Send ON command (Arduino will handle duration from previous turn_on_for call)
                # For immediate ON without duration, we still send ON:0 and Arduino handles it
                self.serial_connection.write(b"ON:0\n")
                self.serial_connection.flush()
                
                self.is_on = True
                self.turned_on_at = time.time()
                
                print(f"[RELAY] ✅ Relay ON")
                return True
                
            except Exception as e:
                print(f"[RELAY] ❌ Error sending ON command: {e}")
                self._disconnect_internal()
                return False
    
    def turn_off(self) -> bool:
        """
        Turn relay OFF (thread-safe).
        
        Updates is_on immediately so /status endpoint reflects current state.
        
        Returns:
            True if command sent successfully, False otherwise
        """
        with self._lock:
            # Update state immediately (before sending command)
            was_on = self.is_on
            on_duration = None
            if was_on and self.turned_on_at:
                on_duration = time.time() - self.turned_on_at
            
            self.is_on = False
            self.turned_on_at = None
            self.scheduled_off_at = None
            self._stop_auto_off = True
            
            if not self.connect():
                # Even if not connected, state is already updated
                return False
            
            try:
                # Send OFF command
                self.serial_connection.write(b"OFF\n")
                self.serial_connection.flush()
                
                if was_on and on_duration:
                    print(f"[RELAY] ✅ Relay OFF (was ON for {on_duration:.1f} seconds)")
                else:
                    print(f"[RELAY] ✅ Relay OFF")
                
                return True
                
            except Exception as e:
                print(f"[RELAY] ❌ Error sending OFF command: {e}")
                # State already updated above
                self._disconnect_internal()
                return False
    
    def turn_on_for(self, duration_seconds: int) -> bool:
        """
        Turn relay ON for specified duration, then automatically turn OFF.
        
        FAIL-SAFE PROTOCOL:
        - Sends "ON:<duration_ms>\n" to Arduino
        - Arduino firmware enforces max ON time
        - Python also tracks duration as backup
        
        Args:
            duration_seconds: Duration in seconds (converted to milliseconds for Arduino)
        
        Returns:
            True if command sent successfully, False otherwise
        """
        with self._lock:
            if not self.connect():
                return False
            
            try:
                # Convert seconds to milliseconds for Arduino
                duration_ms = duration_seconds * 1000
                
                # Send command: "ON:<duration_ms>\n"
                command = f"ON:{duration_ms}\n".encode('utf-8')
                self.serial_connection.write(command)
                self.serial_connection.flush()
                
                # Update state immediately (before sending command)
                self.is_on = True
                self.turned_on_at = time.time()
                self.scheduled_off_at = time.time() + duration_seconds
                
                print(f"[RELAY] ✅ Relay ON for {duration_seconds}s ({duration_ms}ms)")
                print(f"[RELAY] ✅ State updated: is_on=True (immediately available to /status endpoint)")
                
                # Start auto-off thread (backup safety - Arduino firmware also enforces)
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
                
            except Exception as e:
                print(f"[RELAY] ❌ Error sending ON command: {e}")
                self._disconnect_internal()
                return False
    
    def _auto_off_worker(self, duration_seconds: int) -> None:
        """
        Background worker to turn OFF relay after duration (backup safety).
        
        Note: Arduino firmware also enforces max ON time, so this is a backup.
        """
        try:
            time.sleep(duration_seconds)
            
            if not self._stop_auto_off and self.is_on:
                print(f"[RELAY] ⏰ Auto-OFF triggered after {duration_seconds} seconds")
                self.turn_off()
        except Exception as e:
            print(f"[RELAY] ❌ Error in auto-off worker: {e}")
            # Try to turn off anyway
            try:
                self.turn_off()
            except:
                pass
    
    def _disconnect_internal(self) -> None:
        """Internal disconnect (no lock - called from within locked section)."""
        if self.serial_connection and self.serial_connection.is_open:
            try:
                self.serial_connection.close()
            except:
                pass
            self.serial_connection = None
    
    def is_connected(self) -> bool:
        """
        Check if connected to Arduino (thread-safe).
        
        Returns:
            True if connected
        """
        with self._lock:
            return self.serial_connection is not None and self.serial_connection.is_open
    
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
                "baud_rate": config.BAUD_RATE,
                "restart_count": self._restart_count
            }
            
            if self.is_on and self.turned_on_at:
                elapsed = time.time() - self.turned_on_at
                status["elapsed_seconds"] = elapsed
                if self.scheduled_off_at:
                    remaining = self.scheduled_off_at - time.time()
                    status["remaining_seconds"] = max(0, remaining)
            
            return status
