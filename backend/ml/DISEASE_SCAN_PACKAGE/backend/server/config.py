"""
Configuration for AgroSeva Irrigation Brain

All system parameters in one place.
Modify these values to adjust system behavior.
"""

# Serial Communication (Arduino)
# Can be overridden by environment variable COM_PORT
import os

# Load .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass  # python-dotenv not installed, use system env vars

SERIAL_PORT = os.getenv("COM_PORT", "COM6")  # Change to your Arduino port (Windows: COM6, Linux: /dev/ttyUSB0)
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
RECONNECT_DELAY = 3.0    # Seconds to wait before reconnecting (reduced for faster recovery)

# Heartbeat Detection (Fail-Safe)
HEARTBEAT_TIMEOUT = 6.0  # Seconds without heartbeat = Arduino failure detection
STALE_DATA_TIMEOUT = 10.0  # Seconds - data older than this is considered stale

# Decision Loop
DECISION_INTERVAL = 2.0  # Check for new sensor data every N seconds

# Logging
LOG_LEVEL = "INFO"       # DEBUG, INFO, WARNING, ERROR

# Feature Flags
ENABLE_YIELD = False     # Yield prediction system (disabled by default - must not interfere with sensors)
ENABLE_DISEASE = True    # Disease detection via ESP32 TinyML + Groq LLM

# TinyML ESP32 (separate board for plant disease detection)
TINYML_SERIAL_PORT = os.getenv("TINYML_COM_PORT", "COM7")  # Second ESP32 port
TINYML_BAUD_RATE = 115200  # High baud for image transfer (~27KB per image)
TINYML_TIMEOUT = 10.0      # Seconds to wait for ESP32 inference result

# TinyML offline model (plug-and-play: drop your .tflite here and restart)
# Binary classifier: healthy vs diseased — runs locally without internet
TINYML_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "offline", "plant_disease_tinyml.tflite")
TINYML_CLASS_NAMES = ["healthy", "diseased"]  # Binary classification labels

# Groq LLM (online disease diagnosis)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Accurate disease model (online - uploaded separately)
# Place your multi-class model at this path. Supported: .h5, .tflite, .keras
ACCURATE_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "online", "plant_disease_model.h5")

