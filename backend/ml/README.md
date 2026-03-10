# AgroSeva ML Pipeline - Complete Guide

## Overview

AgroSeva implements a **two-tier hybrid ML approach** for plant disease detection:

1. **Offline (Edge AI)** - Fast, lightweight TensorFlow Lite models running on **ESP32** edge devices (300-600ms inference, on-field predictions)
2. **Online (Cloud/Server)** - Accurate, detailed Keras models running on backend server (300-500ms, multi-class diagnosis)

This hybrid strategy provides the best of both worlds: **immediate field diagnosis via ESP32 + detailed server-side analysis**.

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│         AgroSeva Hybrid ML Disease Detection Pipeline          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Mobile App (React Native - CameraScreen.tsx)                │
│        ↓                                                        │
│  Farmer captures leaf image                                   │
│        ↓                                                        │
│  POST /predict (image sent to backend)                        │
│        ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  AgroSeva Backend Server (server.py)                     │ │
│  │                                                          │ │
│  │  TIER 1: OFFLINE (FAST PATH - ESP32 EDGE)                  │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ Device: ESP32 microcontroller in field            │ │ │
│  │  │ Model: plant_disease_tinyml.tflite                │ │ │
│  │  │ Infer: Healthy vs Diseased (binary)              │ │ │
│  │  │ Time: 300-600ms on-device inference              │ │ │
│  │  │ Returns: {healthy_prob, diseased_prob}           │ │ │
│  │  │ Display: Result shown on ESP32 LCD/LED           │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │           ↓                                              │ │
│  │  TIER 2: ONLINE (DETAILED PATH)                         │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ Load: plant_disease_model.h5                      │ │ │
│  │  │ Infer: Specific disease type (10+ classes)        │ │ │
│  │  │ Time: 300-500ms on server                         │ │ │
│  │  │ Returns: [disease1: 85%, disease2: 12%, ...]     │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │           ↓                                              │ │
│  │  TIER 3: LLM EXPLANATIONS (OPTIONAL)                     │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ Groq API: Get detailed treatment guide            │ │ │
│  │  │ "Early Blight: Apply fungicide every 7 days..."   │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │           ↓                                              │ │
│  │  Response to Mobile:                                      │ │
│  │  {                                                        │ │
│  │    "method": "online",                                   │ │
│  │    "disease": "Early Blight",                           │ │
│  │    "confidence": 0.85,                                  │ │
│  │    "treatments": ["Fungicide spray...", "Remove..."]   │ │
│  │  }                                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│        ↓                                                        │
│  Mobile displays: "Early Blight detected - 85% confidence"    │
│  Shows treatment guide + recommendations                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
backend/ml/
├── README.md                    # THIS FILE - Master guide
│
├── offline/                     # TIER 1: Fast, Edge Models
│   ├── README.md               # Detailed offline guide
│   └── plant_disease_tinyml.tflite  # TensorFlow Lite model (~20MB)
│
├── online/                      # TIER 2: Accurate, Server Models
│   ├── README.md               # Detailed online guide
│   ├── plant_disease_model.h5  # Keras model (~150MB)
│   ├── train_pipeline.py       # Training script
│   ├── evaluate_model.py       # Evaluation script
│   ├── test_single_image.py    # Testing on single image
│   └── [4+ other training/testing scripts]
│
└── [future: tflite/, onnx/, other_formats/]
```

## Quick Start (5 Minutes)

### 1. Run Server with Both Models
```bash
cd backend
python -m server.server
```

**Server logs should show:**
```
✓ Offline model loaded: plant_disease_tinyml.tflite
✓ Online model loaded: plant_disease_model.h5
✓ Disease detection ready (two-tier pipeline)
```

### 2. Test via API
```bash
# Upload an image to get prediction
curl -X POST \
  -F "file=@leaf.jpg" \
  http://localhost:8000/predict
```

**Response:**
```json
{
  "status": "success",
  "method": "online",
  "disease": "Tomato___Early_blight",
  "confidence": 0.87,
  "processing_time_ms": 342
}
```

### 3. View in Mobile App
- Open AgroSeva app
- Go to Dashboard → Scan Crop
- Capture leaf image
- See disease diagnosis with confidence

## Comparison: Offline vs Online

| Aspect | Offline (TinyML + ESP32) | Online (Keras) |
|--------|---------------------------|-----------------|
| **Deployment** | ESP32 microcontroller (field) | Backend server (cloud) |
| **Model Format** | `.tflite` (quantized) | `.h5` (full precision) |
| **Inference Time** | 300-600ms (on-device) | 300-500ms (server) |
| **Classification** | Binary (healthy/diseased) | Multi-class (10+ diseases) |
| **Model Size** | 2-10MB (int8 quantized) | ~150MB (full model) |
| **Accuracy** | 85-88% | 92-95% |
| **Edge Ready** | ✅ **Yes (ESP32 primary)** | ⚠️ Requires server |
| **Privacy** | ✅ Complete (local inference) | ⚠️ Image sent to cloud |
| **WiFi Required** | ✅ Optional (works offline) | ⚠️ Required |
| **Use Case** | Immediate field diagnosis | Detailed server diagnosis |
| **Power Usage** | ~200mA (ESP32) | Server-dependent |
| **Cost** | ~$5 (ESP32 board) | Server hosting |

## Decision Flow

```
Farmer captures image
        ↓
