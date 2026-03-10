"""
test_water_stress.py — Integration tests for the upgraded Plant Water Stress Scanner.

Validates the multi-index (VARI, ExG, NGRDI) analysis pipeline with 32×32 grid,
crop health scoring, and the extended response shape.

HOW TO RUN:
    1. Start the backend:   python run_server.py
    2. Run this script:     python test_water_stress.py
"""

import io
import sys
import time
import struct
import zlib
import requests

# ── Config ─────────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8000"
ENDPOINT = f"{BASE_URL}/vision/water-stress-scan"


# ── Helper: create synthetic PNG in memory ─────────────────────────────────────
def _create_png(width: int, height: int, r: int, g: int, b: int) -> bytes:
    """
    Create a minimal valid PNG image in memory with uniform color (r, g, b).
    Returns raw PNG bytes suitable for uploading.
    """
    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = _chunk(b"IHDR", ihdr_data)

    raw_rows = b""
    for _ in range(height):
        raw_rows += b"\x00"  # filter byte
        raw_rows += bytes([r, g, b]) * width

    idat = _chunk(b"IDAT", zlib.compress(raw_rows))
    iend = _chunk(b"IEND", b"")

    return signature + ihdr + idat + iend


def _upload(png_bytes: bytes) -> dict:
    """Upload a PNG to the water stress endpoint and return JSON."""
    files = {"image": ("test_plant.png", io.BytesIO(png_bytes), "image/png")}
    resp = requests.post(ENDPOINT, files=files, timeout=30)
    assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text}"
    return resp.json()


# ══════════════════════════════════════════════════════════════════════════════
# TESTS
# ══════════════════════════════════════════════════════════════════════════════
def test_response_shape():
    """All required keys must be present in a successful response."""
    print("\n[1] Testing response shape...")
    png = _create_png(128, 128, 60, 180, 60)  # vivid green
    data = _upload(png)

    required_keys = [
        "status", "average_vari", "classification", "heatmap_image",
        "stress_map", "zone_summary", "thresholds", "processing_time_ms",
        "vegetation_coverage_pct", "crop_health_score", "vegetation_indices",
        "stress_distribution", "grid_resolution", "recommendation",
    ]
    for key in required_keys:
        assert key in data, f"Missing key: {key}"

    # Vegetation indices sub-fields
    vi = data["vegetation_indices"]
    for idx in ("vari", "exg", "ngrdi"):
        assert idx in vi, f"Missing vegetation_indices.{idx}"

    print("   ✅ All required keys present")


def test_grid_resolution_32x32():
    """Stress map should be 32×32."""
    print("\n[2] Testing 32×32 grid resolution...")
    png = _create_png(128, 128, 60, 180, 60)
    data = _upload(png)

    assert data["status"] == "success"
    assert data["grid_resolution"] == 32, f"Expected grid_resolution=32, got {data['grid_resolution']}"

    stress_map = data["stress_map"]
    assert len(stress_map) == 32, f"Expected 32 rows, got {len(stress_map)}"
    assert len(stress_map[0]) == 32, f"Expected 32 cols, got {len(stress_map[0])}"

    print(f"   ✅ Grid is {len(stress_map)}×{len(stress_map[0])}")


def test_healthy_plant():
    """Vivid green plant should have high health score and healthy classification."""
    print("\n[3] Testing healthy plant detection...")
    png = _create_png(128, 128, 50, 200, 50)  # vivid green
    data = _upload(png)

    assert data["status"] == "success"
    score = data["crop_health_score"]
    assert score >= 5.0, f"Expected health score ≥ 5.0, got {score}"
    print(f"   Health Score: {score}")
    print(f"   Classification: {data['classification']}")
    print(f"   VARI: {data['vegetation_indices']['vari']}")
    print(f"   ExG: {data['vegetation_indices']['exg']}")
    print(f"   NGRDI: {data['vegetation_indices']['ngrdi']}")
    print("   ✅ Healthy plant detected correctly")


def test_stressed_plant():
    """Yellow/brown plant should have lower health score."""
    print("\n[4] Testing stressed plant detection...")
    png = _create_png(128, 128, 180, 160, 60)  # yellowish
    data = _upload(png)

    score = data["crop_health_score"]
    print(f"   Health Score: {score}")
    print(f"   Classification: {data['classification']}")
    print("   ✅ Stressed plant analysis complete")


def test_no_vegetation():
    """Brown soil RGB should return no_vegetation."""
    print("\n[5] Testing no-vegetation detection...")
    png = _create_png(128, 128, 160, 120, 90)  # brownish soil
    data = _upload(png)

    assert data["status"] == "no_vegetation", f"Expected no_vegetation, got {data['status']}"
    assert "message" in data
    print(f"   ✅ No vegetation correctly detected: {data.get('message', '')[:60]}...")


def test_processing_time():
    """Processing should complete in under 800ms."""
    print("\n[6] Testing processing time...")
    png = _create_png(256, 256, 60, 180, 60)
    data = _upload(png)

    ms = data["processing_time_ms"]
    assert ms < 800, f"Processing took {ms}ms (limit: 800ms)"
    print(f"   ✅ Processing time: {ms}ms (< 800ms)")


def test_stress_distribution():
    """Stress distribution should sum to roughly 100%."""
    print("\n[7] Testing stress distribution...")
    png = _create_png(128, 128, 60, 180, 60)
    data = _upload(png)

    dist = data.get("stress_distribution", {})
    total = sum(dist.values())
    assert 99.0 <= total <= 101.0, f"Distribution sums to {total}%, expected ~100%"
    print(f"   Distribution: {dist}")
    print(f"   ✅ Total: {total:.1f}%")


def test_recommendation_present():
    """Recommendation text should be non-empty."""
    print("\n[8] Testing recommendation...")
    png = _create_png(128, 128, 60, 180, 60)
    data = _upload(png)

    rec = data.get("recommendation", "")
    assert len(rec) > 10, f"Recommendation too short: '{rec}'"
    print(f"   ✅ Recommendation: {rec[:80]}...")


# ── Runner ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Plant Water Stress Scanner — Integration Tests")
    print("  Multi-Index Analysis (VARI + ExG + NGRDI) | 32×32 Grid")
    print("=" * 60)

    # Check server
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"\n✅ Backend reachable at {BASE_URL}")
    except Exception:
        print(f"\n❌ Cannot reach backend at {BASE_URL}")
        print("   Start the server first: python run_server.py")
        sys.exit(1)

    tests = [
        test_response_shape,
        test_grid_resolution_32x32,
        test_healthy_plant,
        test_stressed_plant,
        test_no_vegetation,
        test_processing_time,
        test_stress_distribution,
        test_recommendation_present,
    ]

    passed = 0
    failed = 0
    t_start = time.time()

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"   ❌ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            failed += 1

    elapsed = time.time() - t_start
    print(f"\n{'=' * 60}")
    print(f"  Results: {passed} passed, {failed} failed  ({elapsed:.1f}s)")
    print(f"{'=' * 60}")
    sys.exit(1 if failed else 0)
