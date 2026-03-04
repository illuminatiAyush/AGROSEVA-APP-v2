# Leaf Health Analysis Engine

Production-ready, explainable Leaf Health Scan Engine for AgroSeva.

## Features

- **Fully Offline**: No cloud APIs, no internet required
- **Deterministic**: Same input always produces same output
- **Explainable**: Rule-based logic with documented thresholds
- **Fast**: Pure inference, no training at runtime

## Architecture

### Modules

1. **image_processing.py**: Image preprocessing and VARI computation
   - Gaussian blur (noise reduction)
   - CLAHE normalization (contrast enhancement)
   - HSV green thresholding (background masking)
   - VARI (Visible Atmospherically Resistant Index) computation

2. **health_scoring.py**: Health score computation (0-100)
   - Normalizes VARI statistics to health score
   - Weighted combination of features
   - Explainable thresholds

3. **diagnosis.py**: Rule-based issue classification
   - Healthy
   - Nitrogen Deficiency
   - Water Stress
   - Chlorosis
   - Severe Stress / Disease

4. **leaf_scan_api.py**: REST API endpoint
   - POST `/scan` - accepts image (base64 or multipart)
   - Returns health analysis JSON

## API Usage

### Endpoint: POST `/scan`

**Request Options:**

1. **Base64 in form field:**
   ```
   POST /scan
   Content-Type: application/x-www-form-urlencoded
   image=data:image/jpeg;base64,/9j/4AAQSkZJRg...
   ```

2. **Multipart file upload:**
   ```
   POST /scan
   Content-Type: multipart/form-data
   file=<binary image data>
   ```

3. **Base64 in JSON body:**
   ```
   POST /scan/base64
   Content-Type: application/json
   {
     "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
   }
   ```

**Response:**
```json
{
  "health_score": 82.5,
  "issue": "Nitrogen Deficiency",
  "confidence": 0.91,
  "ndvi": 0.42,
  "recommendation": "Apply nitrogen-rich fertilizer (NPK 19:19:19 or urea)...",
  "overlay_image": "<base64 heatmap>"
}
```

## Agronomic Reasoning

### VARI (Visible Atmospherically Resistant Index)

Formula: `VARI = (G - R) / (G + R - B)`

- **Healthy vegetation**: VARI > 0.1 (typically 0.1-0.5)
- **Stressed vegetation**: VARI < 0.1 (typically -0.1 to 0.1)
- **Non-vegetation**: VARI < -0.1

### Classification Thresholds

- **Healthy**: health_score >= 75, mean_vari >= 0.15, std_vari <= 0.12
- **Nitrogen Deficiency**: health_score 50-75, mean_vari 0.05-0.15, uniform pattern
- **Water Stress**: health_score 40-60, mean_vari 0.0-0.10, uniform stress
- **Chlorosis**: health_score 30-50, mean_vari < 0.05, yellowing pattern
- **Severe Stress/Disease**: health_score < 30 OR mean_vari < 0.0 OR std_vari > 0.20

## Dependencies

- `opencv-python>=4.8.0` - Image processing
- `Pillow>=10.0.0` - Image decoding
- `numpy>=1.24.0` - Numerical operations

## Integration

The module is automatically integrated into the main FastAPI server via `server.py`:

```python
from .leaf_analysis.leaf_scan_api import router as leaf_scan_router
app.include_router(leaf_scan_router)
```

The endpoint is available at: `http://localhost:8000/scan`


