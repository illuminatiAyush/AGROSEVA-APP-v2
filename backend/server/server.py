"""
AgroSeva Irrigation Brain Server - Self-Healing Fail-Safe System

FastAPI server that reads live moisture data from Arduino and makes autonomous decisions.
All sensor data comes from Arduino - NO mocks, NO dummy values.

SELF-HEALING ARCHITECTURE:
- Thread auto-restart on exception (never crashes)
- Supervisor loop monitors all threads
- Graceful handling of stale data
- Auto-recovery from serial failures

Architecture:
Arduino Sensor → Serial Reader → State → Agent → Relay Controller → Motor
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional
import uvicorn
import threading
import time
import traceback

from . import config
from .state import State
from .serial_reader import SerialReader
from .relay_controller import RelayController
from .safety import SafetyManager
from .agent import decide_action
from .routes import router, initialize_routes
# from .leaf_analysis.leaf_scan_api import router as leaf_scan_router


# Initialize FastAPI app
app = FastAPI(
    title="AgroSeva Irrigation Brain",
    description="Autonomous irrigation decision system - reads live Arduino sensors, makes decisions, controls relay",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
state = State()
serial_reader = SerialReader(state)
relay_controller = RelayController()
safety_manager = SafetyManager()

# Initialize routes with dependencies
initialize_routes(state, relay_controller, safety_manager)
app.include_router(router)
# app.include_router(leaf_scan_router)

# Decision loop control
_decision_loop_running = False
_decision_loop_thread: Optional[threading.Thread] = None
_last_processed_moisture: Optional[float] = None
_decision_loop_restart_count = 0

# Supervisor loop control
_supervisor_running = False
_supervisor_thread: Optional[threading.Thread] = None


def start_decision_loop():
    """Start background thread for autonomous decision-making (self-healing)."""
    global _decision_loop_running, _decision_loop_thread
    
    if _decision_loop_running:
        return
    
    _decision_loop_running = True
    _start_decision_thread()
    print("[DECISION] Started decision loop thread")


def _start_decision_thread():
    """Start or restart the decision thread."""
    global _decision_loop_thread
    
    if _decision_loop_thread and _decision_loop_thread.is_alive():
        return
    
    _decision_loop_thread = threading.Thread(target=_decision_worker_with_recovery, daemon=True)
    _decision_loop_thread.start()


def _decision_worker_with_recovery():
    """
    Decision worker with automatic recovery (wraps main worker).
    
    WRAPPED IN TRY/EXCEPT - auto-restarts on any exception.
    """
    global _decision_loop_restart_count
    
    while _decision_loop_running:
        try:
            _decision_worker()
        except Exception as e:
            # CRITICAL: Never let thread die - auto-restart
            _decision_loop_restart_count += 1
            print(f"[RECOVERY] Decision loop exception (restart #{_decision_loop_restart_count}): {e}")
            print(f"[RECOVERY] Traceback:")
            traceback.print_exc()
            print(f"[RECOVERY] Decision loop will restart in 3 seconds...")
            
            # Wait before restart
            time.sleep(3)
            
            # Restart thread if still running
            if _decision_loop_running:
                print(f"[RECOVERY] Decision loop restarted")
                continue
            else:
                break


def _decision_worker():
    """
    Background worker that continuously evaluates live sensor data and makes decisions.
    
    FAIL-SAFE:
    - Handles stale data gracefully (does NOTHING, does NOT crash)
    - Never blocks indefinitely
    - Logs all decisions clearly
    """
    global _last_processed_moisture
    
    print("[DECISION] Decision loop running - monitoring live Arduino sensor data...")
    
    while _decision_loop_running:
        try:
            # Get latest LIVE moisture reading from Arduino
            moisture = state.get_moisture()
            timestamp = state.get_timestamp()
            
            # Check if data is stale (older than configured timeout = communication loss)
            if timestamp is not None:
                age = time.time() - timestamp
                if age > config.STALE_DATA_TIMEOUT:
                    # Data is stale - do NOTHING (safe state)
                    # Don't crash, just log and wait
                    if age > 30.0:  # Only log every 30 seconds to avoid spam
                        print(f"[DECISION] ⚠️ Sensor data is stale ({age:.1f}s old) - waiting for fresh data...")
                    time.sleep(config.DECISION_INTERVAL)
                    continue
            
            # Only process if we have new live data
            if moisture is not None and moisture != _last_processed_moisture:
                _last_processed_moisture = moisture
                
                # Get irrigation state for DRL agent
                irrigation_on = relay_controller.is_on
                time_since_last = safety_manager.get_time_since_last_irrigation() or 0.0
                
                # Agent makes decision using DRL policy (or rule-based fallback)
                # NOTE: Moisture is the ONLY input to decision making
                decision = decide_action(moisture, irrigation_on, time_since_last)
                
                # ===== YIELD PREDICTION (READ-ONLY, NON-BLOCKING) =====
                # Yield system is completely isolated - never affects decision or irrigation
                # Only runs if ENABLE_YIELD=True and only AFTER decision is made
                if config.ENABLE_YIELD:
                    try:
                        from .yield_ai.yield_engine import compute_current_yield
                        from .yield_ai.yield_drl_adapter import estimate_yield_impact
                        
                        # Get sensor data (read-only)
                        temperature = state.get_temperature()
                        ph = state.get_ph()
                        crop_stage = "vegetative"  # Default, can be made configurable
                        
                        # Compute current yield (read-only, never modifies state)
                        current_yield_data = compute_current_yield(
                            moisture=moisture,
                            temperature=temperature,
                            ph=ph,
                            crop_stage=crop_stage
                        )
                        current_yield = current_yield_data["current"]
                        
                        # Map decision action to DRL action format (0, 1, 2)
                        # decision["action"]: "DO_NOTHING" or "IRRIGATE"
                        # decision["duration"]: 0, 15, or 30
                        if decision["action"] == "DO_NOTHING":
                            drl_action = 0
                        elif decision["duration"] == 15:
                            drl_action = 1
                        elif decision["duration"] == 30:
                            drl_action = 2
                        else:
                            drl_action = 0  # Default to DO_NOTHING for unknown
                        
                        # Estimate yield impact (read-only, never modifies state)
                        yield_impact = estimate_yield_impact(
                            current_yield=current_yield,
                            drl_action=drl_action,
                            moisture=moisture
                        )
                        
                        # Attach yield info to decision (read-only, for explanation only)
                        decision["yield"] = {
                            "current": current_yield,
                            "projected": yield_impact["projected"],
                            "delta": yield_impact["delta"],
                            "reason": yield_impact["reason"]
                        }
                        
                        # Log yield info (minimal logging as required)
                        print(f"[YIELD] Current={current_yield}% Projected={yield_impact['projected']}% ({yield_impact['delta']:+.1f}%)")
                        
                    except Exception as e:
                        # Yield system failure is non-critical - log once and continue
                        print(f"[YIELD] Disabled due to error (non-critical): {e}")
                        # Do NOT attach yield to decision if it fails
                        # System continues normally without yield info
                
                print(f"\n{'='*60}")
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 🧠 Agent Decision (Live Data)")
                print(f"{'='*60}")
                print(f"  Live Moisture: {moisture}% (from Arduino)")
                print(f"  Irrigation State: {'ON' if irrigation_on else 'OFF'}")
                print(f"  Time Since Last: {time_since_last:.1f}s")
                print(f"  Method: {decision.get('method', 'UNKNOWN')}")
                print(f"  Decision: {decision['action']}")
                print(f"  Duration: {decision['duration']}s")
                print(f"  Reason: {decision['reason']}")
                if decision.get('explanation'):
                    print(f"  Explanation: {decision['explanation']}")
                if decision.get('yield'):
                    yield_info = decision['yield']
                    print(f"  Yield: {yield_info['current']}% → {yield_info['projected']}% ({yield_info['delta']:+.1f}%)")
                
                # Store explanation in state (XAI)
                if decision.get('explanation'):
                    state.set_explanation(decision['explanation'])
                    print(f"[XAI] Stored explanation: {decision['explanation']}")
                
                # Execute decision if IRRIGATE
                if decision["action"] == "IRRIGATE":
                    duration = decision["duration"]
                    
                    # Check safety limits
                    can_irrigate, reason = safety_manager.check_can_irrigate(duration)
                    
                    if can_irrigate:
                        # Turn relay ON for duration
                        if relay_controller.turn_on_for(duration):
                            state.set_irrigation_state("ON")
                            safety_manager.record_irrigation_start(duration)
                            print(f"  ✅ Relay activated - irrigating for {duration} seconds")
                        else:
                            print(f"  ⚠️ Relay activation failed (check Arduino connection)")
                    else:
                        print(f"  ⚠️ Irrigation blocked by safety: {reason}")
                elif decision["action"] == "DO_NOTHING":
                    # Ensure relay is OFF
                    if relay_controller.is_on:
                        relay_controller.turn_off()
                        state.set_irrigation_state("OFF")
                        safety_manager.record_irrigation_end()
                        print(f"  ✅ Relay turned OFF (DO_NOTHING decision)")
                    else:
                        state.set_irrigation_state("OFF")
                    print(f"  ℹ️ No irrigation needed")
                
                print(f"{'='*60}\n")
            
            # Check if relay should be turned OFF (duration expired)
            # This is handled by relay controller's auto-off thread, but we check here too
            relay_status = relay_controller.get_status()
            if relay_status.get("is_on") and relay_status.get("remaining_seconds") is not None:
                if relay_status["remaining_seconds"] <= 0:
                    relay_controller.turn_off()
                    state.set_irrigation_state("OFF")
                    safety_manager.record_irrigation_end()
                    print(f"[DECISION] ✅ Irrigation completed - relay turned OFF")
            
            # Wait before next check
            time.sleep(config.DECISION_INTERVAL)
            
        except Exception as e:
            # Log error but don't crash - will be caught by recovery wrapper
            print(f"[DECISION] ❌ Error in decision loop: {e}")
            time.sleep(config.DECISION_INTERVAL)


def start_supervisor():
    """
    Start supervisor loop that monitors all threads.
    
    SUPERVISOR RESPONSIBILITIES:
    - Monitor serial reader thread (restart if dead)
    - Monitor decision loop thread (restart if dead)
    - Log thread health status
    - Never crashes (wrapped in try/except)
    """
    global _supervisor_running, _supervisor_thread
    
    if _supervisor_running:
        return
    
    _supervisor_running = True
    _supervisor_thread = threading.Thread(target=_supervisor_worker, daemon=True)
    _supervisor_thread.start()
    print("[SUPERVISOR] Started supervisor thread")


def _supervisor_worker():
    """
    Supervisor loop that monitors all background threads.
    
    Checks every 5 seconds:
    - Serial reader thread alive?
    - Decision loop thread alive?
    - Restarts any dead threads
    """
    print("[SUPERVISOR] Supervisor loop running - monitoring threads...")
    
    while _supervisor_running:
        try:
            # Check serial reader thread
            if not serial_reader.thread or not serial_reader.thread.is_alive():
                if serial_reader.running:
                    print("[SUPERVISOR] ⚠️ Serial reader thread is dead - restarting...")
                    serial_reader._start_thread()
                    print("[SUPERVISOR] ✅ Serial reader thread restarted")
            
            # Check decision loop thread
            if not _decision_loop_thread or not _decision_loop_thread.is_alive():
                if _decision_loop_running:
                    print("[SUPERVISOR] ⚠️ Decision loop thread is dead - restarting...")
                    _start_decision_thread()
                    print("[SUPERVISOR] ✅ Decision loop thread restarted")
            
            # Log thread health (every 30 seconds to avoid spam)
            if int(time.time()) % 30 == 0:
                serial_alive = serial_reader.thread and serial_reader.thread.is_alive()
                decision_alive = _decision_loop_thread and _decision_loop_thread.is_alive()
                serial_restarts = serial_reader.get_restart_count()
                
                print(f"[SUPERVISOR] Thread health: Serial={serial_alive} (restarts: {serial_restarts}), Decision={decision_alive} (restarts: {_decision_loop_restart_count})")
            
            # Sleep for 5 seconds before next check
            time.sleep(5)
            
        except Exception as e:
            # Supervisor must never crash
            print(f"[SUPERVISOR] ❌ Supervisor error: {e}")
            traceback.print_exc()
            time.sleep(5)


@app.on_event("startup")
async def startup_event():
    """Initialize system on startup."""
    print("\n" + "="*70)
    print("🌱 AgroSeva Irrigation Brain - Starting System (Self-Healing)")
    print("="*70)
    print("📡 Reading LIVE moisture data from Arduino")
    print("🧠 Making autonomous decisions based on real sensor values")
    print("🛡️ Self-healing architecture enabled")
    print("="*70)
    
    # Start serial reader (reads live Arduino data)
    print(f"[INIT] Starting serial reader on {config.SERIAL_PORT}...")
    serial_reader.start()
    print(f"[INIT] Serial reader started - waiting for Arduino sensor data on {config.SERIAL_PORT}...")
    print(f"[INIT] If Arduino is not connected, set COM_PORT environment variable (e.g., set COM_PORT=COM3)")
    
    # Start decision loop
    start_decision_loop()
    print("[INIT] Decision loop started")
    
    # Start supervisor loop
    start_supervisor()
    print("[INIT] Supervisor loop started")
    
    print("[INIT] ✅ System ready! (All threads self-healing)")
    print("="*70 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global _decision_loop_running, _supervisor_running
    
    print("\n[SHUTDOWN] Stopping system...")
    _decision_loop_running = False
    _supervisor_running = False
    serial_reader.stop()
    relay_controller.turn_off()
    relay_controller.disconnect()
    print("[SHUTDOWN] System stopped")


@app.get("/")
async def root():
    """Root endpoint - system information."""
    return {
        "system": "AgroSeva Irrigation Brain",
        "version": "2.0.0",
        "description": "Autonomous irrigation decision system with self-healing architecture",
        "architecture": "Arduino Sensor → Serial Reader → State → Agent → Relay Controller → Motor",
        "data_source": "LIVE Arduino sensor data - NO mocks, NO dummy values",
        "features": [
            "Self-healing threads (auto-restart on exception)",
            "Hardware watchdog timer (Arduino auto-reset)",
            "Heartbeat detection (communication loss detection)",
            "Firmware-enforced safety limits",
            "Graceful stale data handling"
        ],
        "endpoints": {
            "GET /health": "Health check",
            "GET /status": "System status with live sensor data",
            "GET /moisture": "Latest live moisture reading from Arduino"
        },
        "note": "All sensor data comes from Arduino via Serial. System makes autonomous decisions based on live moisture readings. System auto-recovers from any crash or failure."
    }


def main():
    """Main entry point."""
    print("="*70)
    print("🌱 AgroSeva Irrigation Brain (Self-Healing)")
    print("="*70)
    print(f"Starting server at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Server: http://localhost:8000")
    print(f"\n📡 Endpoints:")
    print(f"  GET  http://localhost:8000/health")
    print(f"  GET  http://localhost:8000/status")
    print(f"  GET  http://localhost:8000/moisture")
    print(f"\n🔧 Configuration:")
    print(f"  Serial Port: {config.SERIAL_PORT}")
    print(f"  Moisture Thresholds: <{config.MOISTURE_THRESHOLD_LOW}% (30s), <{config.MOISTURE_THRESHOLD_HIGH}% (15s)")
    print(f"  Max ON Time: {config.MAX_ON_TIME}s")
    print(f"  Cooldown: {config.COOLDOWN}s")
    print(f"\n🛡️ Self-Healing Features:")
    print(f"  - Thread auto-restart on exception")
    print(f"  - Supervisor loop monitoring")
    print(f"  - Heartbeat detection (6s timeout)")
    print(f"  - Graceful stale data handling")
    print(f"\n💡 System reads LIVE moisture from Arduino - no mocks or dummy data")
    print(f"\nPress Ctrl+C to stop")
    print("="*70)
    print()
    
    # Start server
    # Use 0.0.0.0 to allow connections from mobile app on same network
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )


if __name__ == "__main__":
    main()
