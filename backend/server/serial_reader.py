"""
Serial Reader - Self-Healing with Heartbeat Detection

Reads live sensor data from Arduino via serial communication.
Runs in background thread and updates state with real sensor values.

FAIL-SAFE FEATURES:
- Auto-reconnect on disconnect (never crashes)
- Heartbeat detection (detects Arduino failure)
- Thread auto-restart on exception
- Never blocks the server
"""

import serial
import threading
import time
import re
import json
from typing import Optional
from . import config
from .state import State


class SerialReader:
    """
    Reads sensor data from Arduino via serial port.
    
    Expected Arduino output format:
    - "MOISTURE:42" (integer percentage)
    - "HB:<uptime_ms>" (heartbeat every 2 seconds)
    
    FAIL-SAFE:
    - Auto-reconnects if Arduino disconnects
    - Detects heartbeat loss (>6 seconds = Arduino failure)
    - Thread auto-restarts on exception
    - Never crashes the server
    """
    
    def __init__(self, state: State):
        """
        Initialize serial reader.
        
        Args:
            state: State instance to update with readings
        """
        self.state = state
        self.serial_connection: Optional[serial.Serial] = None
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self._restart_count = 0
        self._last_heartbeat_time: Optional[float] = None
        self._heartbeat_timeout = config.HEARTBEAT_TIMEOUT  # Configurable heartbeat timeout
        self._lock = threading.Lock()
    
    def start(self) -> None:
        """Start serial reading thread (self-healing)."""
        if self.running:
            print(f"[SERIAL] ⚠️ Serial reader already running")
            return
        
        self.running = True
        self._start_thread()
        print(f"[SERIAL] ✅ Started serial reader thread (target: {config.SERIAL_PORT})")
        print(f"[SERIAL] Moisture pipeline armed and waiting for data...")
        
        # Verify thread started
        if self.thread and self.thread.is_alive():
            print(f"[SERIAL] ✅ Thread is alive and running")
        else:
            print(f"[SERIAL] ⚠️ WARNING: Thread may not have started properly")
    
    def _start_thread(self) -> None:
        """Start or restart the reading thread."""
        if self.thread and self.thread.is_alive():
            return
        
        self.thread = threading.Thread(target=self._read_loop_with_recovery, daemon=True)
        self.thread.start()
    
    def stop(self) -> None:
        """Stop serial reading thread."""
        self.running = False
        if self.serial_connection and self.serial_connection.is_open:
            try:
                self.serial_connection.close()
            except:
                pass
        print(f"[SERIAL] Stopped serial reader thread")
    
    def _read_loop_with_recovery(self) -> None:
        """
        Main reading loop with automatic recovery (runs in background thread).
        
        WRAPPED IN TRY/EXCEPT - auto-restarts on any exception.
        """
        print(f"[SERIAL] 🔄 Serial reader thread loop started")
        while self.running:
            try:
                self._read_loop()
            except Exception as e:
                # CRITICAL: Never let thread die - auto-restart
                self._restart_count += 1
                print(f"[RECOVERY] Serial thread exception (restart #{self._restart_count}): {e}")
                import traceback
                traceback.print_exc()
                print(f"[RECOVERY] Serial thread will restart in 3 seconds...")
                
                # Disconnect before retry
                self._disconnect()
                
                # Wait before restart
                time.sleep(3)
                
                # Restart thread if still running
                if self.running:
                    print(f"[RECOVERY] Serial thread restarted")
                    continue
                else:
                    break
    
    def _read_loop(self) -> None:
        """Main reading loop (called by recovery wrapper)."""
        connection_attempts = 0
        while self.running:
            try:
                # Try to connect
                if not self._connect():
                    connection_attempts += 1
                    if connection_attempts % 5 == 0:  # Log every 5 attempts
                        print(f"[SERIAL] 🔄 Retry #{connection_attempts} - waiting {config.RECONNECT_DELAY}s before next attempt...")
                    time.sleep(config.RECONNECT_DELAY)
                    continue
                
                # Reset counter on successful connection
                connection_attempts = 0
                
                # Read line from Arduino - FIX: Use readline() which blocks until line received or timeout
                if self.serial_connection and self.serial_connection.is_open:
                    try:
                        # readline() will block until a line is received or timeout (1s from config)
                        line_bytes = self.serial_connection.readline()
                        if line_bytes:
                            line = line_bytes.decode('utf-8').strip()
                            if line:
                                # Log EVERY line received
                                print(f"[SERIAL] Raw line received: {line}")
                                # Parse and store - moisture parsing is highest priority
                                self._parse_and_store(line)
                    except UnicodeDecodeError as e:
                        print(f"[SERIAL] ⚠️ Decode error: {e}")
                    except serial.SerialTimeoutException:
                        # Timeout is normal when no data - continue loop
                        pass
                    except Exception as e:
                        print(f"[SERIAL] ⚠️ Error reading line: {e}")
                else:
                    # Not connected - check heartbeat timeout and try to reconnect
                    self._check_heartbeat_timeout()
                    time.sleep(0.1)  # Small delay when no data
                    
            except serial.SerialException as e:
                print(f"[SERIAL] ❌ Serial error: {e}")
                self._disconnect()
                time.sleep(config.RECONNECT_DELAY)
            except Exception as e:
                print(f"[SERIAL] ❌ Unexpected error: {e}")
                self._disconnect()
                time.sleep(1)
    
    def _check_heartbeat_timeout(self) -> None:
        """
        Check if heartbeat is missing (Arduino failure detection).
        
        If heartbeat missing > 6 seconds:
        - Arduino may have crashed/frozen
        - Log warning
        - State will handle gracefully (no crash)
        """
        with self._lock:
            if self._last_heartbeat_time is None:
                return  # No heartbeat received yet
            
            time_since_heartbeat = time.time() - self._last_heartbeat_time
            
            if time_since_heartbeat > self._heartbeat_timeout:
                # Heartbeat lost - Arduino may have failed
                print(f"[SERIAL] ⚠️ Heartbeat lost for {time_since_heartbeat:.1f}s - Arduino may have failed")
                print(f"[SERIAL] ⚠️ Will continue trying to reconnect...")
                # Don't crash - just log and continue trying to reconnect
    
    def _connect(self) -> bool:
        """Connect to Arduino serial port (auto-retry on failure)."""
        try:
            if self.serial_connection and self.serial_connection.is_open:
                return True
            
            print(f"[SERIAL] 🔌 Attempting to connect to {config.SERIAL_PORT} at {config.BAUD_RATE} baud...")
            self.serial_connection = serial.Serial(
                port=config.SERIAL_PORT,
                baudrate=config.BAUD_RATE,
                timeout=config.SERIAL_TIMEOUT
            )
            time.sleep(2)  # Wait for Arduino reset
            
            if self.serial_connection.is_open:
                print(f"[SERIAL] ✅ Connected to Arduino on {config.SERIAL_PORT}")
                # Reset heartbeat timer on successful connection
                with self._lock:
                    self._last_heartbeat_time = time.time()
                return True
            print(f"[SERIAL] ⚠️ Port opened but connection not established")
            return False
            
        except serial.SerialException as e:
            # Log connection attempts more frequently for debugging
            if not hasattr(self, '_last_error') or self._last_error != str(e):
                print(f"[SERIAL] ⚠️ Cannot connect to {config.SERIAL_PORT}: {e}")
                print(f"[SERIAL] 💡 Make sure Arduino is connected and port is correct")
                self._last_error = str(e)
            return False
        except Exception as e:
            print(f"[SERIAL] ❌ Connection error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _disconnect(self) -> None:
        """Disconnect from Arduino."""
        if self.serial_connection and self.serial_connection.is_open:
            try:
                self.serial_connection.close()
            except:
                pass
            self.serial_connection = None
    
    def _parse_and_store(self, line: str) -> None:
        """
        Parse Arduino output line and extract moisture value.
        
        MOISTURE PARSING (HIGHEST PRIORITY - MULTIPLE STRATEGIES):
        1. JSON with "moisture" key (case-insensitive)
        2. Line contains word "moisture" and a number
        3. Line contains percentage like "49%"
        4. Line contains standalone number between 0-100
        
        STATE INTEGRITY:
        - Moisture update is COMPLETELY INDEPENDENT
        - Does NOT depend on temperature, pH, yield, or any other sensor
        - Missing sensors do NOT reset moisture
        - Once moisture is set, it persists until replaced
        
        NEVER crashes the thread.
        
        Args:
            line: Line from Arduino serial output
        """
        try:
            line_stripped = line.strip()
            moisture_found = False
            moisture_value = None
            
            # ===== STRATEGY 1: JSON with "moisture" key (case-insensitive) =====
            if line_stripped.startswith("{"):
                try:
                    data = json.loads(line_stripped)
                    data_lower = {k.lower(): v for k, v in data.items()}
                    
                    # Extract moisture from JSON (IGNORE yield keys completely)
                    if "moisture" in data_lower and data_lower["moisture"] is not None:
                        try:
                            moisture_value = float(data_lower["moisture"])
                            if 0 <= moisture_value <= 100:
                                moisture_found = True
                        except (ValueError, TypeError):
                            pass
                    
                    # Also extract temperature and pH if present (independent of moisture)
                    if "temperature" in data_lower and data_lower["temperature"] is not None:
                        try:
                            temp_value = float(data_lower["temperature"])
                            if -40 <= temp_value <= 60:
                                self.state.update_temperature(temp_value, source="arduino")
                                print(f"[STATE] Temperature updated: {temp_value}°C")
                        except (ValueError, TypeError):
                            pass
                    
                    if "ph" in data_lower and data_lower["ph"] is not None:
                        try:
                            ph_value = float(data_lower["ph"])
                            if 0 <= ph_value <= 14:
                                self.state.update_ph(ph_value, source="arduino")
                                print(f"[STATE] pH updated: {ph_value}")
                        except (ValueError, TypeError):
                            pass
                    
                    # Update heartbeat on successful JSON parse
                    with self._lock:
                        self._last_heartbeat_time = time.time()
                    
                    # If moisture found in JSON, update and return
                    if moisture_found:
                        self.state.update_moisture(moisture_value, source="arduino")
                        print(f"[STATE] Moisture updated: {moisture_value}%")
                        return
                    
                except json.JSONDecodeError:
                    # Not valid JSON - continue to other strategies
                    pass
                except Exception:
                    # Any JSON error - continue to other strategies
                    pass
            
            # ===== STRATEGY 2: Line contains word "moisture" and a number =====
            if not moisture_found:
                # Case-insensitive search for "moisture" keyword
                if re.search(r'\bmoisture\b', line, re.IGNORECASE):
                    # Try to find a number near "moisture"
                    # Patterns: "moisture: 49", "moisture=49", "moisture 49", etc.
                    patterns = [
                        r'moisture\s*[:=]\s*(\d+(?:\.\d+)?)',  # moisture: 49 or moisture=49
                        r'moisture\s+(\d+(?:\.\d+)?)',          # moisture 49
                        r'(\d+(?:\.\d+)?)\s*%',                  # 49% anywhere in line
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, line, re.IGNORECASE)
                        if match:
                            try:
                                moisture_value = float(match.group(1))
                                if 0 <= moisture_value <= 100:
                                    moisture_found = True
                                    break
                            except (ValueError, IndexError):
                                continue
            
            # ===== STRATEGY 3: Line contains percentage like "49%" =====
            if not moisture_found:
                match = re.search(r'(\d+(?:\.\d+)?)\s*%', line)
                if match:
                    try:
                        moisture_value = float(match.group(1))
                        if 0 <= moisture_value <= 100:
                            moisture_found = True
                    except (ValueError, IndexError):
                        pass
            
            # ===== STRATEGY 4: Standalone number between 0-100 =====
            if not moisture_found:
                # Match standalone numbers (not part of other text)
                # Exclude numbers that are clearly part of other data (like timestamps)
                match = re.search(r'\b(\d{1,2}(?:\.\d+)?)\b', line)
                if match:
                    try:
                        moisture_value = float(match.group(1))
                        # Only accept if it's a reasonable moisture value (0-100)
                        if 0 <= moisture_value <= 100:
                            # Additional check: if line is mostly just this number, it's likely moisture
                            # Avoid matching timestamps or other large numbers
                            if len(line_stripped) < 20 or moisture_value < 100:
                                moisture_found = True
                    except (ValueError, IndexError):
                        pass
            
            # ===== UPDATE STATE IF MOISTURE FOUND =====
            if moisture_found and moisture_value is not None:
                self.state.update_moisture(moisture_value, source="arduino")
                print(f"[STATE] Moisture updated: {moisture_value}%")
                # Update heartbeat on successful moisture parse
                with self._lock:
                    self._last_heartbeat_time = time.time()
                return
            
            # ===== NO MOISTURE FOUND - Line processed but no moisture extracted =====
            # This is OK - not every line needs to contain moisture
            # We've logged the raw line already, so visibility is maintained
            
        except Exception as e:
            # CRITICAL: Parsing errors must NEVER crash the thread
            # Log error but continue processing
            print(f"[SERIAL] ⚠️ Parse error (non-fatal): {e}")
            # Continue - don't return, allow other parsing to continue if possible
    
    def is_connected(self) -> bool:
        """
        Check if connected to Arduino.
        
        Returns:
            True if connected
        """
        return self.serial_connection is not None and self.serial_connection.is_open
    
    def is_heartbeat_alive(self) -> bool:
        """
        Check if heartbeat is alive (Arduino is responding).
        
        Returns:
            True if heartbeat received within timeout period
        """
        with self._lock:
            if self._last_heartbeat_time is None:
                return False
            
            time_since_heartbeat = time.time() - self._last_heartbeat_time
            return time_since_heartbeat < self._heartbeat_timeout
    
    def get_restart_count(self) -> int:
        """Get number of times thread has restarted."""
        return self._restart_count
