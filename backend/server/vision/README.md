# Plant Water Stress Scanner — Vision Module

## What This Does
Analyses a plant photo using the **VARI (Visible Atmospherically Resistant Index)** vegetation index
to determine crop water stress. No ML model — pure RGB math, runs on CPU in < 800 ms.

## Endpoint
```
POST /vision/water-stress-scan
Content-Type: multipart/form-data
Field: image  (JPEG or PNG)
```

## Pipeline
```
Upload Image
    → Resize to 512×512
    → Vegetation Mask  (pixel is vegetation if G > R AND G > B)
    → VARI per pixel   (G - R) / (G + R - B + ε)
    → 8×8 Grid         classify each cell → one of 7 stress labels
    → Global VARI avg  → one of 7 classification strings
    → Heatmap          512×512 JPEG with 7-color overlay + legend bar (base64)
    → Zone Summary     count + % of cells at each stress level
```

## 7-Level Classification
| Label | VARI Range | Classification String |
|-------|-----------|----------------------|
| `dark_green` | > 0.40 | Excellent — No Irrigation Needed |
| `green` | 0.30 – 0.40 | Healthy — No Irrigation Needed |
| `light_green` | 0.25 – 0.30 | Good — Monitor Soil Moisture |
| `yellow_green` | 0.20 – 0.25 | Mild Stress — Irrigate Soon |
| `yellow` | 0.15 – 0.20 | Moderate Stress — Irrigate Today |
| `orange` | 0.08 – 0.15 | High Stress — Irrigate Urgently |
| `red` | ≤ 0.08 | Critical — Irrigate Immediately |

## Response Shape (success)
```json
{
  "status": "success",
  "average_vari": 0.3142,
  "classification": "Healthy — No Irrigation Needed",
  "heatmap_image": "<base64 JPEG with embedded 7-level legend>",
  "stress_map": [["dark_green", "green", ...], ...],   // 8×8 grid
  "zone_summary": {
    "dark_green": { "count": 12, "pct": 18.75 },
    ...
  },
  "thresholds": [
    { "label": "dark_green", "classification": "...", "vari_min": 0.40, "vari_max": 1.0, "color": "#1B5E20" },
    ...
  ],
  "processing_time_ms": 320,
  "vegetation_coverage_pct": 74.2
}
```

## Response Shape (no vegetation)
```json
{
  "status": "no_vegetation",
  "message": "Unable to detect vegetation. Please point the camera at plant leaves.",
  "average_vari": 0.0,
  "classification": "Unable to Detect",
  "heatmap_image": null,
  "stress_map": [],
  "zone_summary": {}
}
```

## File Map
| File | Role |
|------|------|
| `routes.py` | FastAPI router — `POST /vision/water-stress-scan` |
| `image_utils.py` | Load bytes → OpenCV BGR, resize to 512×512 |
| `vegetation_index.py` | Vegetation mask + VARI per pixel |
| `stress_detector.py` | 7-level cell + global classification + zone_summary() |
| `heatmap_generator.py` | 7-color overlay JPEG with embedded legend bar |

## Frontend Counterparts
| File | Role |
|------|------|
| `app/src/services/WaterStressService.ts` | HTTP call + TypeScript types |
| `app/src/screens/CameraScreen.tsx` | Gallery upload path — renders heatmap, zone chart, 7-level legend |
| `app/src/features/live_scan/LiveCameraOverlayScreen.tsx` | **FUTURE** real-time camera overlay (commented out, needs dev build) |

## Common Errors
| Error | Cause | Fix |
|-------|-------|-----|
| `status: no_vegetation` | Image has < 3% green pixels | Point camera at leaves, not soil/sky |
| `422 Unprocessable Entity` | Wrong form field name | Field must be `image`, not `file` |
| `Could not decode image` | Corrupt/non-image bytes | Ensure JPEG or PNG |
| Backend returns old 3-level labels | Old `stress_detector.py` cached | Restart server (`python run_server.py`) |
| Frontend shows `--` for VARI | `average_vari` is `null` | Check `no_vegetation` status branch |

## Run Integration Tests
```bash
# Terminal 1
python run_server.py

# Terminal 2
python test_water_stress.py
```
Expected: 6/6 tests pass.
