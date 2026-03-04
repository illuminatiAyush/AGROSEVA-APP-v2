"""
Configuration for AgroSeva Irrigation Brain

All system parameters in one place.
Modify these values to adjust system behavior.
"""

# Serial Communication (Arduino)
SERIAL_PORT = "COM6"      # Change to your Arduino port (Windows: COM6, Linux: /dev/ttyUSB0)
BAUD_RATE = 9600          # Standard baud rate for Arduino

# Moisture Thresholds (for agent decision)
MOISTURE_THRESHOLD_LOW = 25.0   # Below this → irrigate 30 seconds
MOISTURE_THRESHOLD_HIGH = 35.0  # Below this → irrigate 15 seconds, above → do nothing

# Irrigation Durations (seconds)
IRRIGATION_DURATION_LONG = 30   # When moisture < 25%
IRRIGATION_DURATION_SHORT = 15  # When moisture 25-35%

# Safety Limits
MAX_ON_TIME = 30         # Maximum relay ON time (hard cap, seconds)
COOLDOWN = 10            # Minimum seconds between irrigations
EMERGENCY_STOP = False   # Set to True to block all irrigation

# Serial Reading
SERIAL_TIMEOUT = 1.0     # Serial read timeout (seconds)
RECONNECT_DELAY = 5.0    # Seconds to wait before reconnecting

# Decision Loop
DECISION_INTERVAL = 2.0  # Check for new sensor data every N seconds

# Logging
LOG_LEVEL = "INFO"       # DEBUG, INFO, WARNING, ERROR

# Demo/Testing
ENABLE_INJECT_SENSOR = True  # Allow POST /inject-sensor for demo/testing