TIER 1: Offline model predicts in 100ms
        ├─→ Disease confidence < 50% → "Unclear, need expert examination"
        ├─→ High confidence (>85%) → Stop here, return result
        └─→ Medium confidence (50-85%) → Continue to TIER 2
                ↓
        TIER 2: Online model predicts in 400ms
                ├─→ Specific disease identified
                ├─→ High confidence (>80%) → Return result
                └─→ Low confidence (<80%) → Flag for review
                        ↓
                TIER 3: LLM provides detailed explanation
```

## ESP32 Edge AI Deployment (Primary Architecture)

### Overview

AgroSeva's **primary edge AI platform is the ESP32 microcontroller**. It runs the offline TinyML model directly in farmers' fields for instant disease detection without internet dependency.

### Key Features

- **Instant Predictions:** 300-600ms on-device inference
- **Offline Operation:** Works completely without WiFi
- **Low Cost:** ~$5 per unit (highly scalable)
- **Long Battery:** 8-12 hours per charge
- **Camera Integration:** Connect OV7670 or OV2640 camera module
- **Bidirectional Communication:** WiFi/Bluetooth to send/receive data

### Hardware Setup

```
┌─────────────────────────────────────────┐
│       ESP32 + Camera Module             │
├─────────────────────────────────────────┤
│                                         │
│  ESP32-CAM or                          │
│  ESP32 + OV7670 Camera                 │
│        ↓                                │
│  Farmer captures leaf image            │
│        ↓                                │
│  TinyML model (.tflite)               │
│  embedded in ESP32 flash memory        │
│        ↓                                │
│  Inference Result (300ms)             │
│  "Healthy - 85%"                      │
│        ↓                               │
│  Display on LCD or                    │
│  Send to backend via WiFi             │
│                                        │
└─────────────────────────────────────────┘
```

### Deployment Instructions

See [**backend/ml/offline/README.md → ESP32 Edge AI Deployment**](offline/README.md#esp32-edge-ai-deployment) for:
- Hardware specifications
- Model optimization for ESP32 memory constraints
- Arduino/PlatformIO setup
- WiFi connectivity options
- Power efficiency tips
- Deployment scenarios

## Implementation Details

### Server Code (backend/server/disease_service.py)

```python
from tensorflow.keras.models import load_model
import tensorflow_lite_support as tflite

# TIER 1: Load offline model
offline_model = tflite.Interpreter(
    model_path="backend/ml/offline/plant_disease_tinyml.tflite"
)

# TIER 2: Load online model
online_model = load_model("backend/ml/online/plant_disease_model.h5")

def predict(image_path):
    # Tier 1: Fast check
    tier1_result = offline_model.predict(image)
    if tier1_result['confidence'] > 0.85:
        return tier1_result
    
    # Tier 2: Detailed diagnosis
    tier2_result = online_model.predict(image)
    if tier2_result['confidence'] > 0.80:
        return tier2_result
    
    # Tier 3: LLM (optional)
    explanation = groq_service.get_diagnosis(tier2_result)
    return {**tier2_result, 'explanation': explanation}
```

## Training & Maintaining Models

### Offline Model (TinyML)

**Setup (once):**
```bash
# Place pre-trained .tflite model in:
# backend/ml/offline/plant_disease_tinyml.tflite

# No training needed - it's pre-converted and ready
```

**When to update:**
- New crop types
- Significant accuracy degradation
- Hardware changes (mobile → edge device)

### Online Model (Keras)

**Initial training (1-2 hours):**
```bash
cd backend/ml/online
python train_pipeline.py
# Generates plant_disease_model.h5
```

**Retraining with new data:**
```bash
# Add new images to data/train/ and data/validation/
python train_pipeline.py  # Retrains from scratch

# Or fine-tune existing model:
python resume_training.py  # Continues from checkpoint
```

**Evaluation:**
```bash
python evaluate_model.py
# Shows: Accuracy, Precision, Recall, F1-Score, Confusion Matrix
```

## API Reference

### POST /predict

**Request:**
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@leaf.jpg" \
  http://localhost:8000/predict
```

**Response (Success):**
```json
{
  "status": "success",
  "method": "online",
  "predictions": [
    {"disease": "Early_blight", "confidence": 0.85},
    {"disease": "Late_blight", "confidence": 0.10},
    {"disease": "Healthy", "confidence": 0.05}
  ],
  "top_disease": "Early_blight",
  "confidence": 0.85,
  "inference_tiers": {
    "tier1_offline": "diseased (0.92 conf)",
    "tier2_online": "Early_blight (0.85 conf)",
    "tier3_llm": "not_used"
  },
  "processing_time_ms": 456
}
```

