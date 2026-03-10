"""
Disease Detection Service - ESP32 TinyML Serial Communication

Sends plant images to ESP32 over serial for TFLite Micro inference.
Also supports running the accurate model on the backend when online.

Protocol:
  Send: IMG_START\n + 27648 raw bytes + IMG_END\n
  Recv: RESULT:<class>:<confidence>:<time>ms\n

Offline: ESP32 TinyML binary classification (healthy/diseased)
Online:  Accurate model (multi-class, uploaded separately) + Groq LLM
"""

import os
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

import io
import time
import threading
from typing import Optional, Dict, Any

try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False

try:
    import tf_keras
    HAS_TF_KERAS = True
except ImportError:
    HAS_TF_KERAS = False

try:
    import serial
    HAS_SERIAL = True
except ImportError:
    HAS_SERIAL = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from . import config

# Image dimensions expected by TinyML model
IMG_SIZE = 96
IMG_CHANNELS = 3
IMG_BYTES = IMG_SIZE * IMG_SIZE * IMG_CHANNELS  # 27648

# Hardcoded class names (extracted from test files as fallback)
# If class_names_accurate.txt doesn't exist, use these
FALLBACK_CLASS_NAMES = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___healthy',
    'Cherry_(including_sour)___Powdery_mildew', 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_', 'Corn_(maize)___healthy', 'Corn_(maize)___Northern_Leaf_Blight',
    'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___healthy',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot', 'Peach___healthy', 'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy', 'Potato___Early_blight', 'Potato___healthy',
    'Potato___Late_blight', 'Raspberry___healthy', 'Soybean___healthy',
    'Squash___Powdery_mildew', 'Strawberry___healthy', 'Strawberry___Leaf_scorch',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___healthy',
    'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_mosaic_virus', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
]


