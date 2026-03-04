"""
Serial Reader

Reads sensor data from Arduino via serial communication.
Runs in background thread and updates sensor store.
"""

import serial
import threading
import time
from typing import Optional
import config
from sensor_store import SensorStore


class SerialReader:
    """
    Reads sensor data from Arduino via serial port.
    
    Expected Arduino output format:
    - "MOISTURE:42.5"
    - "PH:6.5"
    - "TEMP:25.0"
    
    Runs in background thread and never blocks the server.
    """
    
    def __init__(self, sensor_store: SensorStore):
        """
        Initialize serial reader.
        
        Args:
            sensor_store: SensorStore instance to update with readings
        """
        self.sensor_store = sensor_store
        self.serial_connection: serial.Serial = None
        self.running = False
        self.thread: Optional[threading.Thread] = None
    
    def start(self) -> None:
        """Start serial reading thread."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        print(f"[SERIAL] Started serial reader thread")
    
    def stop(self) -> None:
        """Stop serial reading thread."""
        self.running = False
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
        print(f"[SERIAL] Stopped serial reader thread")
    
    def _read_loop(self) -> None:
        """Main reading loop (runs in background thread)."""
        while self.running:
            try:
                # Try to connect
                if not self._connect():
                    time.sleep(config.RECONNECT_DELAY)
                    continue
                
                # Read line from Arduino
                if self.serial_connection.in_waiting > 0:
                    line = self.serial_connection.readline().decode('utf-8').strip()
                    if line:
                        self._parse_and_store(line)
                else:
                    time.sleep(0.1)  # Small delay when no data
                    
            except serial.SerialException as e:
                print(f"[SERIAL] ❌ Serial error: {e}")
                self._disconnect()
                time.sleep(config.RECONNECT_DELAY)
            except Exception as e:
                print(f"[SERIAL] ❌ Unexpected error: {e}")
                time.sleep(1)
    
    def _connect(self) -> bool:
        """Connect to Arduino serial port."""
        try:
            if self.serial_connection and self.serial_connection.is_open:
                return True
            
            self.serial_connection = serial.Serial(
                port=config.SERIAL_PORT,
                baudrate=config.BAUD_RATE,
                timeout=config.SERIAL_TIMEOUT
            )
            time.sleep(2)  # Wait for Arduino reset
            
            if self.serial_connection.is_open:
                print(f"[SERIAL] ✅ Connected to Arduino on {config.SERIAL_PORT}")
                return True
            return False
            
        except serial.SerialException as e:
            # Don't spam errors - only log on first failure
            if not hasattr(self, '_last_error') or self._last_error != str(e):
                print(f"[SERIAL] ⚠️ Waiting for Arduino on {config.SERIAL_PORT}...")
                self._last_error = str(e)
            return False
        except Exception as e:
            print(f"[SERIAL] ❌ Connection error: {e}")
            return False
    
    def _disconnect(self) -> None:
        """Disconnect from Arduino."""
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            self.serial_connection = None
    
    def _parse_and_store(self, line: str) -> None:
        """
        Parse Arduino output line and store sensor value.
        
        Expected formats:
        - "MOISTURE:42.5"
        - "PH:6.5"
        - "TEMP:25.0"
        
        Args:
            line: Line from Arduino serial output
        """
        try:
            # Parse format: "SENSOR_TYPE:value"
            if ':' not in line:
                return
            
            parts = line.split(':', 1)
            sensor_type = parts[0].strip().upper()
            value_str = parts[1].strip()
            
            # Convert to float
            value = float(value_str)
            
            # Store based on sensor type
            if sensor_type == "MOISTURE":
                self.sensor_store.update_moisture(value, source="arduino")
                print(f"[SERIAL] 📊 Moisture: {value}%")
            elif sensor_type == "PH":
                self.sensor_store.update("ph", value, source="arduino")
                print(f"[SERIAL] 📊 pH: {value}")
            elif sensor_type == "TEMP" or sensor_type == "TEMPERATURE":
                self.sensor_store.update("temperature", value, source="arduino")
                print(f"[SERIAL] 📊 Temperature: {value}°C")
            else:
                # Unknown sensor type - store generically
                self.sensor_store.update(sensor_type.lower(), value, source="arduino")
                print(f"[SERIAL] 📊 {sensor_type}: {value}")
                
        except ValueError as e:
            print(f"[SERIAL] ⚠️ Could not parse line '{line}': {e}")
        except Exception as e:
            print(f"[SERIAL] ⚠️ Error parsing sensor data: {e}")
    
    def is_connected(self) -> bool:
        """
        Check if connected to Arduino.
        
        Returns:
            True if connected
        """
        return self.serial_connection is not None and self.serial_connection.is_open