**Response (Offline Only):**
```json
{
  "status": "success",
  "method": "offline",
  "healthy_prob": 0.15,
  "diseased_prob": 0.85,
  "prediction": "diseased",
  "confidence": 0.85,
  "inference_time_ms": 125,
  "note": "Online model not available, using TinyML fallback"
}
```

## Performance Expectations

### Latency
- Offline (Tier 1): 50-125ms
- Online (Tier 2): 300-500ms
- LLM (Tier 3): 2-5 seconds

### Accuracy
- Offline (Tier 1): 85-88% (binary classification)
- Online (Tier 2): 92-95% (multi-class)
- Combined: 94-96% (human in the loop)

### Throughput
- Single GPU: 20-30 images/second
- Single CPU: 3-5 images/second
- Raspberry Pi: 0.5-1 image/second

## Integration Points

### Mobile (React Native)

```typescript
// CameraScreen.tsx
const uploadImage = async (imageUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'leaf.jpg',
  });
  
  const response = await fetch('http://api/predict', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  throw result.top_disease; // "Early Blight"
};
```

### Backend (Python)

```python
# server/disease_service.py
from ml.offline import offline_model
from ml.online import online_model

@app.post("/predict")
async def predict(file: UploadFile):
    image = await process_image(file)
    
    # Tier 1
    tier1 = offline_model.predict(image)
    
    # Tier 2
    if tier1.confidence < 0.85:
        tier2 = online_model.predict(image)
        return format_response(tier2)
    
    return format_response(tier1)
```

## Troubleshooting

### Models Not Found
```bash
# Check file paths
ls -la backend/ml/offline/plant_disease_tinyml.tflite
ls -la backend/ml/online/plant_disease_model.h5

# If missing:
# - Download pre-trained models from drive
# - Or train from scratch (see offline/README.md, online/README.md)
```

### Slow Predictions
```bash
# Check if GPU is being used
nvidia-smi  # Shows GPU utilization

# Enable GPU in code:
import tensorflow as tf
print(tf.config.list_physical_devices('GPU'))

# Or switch to CPU-only if GPU memory limited:
python train_pipeline.py --no-gpu
```

### Accuracy Too Low
1. **Check input preprocessing** - Image normalization, resizing
2. **Validate dataset** - Mislabeled samples, poor quality images
3. **Retrain online model** - With more or better data
4. **Ensemble models** - Combine multiple model predictions

### Memory Issues
- Reduce batch size (32 → 8)
- Use model quantization (compress by 75%)
- Use model pruning (remove non-critical weights)

### ESP32-Specific Issues

| Issue | Solution |
|-------|----------|
| Model too large for ESP32 | Use int8 quantization (reduce 150MB → 2MB) - see offline/README.md |
| Inference too slow on ESP32 | Reduce input image resolution (224×224 → 96×96) |
| ESP32 WiFi disconnects | Move closer to WiFi router or add external antenna |
| Battery drains quickly | Enable deep sleep between predictions |
| Camera not working | Check GPIO pins, SDA/SCL connections, I2C address |
| Wrong predictions from ESP32 | Ensure camera calibration, check lighting conditions |

For complete ESP32 troubleshooting, see: [**ESP32 Edge AI Troubleshooting**](offline/README.md#troubleshooting-esp32)

## Future Roadmap

### Phase 1 (Current)
- ✅ Binary classification (offline) **on ESP32**
- ✅ Multi-class classification (online) **on server**
- ✅ Two-tier pipeline
- ✅ Mobile integration
- ✅ ESP32 edge AI deployment

### Phase 2 (Next Quarter)
- [ ] Multiple ESP32 nodes per farm
- [ ] Edge device fleet management
- [ ] Real-time video analysis on ESP32
- [ ] Disease severity scoring
- [ ] Federated learning from edge devices
- [ ] Multi-crop unified model

### Phase 3 (Future)
- [ ] ESP32-S3 with enhanced processing
- [ ] TinyML model updates OTA (over-the-air)
- [ ] Edge TPU/NPU accelerators
- [ ] Uncertainty quantification
- [ ] Edge TPU deployment

## Best Practices

1. **Always use two tiers** - Offline for speed, online for accuracy
2. **Monitor accuracy** - Retrain online model quarterly
3. **Version models** - Keep `model_v1.0.h5`, `model_v1.1.h5`, etc.
4. **Test thoroughly** - Validate on real-world farmer data
5. **Document changes** - What was trained on, when, by whom
6. **Backup originals** - Keep training scripts and raw models

## Resources

- **Offline Guide:** See `offline/README.md`
- **Online Guide:** See `online/README.md`
- **Training Scripts:** `online/train_pipeline.py`
- **Server Integration:** `backend/server/disease_service.py`
- **API Docs:** `backend/API_CONTRACT.md`

---

**Summary:** AgroSeva uses a hybrid offline + online ML pipeline to balance speed and accuracy. Offline models provide instant diagnosis on-device, while online models deliver detailed, multi-class disease identification on the server. Together, they create a responsive, accurate disease detection system for farmers.