class DiseaseService:
    """Manages serial communication with TinyML ESP32 for disease detection."""
    
    def __init__(self):
        self._serial: Optional[serial.Serial] = None
        self._lock = threading.Lock()
        self._connected = False
        self._accurate_model = None
        self._accurate_model_loaded = False
        self._class_names = []
        self._tinyml_model = None
        self._tinyml_model_loaded = False
        
        # Try loading models at startup
        self._try_load_accurate_model()
        self._try_load_tinyml_model()
    
    def connect(self) -> bool:
        """Connect to TinyML ESP32 over serial."""
        if not HAS_SERIAL:
            print("[DISEASE] pyserial not installed - ESP32 TinyML unavailable")
            return False
        
        try:
            self._serial = serial.Serial(
                port=config.TINYML_SERIAL_PORT,
                baudrate=config.TINYML_BAUD_RATE,
                timeout=2.0
            )
            time.sleep(2)  # Wait for ESP32 to boot
            
            # Read any startup messages
            while self._serial.in_waiting:
                line = self._serial.readline().decode('utf-8', errors='ignore').strip()
                print(f"[DISEASE] ESP32: {line}")
                if "READY" in line:
                    self._connected = True
            
            if not self._connected:
                # Send a test - wait for READY
                time.sleep(1)
                while self._serial.in_waiting:
                    line = self._serial.readline().decode('utf-8', errors='ignore').strip()
                    print(f"[DISEASE] ESP32: {line}")
                    if "READY" in line:
                        self._connected = True
            
            self._connected = True  # Assume connected if no error
            print(f"[DISEASE] Connected to ESP32 TinyML on {config.TINYML_SERIAL_PORT}")
            return True
            
        except Exception as e:
            print(f"[DISEASE] Cannot connect to ESP32 TinyML on {config.TINYML_SERIAL_PORT}: {e}")
            self._connected = False
            return False
    
    def is_connected(self) -> bool:
        """Check if ESP32 TinyML is connected."""
        return self._connected and self._serial is not None and self._serial.is_open
    
    def _try_load_accurate_model(self):
        """Try to load the accurate multi-class model (uploaded later by user)."""
        model_path = config.ACCURATE_MODEL_PATH
        
        if not os.path.exists(model_path):
            print(f"[DISEASE] Accurate model not found at {model_path}")
            print(f"[DISEASE] Online mode will use ESP32 result + Groq LLM only")
            print(f"[DISEASE] To enable: place your model at {model_path}")
            return
        
        try:
            # Try loading as TFLite model
            if model_path.endswith('.tflite'):
                import tensorflow as tf
                self._accurate_model = tf.lite.Interpreter(model_path=model_path)
                self._accurate_model.allocate_tensors()
                self._accurate_model_loaded = True
                print(f"[DISEASE] Accurate TFLite model loaded from {model_path}")
            
            # Try loading as Keras model (.h5 / .keras)
            elif model_path.endswith('.h5') or model_path.endswith('.keras'):
                # Use tf_keras (Keras 2 compat) for models trained with Keras 2.x
                # Keras 3 (tf.keras) corrupts DepthwiseConv2D weight layouts
                if HAS_TF_KERAS:
                    self._accurate_model = tf_keras.models.load_model(
                        model_path, compile=False
                    )
                    self._model_backend = "tf_keras"
                else:
                    class CustomDepthwiseConv2D(tf.keras.layers.DepthwiseConv2D):
                        def __init__(self, **kwargs):
                            kwargs.pop('groups', None)
                            super().__init__(**kwargs)
                    self._accurate_model = tf.keras.models.load_model(
                        model_path,
                        custom_objects={'DepthwiseConv2D': CustomDepthwiseConv2D},
                        compile=False
                    )
                    self._model_backend = "tf_keras_v3"
                self._accurate_model_loaded = True
                print(f"[DISEASE] Accurate Keras model loaded from {model_path} (backend: {self._model_backend})")
            
            # Load class names (required for accurate model)
            class_names_path = os.path.join(os.path.dirname(model_path), "class_names_accurate.txt")
            if os.path.exists(class_names_path):
                with open(class_names_path, 'r') as f:
                    self._class_names = [line.strip() for line in f.readlines() if line.strip()]
                print(f"[DISEASE] Loaded {len(self._class_names)} class names from {class_names_path}")
            else:
                # Use fallback hardcoded class names (extracted from test files)
                self._class_names = FALLBACK_CLASS_NAMES
                print(f"[DISEASE] class_names_accurate.txt not found - using {len(self._class_names)} hardcoded class names")
                print(f"[DISEASE] To use custom class names, create: {class_names_path}")
            
        except Exception as e:
            print(f"[DISEASE] Failed to load accurate model: {e}")
            self._accurate_model_loaded = False
    
    def has_accurate_model(self) -> bool:
        """Check if the accurate model is available."""
        return self._accurate_model_loaded
    
    def _try_load_tinyml_model(self):
        """
        Try to load the TinyML binary classifier (.tflite) for local offline inference.
        
        Plug-and-play: drop your .tflite model at backend/ml/offline/plant_disease_tinyml.tflite
        and restart the server. No code changes needed.
        """
        model_path = config.TINYML_MODEL_PATH
        
        if not os.path.exists(model_path):
            print(f"[DISEASE] TinyML offline model not found at {model_path}")
            print(f"[DISEASE] To enable offline: drop your .tflite binary classifier there")
            return
        
        if not HAS_TENSORFLOW:
            print("[DISEASE] TensorFlow not installed — cannot load TinyML .tflite model")
            return
        
        try:
            self._tinyml_model = tf.lite.Interpreter(model_path=model_path)
            self._tinyml_model.allocate_tensors()
            self._tinyml_model_loaded = True
            
            input_details = self._tinyml_model.get_input_details()
            output_details = self._tinyml_model.get_output_details()
            input_shape = input_details[0]['shape']
            output_shape = output_details[0]['shape']
            
            print(f"[DISEASE] TinyML offline model loaded from {model_path}")
            print(f"[DISEASE]   Input: {input_shape}, Output: {output_shape}")
            print(f"[DISEASE]   Labels: {config.TINYML_CLASS_NAMES}")
        except Exception as e:
            print(f"[DISEASE] Failed to load TinyML model: {e}")
            self._tinyml_model_loaded = False
    
    def has_tinyml_model(self) -> bool:
        """Check if the local TinyML binary classifier is available."""
        return self._tinyml_model_loaded
    
    def run_tinyml_inference(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Run the local TinyML binary classifier (healthy/diseased).
        
        Used when ESP32 is not connected but the .tflite model is available locally.
        Same binary output as ESP32 serial inference.
        
        Args:
            image_bytes: Raw image file bytes (JPEG/PNG)
        
        Returns:
            dict with: status (healthy/diseased), confidence, method
        """
        if not self._tinyml_model_loaded:
            return {
                "status": "error",
                "message": f"TinyML model not loaded. Place .tflite at: {config.TINYML_MODEL_PATH}",
                "method": "tinyml_local"
            }
        
        try:
            import numpy as np
            
            if not HAS_PIL:
                return {"status": "error", "message": "Pillow not installed", "method": "tinyml_local"}
            
            input_details = self._tinyml_model.get_input_details()
            output_details = self._tinyml_model.get_output_details()
            input_shape = input_details[0]['shape']
            input_dtype = input_details[0]['dtype']
            h, w = input_shape[1], input_shape[2]
            
            # Preprocess image to model's expected input
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            img = img.resize((w, h), Image.LANCZOS)
            img_array = np.array(img, dtype=np.float32)
            
            # Normalize based on model's expected dtype
            if input_dtype == np.uint8:
                img_array = img_array.astype(np.uint8)
            elif input_dtype == np.int8:
                img_array = (img_array - 128).astype(np.int8)
            else:
                # Float model — normalize to [0,1] (standard for TFLite binary classifiers)
                img_array = img_array / 255.0
            
            img_array = np.expand_dims(img_array, axis=0)
            
            start_time = time.time()
            self._tinyml_model.set_tensor(input_details[0]['index'], img_array)
            self._tinyml_model.invoke()
            inference_ms = int((time.time() - start_time) * 1000)
            
            output = self._tinyml_model.get_tensor(output_details[0]['index'])[0]
            
            # Interpret output
            labels = config.TINYML_CLASS_NAMES
            if len(output) >= 2:
                # Multi-output: [healthy_prob, diseased_prob]
                top_idx = int(np.argmax(output))
                confidence = float(output[top_idx])
                status = labels[top_idx] if top_idx < len(labels) else "unknown"
            else:
                # Single output: sigmoid (>0.5 = diseased)
                prob = float(output[0])
                status = "diseased" if prob > 0.5 else "healthy"
                confidence = prob if prob > 0.5 else (1.0 - prob)
            
            return {
                "status": status,
                "confidence": round(confidence * 100, 1),
                "inference_time_ms": inference_ms,
                "method": "tinyml_local"
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e), "method": "tinyml_local"}
    
    def preprocess_image(self, image_bytes: bytes) -> bytes:
        """
        Preprocess uploaded image to 96x96 RGB uint8.
        
        Args:
            image_bytes: Raw image file bytes (JPEG, PNG, etc.)
        
        Returns:
            27648 bytes of raw RGB pixel data
        """
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed - run: pip install Pillow")
        
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB')
        img = img.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
        
        # Convert to raw bytes (uint8 RGB)
        return img.tobytes()
    
    def run_esp32_inference(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Send image to ESP32 for TinyML inference.
        
        Args:
            image_bytes: Raw image file bytes (JPEG/PNG from phone)
        
        Returns:
            dict with: status, confidence, inference_time_ms, method
        """
        if not self.is_connected():
            return {
                "status": "error",
                "message": "ESP32 TinyML not connected",
                "method": "esp32_tinyml"
            }
        
        with self._lock:
            try:
                # Preprocess image
                raw_pixels = self.preprocess_image(image_bytes)
                
                if len(raw_pixels) != IMG_BYTES:
                    return {
                        "status": "error",
                        "message": f"Image preprocessing failed: expected {IMG_BYTES} bytes, got {len(raw_pixels)}"
                    }
                
                # Clear any pending serial data
                self._serial.reset_input_buffer()
                
                # Send start marker
                self._serial.write(b"IMG_START\n")
                self._serial.flush()
                
                # Wait for ACK
                ack = self._serial.readline().decode('utf-8', errors='ignore').strip()
                if "ACK" not in ack:
                    return {"status": "error", "message": f"No ACK from ESP32: {ack}"}
                
                # Send raw pixel data in chunks
                chunk_size = 1024
                for i in range(0, len(raw_pixels), chunk_size):
                    chunk = raw_pixels[i:i + chunk_size]
                    self._serial.write(chunk)
                    time.sleep(0.01)  # Small delay between chunks
                
                # Send end marker
                self._serial.write(b"IMG_END\n")
                self._serial.flush()
                
                # Wait for ACK
                ack = self._serial.readline().decode('utf-8', errors='ignore').strip()
                
                # Wait for RESULT with timeout
                start_time = time.time()
                while time.time() - start_time < config.TINYML_TIMEOUT:
                    if self._serial.in_waiting:
                        line = self._serial.readline().decode('utf-8', errors='ignore').strip()
                        
                        if line.startswith("RESULT:"):
                            parts = line.split(":")
                            if len(parts) >= 3:
                                status = parts[1]       # "healthy" or "diseased"
                                confidence = float(parts[2])
                                inference_ms = parts[3].replace("ms", "") if len(parts) > 3 else "0"
                                
                                return {
                                    "status": status,
                                    "confidence": round(confidence * 100, 1),
                                    "inference_time_ms": int(inference_ms),
                                    "method": "esp32_tinyml"
                                }
                        
                        elif line.startswith("ERROR:"):
                            return {
                                "status": "error",
                                "message": line,
                                "method": "esp32_tinyml"
                            }
                    
                    time.sleep(0.1)
                
                return {"status": "error", "message": "ESP32 inference timeout", "method": "esp32_tinyml"}
                
            except Exception as e:
                return {"status": "error", "message": str(e), "method": "esp32_tinyml"}
    
    def run_accurate_inference(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Run the accurate multi-class model on the backend.
        
        This model is uploaded separately by the user.
        Returns the specific disease name (e.g., "Tomato Late Blight").
        
        Args:
            image_bytes: Raw image file bytes
        
        Returns:
            dict with: disease_name, confidence, method
        """
        if not self._accurate_model_loaded:
            return {
                "status": "unavailable",
                "message": f"Accurate model not found. Place it at: {config.ACCURATE_MODEL_PATH}",
                "method": "accurate_model"
            }
        
        try:
            import numpy as np
            
            # Preprocess
            if not HAS_PIL:
                return {"status": "error", "message": "Pillow not installed"}
            
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            
            # Get model input shape
            if hasattr(self._accurate_model, 'get_input_details'):
                # TFLite model
                input_details = self._accurate_model.get_input_details()
                output_details = self._accurate_model.get_output_details()
                input_shape = input_details[0]['shape']  # e.g., [1, 224, 224, 3]
                h, w = input_shape[1], input_shape[2]
                
                img = img.resize((w, h), Image.LANCZOS)
                # Pass raw [0, 255] — model handles normalization internally
                img_array = np.array(img, dtype=np.float32)
                img_array = np.expand_dims(img_array, axis=0)
                
                self._accurate_model.set_tensor(input_details[0]['index'], img_array)
                self._accurate_model.invoke()
                predictions = self._accurate_model.get_tensor(output_details[0]['index'])[0]
            else:
                # Keras model
                input_shape = self._accurate_model.input_shape
                h, w = input_shape[1], input_shape[2]
                
                img = img.resize((w, h), Image.LANCZOS)
                # EfficientNetB0 has built-in Rescaling layer — pass raw [0, 255]
                # DO NOT divide by 255 — that causes double-normalization and
                # collapses all predictions to a single class
                img_array = np.array(img, dtype=np.float32)
                img_array = np.expand_dims(img_array, axis=0)
                
                predictions = self._accurate_model.predict(img_array, verbose=0)[0]
            
            # Get top prediction
            top_idx = int(np.argmax(predictions))
            top_confidence = float(predictions[top_idx])
            
            # Get disease name
            if self._class_names and top_idx < len(self._class_names):
                raw_name = self._class_names[top_idx]
            else:
                raw_name = f"class_{top_idx}"
            
            # Parse Plant___Disease format
            if '___' in raw_name:
                plant_type, disease = raw_name.split('___', 1)
                disease_name = f"{plant_type} - {disease.replace('_', ' ')}"
            else:
                disease_name = raw_name
            
            # Top 5 predictions sorted by confidence
            top_5_idx = np.argsort(predictions)[-5:][::-1]
            top_5 = {}
            for idx in top_5_idx:
                name = self._class_names[idx] if idx < len(self._class_names) else f"class_{idx}"
                top_5[name] = round(float(predictions[idx]) * 100, 1)
            
            # Determine if healthy
            is_healthy = "healthy" in raw_name.lower()
            
            return {
                "disease_name": disease_name,
                "raw_class": raw_name,
                "is_healthy": is_healthy,
                "confidence": round(top_confidence * 100, 1),
                "all_predictions": top_5,
                "method": "accurate_model"
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e), "method": "accurate_model"}
    
    def disconnect(self):
        """Disconnect from ESP32."""
        if self._serial and self._serial.is_open:
            self._serial.close()
        self._connected = False
        print("[DISEASE] Disconnected from ESP32 TinyML")
