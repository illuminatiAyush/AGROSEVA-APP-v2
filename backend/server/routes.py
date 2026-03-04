"""
API Routes

HTTP endpoints for system status and monitoring.
All endpoints return ONLY live data from Arduino - no mocks, no dummy values.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from .schemas import StatusResponse, MoistureResponse
from .state import State
from .relay_controller import RelayController
from .safety import SafetyManager
from .agent import decide_action


# Create router
router = APIRouter()


def initialize_routes(state: State, relay: RelayController, safety: SafetyManager):
    """
    Initialize routes with dependencies.
    
    Args:
        state: State instance
        relay: RelayController instance
        safety: SafetyManager instance
    """
    router.state = state
    router.relay = relay
    router.safety = safety


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

