"""
API Routes

HTTP endpoints for system status and monitoring.
All endpoints return ONLY live data from Arduino - no mocks, no dummy values.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from datetime import datetime
from .schemas import StatusResponse, MoistureResponse, DiseaseResponse
from .state import State
from .relay_controller import RelayController
from .safety import SafetyManager
from .agent import decide_action


# Create router
router = APIRouter()


def initialize_routes(state: State, relay: RelayController, safety: SafetyManager, disease_service=None):
    """
    Initialize routes with dependencies.
    
    Args:
        state: State instance
        relay: RelayController instance
        safety: SafetyManager instance
        disease_service: DiseaseService instance (optional)
    """
    router.state = state
    router.relay = relay
    router.safety = safety
    router.disease_service = disease_service


@router.get("/health")
async def health():
    """
    Health check endpoint.
    
    Returns:
        System health status
    """
    state: State = router.state
    relay: RelayController = router.relay
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "serial_connected": relay.is_connected() if hasattr(relay, 'is_connected') else False,
        "moisture_data_available": state.has_moisture()
    }


@router.get("/moisture", response_model=MoistureResponse)
async def get_moisture():
    """
    Get latest live moisture reading from Arduino.
    
    Returns:
        {
            "moisture": <int>,
            "unit": "%",
            "source": "arduino",
            "timestamp": <int>
        }
    
    NO fake data - returns None if Arduino not connected or no data received yet.
    Yield system is completely isolated - does not affect this endpoint.
    """
    state: State = router.state
    
    # Log request for debugging
    print(f"[API] GET /moisture requested at {datetime.now().isoformat()}")
    
    if not state.has_moisture():
        print(f"[API] ⚠️ No moisture data available - Arduino may not be connected")
        raise HTTPException(
            status_code=404,
            detail="No moisture data available. Arduino may not be connected or no sensor readings received yet."
        )
    
    moisture = state.get_moisture()
    timestamp = state.get_timestamp()
    source = state.get_source()
    
    # Log response for debugging
    print(f"[API] ✅ Returning moisture: {moisture}% (timestamp: {timestamp}, source: {source})")
    
    return MoistureResponse(
        moisture=int(moisture) if moisture is not None else None,
        unit="%",
        source=source,
        timestamp=int(timestamp) if timestamp is not None else None
    )


@router.get("/status")
async def get_status():
    """
    Get system status with EXACT JSON shape required by mobile app (includes multi-sensor data and XAI explanation).
    
    Returns EXACTLY:
    {
        "moisture": number | null,
        "temperature": number | null,
        "ph": number | null,
        "irrigation": "ON" | "OFF",
        "explanation": string | null,
        "timestamp": number | null
    }
    
    All values come from LIVE state updated by SerialReader and decision agent.
    
    STABILITY FIX: Always returns valid structure, never crashes.
    Missing sensors return null (no errors).
    
    Yield system is completely isolated - does not appear in response unless ENABLE_YIELD=True.
    """
    state: State = router.state
    relay: RelayController = router.relay
    
    # Get live sensor data from state (updated by SerialReader)
    moisture = state.get_moisture()
    temperature = state.get_temperature()
    ph = state.get_ph()
    timestamp = state.get_timestamp()
    
    # Get explanation from state (XAI - updated when decision is made)
    explanation = state.get_explanation()
    
    # Add debug logging
    print(f"[API] /status -> state.get_moisture() = {moisture}")
    print(f"[API] /status -> state.get_temperature() = {temperature}")
    print(f"[API] /status -> state.get_ph() = {ph}")
    print(f"[API] /status -> state.get_timestamp() = {timestamp}")
    print(f"[API] /status -> state.get_explanation() = {explanation}")
    
    # Get irrigation state from relay (updated immediately when relay turns ON/OFF)
    irrigation_state = "OFF"
    if relay.is_on:
        irrigation_state = "ON"
    
    # STABILITY FIX: Ensure all values are correct types when they exist
    # Convert to appropriate types safely
    moisture_value = None
    if moisture is not None:
        try:
            moisture_value = float(moisture)
        except (ValueError, TypeError):
            print(f"[API] ⚠️ Invalid moisture value in state: {moisture}")
            moisture_value = None
    
    temperature_value = None
    if temperature is not None:
        try:
            temperature_value = float(temperature)
        except (ValueError, TypeError):
            print(f"[API] ⚠️ Invalid temperature value in state: {temperature}")
            temperature_value = None
    
    ph_value = None
    if ph is not None:
        try:
            ph_value = float(ph)
        except (ValueError, TypeError):
            print(f"[API] ⚠️ Invalid pH value in state: {ph}")
            ph_value = None
    
    # STABILITY FIX: Always include a valid timestamp (even if null)
    # Convert to integer timestamp (Unix epoch seconds)
    timestamp_value = None
    if timestamp is not None:
        try:
            timestamp_value = int(timestamp)
        except (ValueError, TypeError):
            print(f"[API] ⚠️ Invalid timestamp in state: {timestamp}")
            timestamp_value = None
    
    # Build response with EXACT shape required (includes all sensors)
    # STATE INTEGRITY: If sensor received once, always return last value (not null)
    # Only return null if sensor never received
    response = {
        "moisture": moisture_value,  # float or null (null only if never received)
        "temperature": temperature_value,  # float or null (null only if never received)
        "ph": ph_value,  # float or null (null only if never received, lowercase for API consistency)
        "irrigation": irrigation_state,  # "ON" or "OFF"
        "explanation": explanation if explanation else None,  # string or null
        "timestamp": timestamp_value  # int or null
    }
    
    # ===== YIELD INFO (OPTIONAL, BACKWARD COMPATIBLE) =====
    # Yield system is completely isolated - optional field, never required
    # Only added if ENABLE_YIELD=True and yield calculation succeeds
    from . import config
    if config.ENABLE_YIELD:
        try:
            from .yield_ai.yield_engine import compute_current_yield
            from .yield_ai.yield_drl_adapter import estimate_yield_impact
            
            # Get current yield (read-only, never modifies state)
            crop_stage = "vegetative"  # Default, can be made configurable
            current_yield_data = compute_current_yield(
                moisture=moisture_value,
                temperature=temperature_value,
                ph=ph_value,
                crop_stage=crop_stage
            )
            current_yield = current_yield_data["current"]
            
            # Estimate projected yield (read-only)
            # Use default action 0 (DO_NOTHING) for status endpoint
            # Actual DRL action would come from last decision, but we use conservative estimate
            drl_action = 0  # Default to DO_NOTHING for status endpoint
            # Only estimate if we have moisture data
            if moisture_value is not None:
                yield_impact = estimate_yield_impact(
                    current_yield=current_yield,
                    drl_action=drl_action,
                    moisture=moisture_value
                )
            else:
                # No moisture data - use default delta of 0
                yield_impact = {
                    "projected": current_yield,
                    "delta": 0.0,
                    "reason": "No irrigation action - maintains current yield levels"
                }
            
            # Add yield info as optional field (backward compatible)
            response["yield"] = {
                "current": current_yield,
                "projected": yield_impact["projected"],
                "delta": yield_impact["delta"],
                "reason": yield_impact["reason"]
            }
            
        except Exception as e:
            # Yield system failure is non-critical - silently skip
            # Do NOT add yield field if calculation fails
            # Response remains valid without yield info
            pass
    
    # Add debug log as required
    print(f"[API] /status → {response}")
    
    return response


@router.post("/disease")
async def detect_disease(image: UploadFile = File(...)):
    """
    Plant disease detection endpoint.
    
    OFFLINE: Sends to ESP32 TinyML -> healthy/diseased
    ONLINE: Accurate model -> disease name -> Groq LLM -> diagnosis
    
    Args:
        image: Uploaded image file (JPEG/PNG from phone camera)
    """
    from . import config
    
    if not config.ENABLE_DISEASE:
        raise HTTPException(status_code=503, detail="Disease detection is disabled")
    
    disease_service = getattr(router, 'disease_service', None)
    if disease_service is None:
        raise HTTPException(status_code=503, detail="Disease service not initialized")
    
    # Read uploaded image
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")
    
    print(f"[API] POST /disease - received {len(image_bytes)} bytes ({image.filename})")
    
    # ═══════════════════════════════════════════════════════════════════
    # PIPELINE: Offline first (ESP32 TinyML) → Online enhancement if available
    # ═══════════════════════════════════════════════════════════════════
    
    response = {}
    disease_name = None
    offline_result = None
    
    # ── Step 1: OFFLINE — ESP32 TinyML binary classification ──────────
    # Always attempted first. Returns healthy/diseased.
    # Tries: (a) ESP32 serial, (b) local TinyML .tflite fallback
    if disease_service.is_connected():
        print("[API] Step 1: Running ESP32 TinyML inference (offline)")
        offline_result = disease_service.run_esp32_inference(image_bytes)
    elif disease_service.has_tinyml_model():
        print("[API] Step 1: Running local TinyML model (offline, ESP32 not connected)")
        offline_result = disease_service.run_tinyml_inference(image_bytes)
    else:
        print("[API] Step 1: Offline unavailable (no ESP32, no TinyML model)")
    
    if offline_result and offline_result.get("status") in ("healthy", "diseased"):
        response = {
            "status": offline_result["status"],
            "confidence": offline_result.get("confidence", 0),
            "method": offline_result.get("method", "esp32_tinyml"),
            "inference_time_ms": offline_result.get("inference_time_ms"),
            "is_healthy": offline_result["status"] == "healthy",
        }
        print(f"[API] Step 1 result: {response['status']} ({response['confidence']}%)")
    
    # ── Step 2: ONLINE — Accurate model (multi-class) ─────────────────
    # Enhances the offline result with specific disease name + top predictions.
    # Runs if the accurate model is loaded (requires no internet — model is local).
    if disease_service.has_accurate_model():
        print("[API] Step 2: Running accurate model inference (online mode)")
        accurate_result = disease_service.run_accurate_inference(image_bytes)
        if "disease_name" in accurate_result:
            disease_name = accurate_result["disease_name"]
            # Accurate model overrides/enhances the offline result
            response = {
                "status": "healthy" if accurate_result.get("is_healthy") else "diseased",
                "confidence": accurate_result.get("confidence", 0),
                "method": "accurate_model",
                "disease_name": disease_name,
                "raw_class": accurate_result.get("raw_class", ""),
                "is_healthy": accurate_result.get("is_healthy", False),
                "all_predictions": accurate_result.get("all_predictions", {}),
            }
            # Preserve offline result as reference
            if offline_result and offline_result.get("status") in ("healthy", "diseased"):
                response["offline_result"] = {
                    "status": offline_result["status"],
                    "confidence": offline_result.get("confidence", 0),
                    "method": offline_result.get("method", "esp32_tinyml"),
                }
        else:
            print(f"[API] Step 2 failed: {accurate_result.get('message', 'unknown error')}")
            # Keep offline result if accurate model failed
            if not response:
                response = {
                    "status": "error",
                    "confidence": 0,
                    "method": "accurate_model",
                    "message": accurate_result.get("message", "Inference failed"),
                }
    
    # If neither offline nor online produced a result
    if not response:
        response = {
            "status": "error",
            "confidence": 0,
            "method": "none",
            "message": "No detection available. Connect ESP32 or place models in backend/ml/",
        }
    
    # ── Step 3: GROQ LLM — Detailed diagnosis (requires internet) ─────
    if config.GROQ_API_KEY and response.get("status") in ("healthy", "diseased"):
        from .groq_service import get_disease_diagnosis

        print(f"[API] Step 3: Calling Groq with disease_name={disease_name!r}")
        groq_result = get_disease_diagnosis(
            disease_status=response["status"],
            confidence=response["confidence"],
            disease_name=disease_name
        )

        if groq_result.get("available"):
            diagnosis = groq_result.get("diagnosis", {})
            response["diagnosis"] = diagnosis
            response["llm_model"] = groq_result.get("model_used")

            # ── FIX: If Step 2 (accurate model) didn't set disease_name,
            # promote it from the Groq diagnosis so the UI always has it.
            if not response.get("disease_name") and diagnosis.get("disease_name"):
                response["disease_name"] = diagnosis["disease_name"]
                print(f"[API] disease_name promoted from Groq: {response['disease_name']}")
        else:
            response["diagnosis_note"] = groq_result.get("reason", "LLM unavailable")

    print(f"[API] POST /disease -> status={response.get('status')}, "
          f"disease_name={response.get('disease_name')!r}, "
          f"confidence={response.get('confidence')}%")
    return response
