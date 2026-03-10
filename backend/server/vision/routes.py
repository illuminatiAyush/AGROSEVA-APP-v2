"""
routes.py — FastAPI router for the Plant Water Stress Scanner.

Independent module: does NOT import or modify any existing AgroSeva
irrigation, relay, DRL, or disease detection code.

Endpoint:
    POST /vision/water-stress-scan
        Input : multipart/form-data  →  image (plant photo)
        Output: JSON with multi-index vegetation analysis (VARI, ExG, NGRDI),
                32×32 stress grid, crop health score, heatmap,
                zone summary, stress distribution, and irrigation recommendation
"""

import time
from fastapi import APIRouter, UploadFile, File, HTTPException

from .image_utils import load_image_from_bytes, resize_image
from .advanced_analysis import run_advanced_analysis, THRESHOLD_REFERENCE

# Dedicated router — prefix keeps all vision routes namespaced
router = APIRouter(prefix="/vision", tags=["Plant Vision"])


@router.post("/water-stress-scan")
async def water_stress_scan(image: UploadFile = File(...)):
    """
    Analyse a plant photo for water stress using multi-index RGB vegetation
    analysis (VARI + ExG + NGRDI) with a 32×32 stress grid.

    Pipeline (all CPU, no ML model, target < 800 ms at 512×512):
        1. Load & resize image to 512×512
        2. Normalize lighting via LAB color space
        3. Segment vegetation pixels (green ratio > 0.55)
        4. Compute VARI, ExG, NGRDI vegetation indices
        5. Fuse into single stress score (weighted)
        6. Apply spatial smoothing (Gaussian 9×9)
        7. Divide into 32×32 grid; classify each cell into 7 levels
        8. Compute crop health score (0–10)
        9. Generate heatmap overlay → base64 JPEG
       10. Compute zone summary + stress distribution + recommendation

    Returns:
        {
            "status": "success",
            "average_vari": float,
            "classification": str,
            "heatmap_image": str,           # base64 JPEG
            "stress_map": list[list[str]],  # 32×32 grid of 7-level labels
            "zone_summary": dict,
            "thresholds": list[dict],
            "processing_time_ms": int,
            "vegetation_coverage_pct": float,
            "crop_health_score": float,     # 0–10 scale
            "vegetation_indices": dict,     # {vari, exg, ngrdi}
            "stress_distribution": dict,    # percentage per level
            "grid_resolution": int,         # 32
            "recommendation": str           # farmer-facing advice
        }
    """
    t_start = time.time()

    # ── Validate upload ────────────────────────────────────────────────────────
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a JPEG or PNG image."
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file received.")

    print(f"[VISION] POST /vision/water-stress-scan — {len(image_bytes)} bytes ({image.filename})")

    # ── Step 1: Load & resize ──────────────────────────────────────────────────
    try:
        img = load_image_from_bytes(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    img_small = resize_image(img)   # 512 × 512 BGR

    # ── Steps 2–10: Advanced analysis pipeline ─────────────────────────────────
    result = run_advanced_analysis(img_small)

    elapsed = int((time.time() - t_start) * 1000)

    # ── Handle no-vegetation case ──────────────────────────────────────────────
    if result["status"] == "no_vegetation":
        print(f"[VISION] No vegetation detected ({elapsed} ms)")
        return {
            "status": "no_vegetation",
            "message": (
                "Unable to detect vegetation. "
                "Please point the camera at plant leaves and try again."
            ),
            "average_vari": 0.0,
            "classification": "Unable to Detect",
            "heatmap_image": None,
            "stress_map": [],
            "zone_summary": {},
            "thresholds": THRESHOLD_REFERENCE,
            "processing_time_ms": elapsed,
            "vegetation_coverage_pct": result.get("vegetation_coverage_pct", 0.0),
            "crop_health_score": 0.0,
            "vegetation_indices": {"vari": 0.0, "exg": 0.0, "ngrdi": 0.0},
            "stress_distribution": {},
            "grid_resolution": 32,
            "recommendation": "No vegetation detected. Ensure the camera captures plant leaves.",
        }

    # ── Success response ───────────────────────────────────────────────────────
    result["processing_time_ms"] = elapsed
    print(f"[VISION] ✅ Done in {elapsed} ms — health={result['crop_health_score']}, "
          f"class={result['classification']}")

    return result
