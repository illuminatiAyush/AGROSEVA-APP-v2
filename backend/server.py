"""
AgroSeva Irrigation Brain Server

FastAPI server with background threads for:
- Reading sensor data from Arduino (serial_reader)
- Making autonomous irrigation decisions (decision loop)
- Controlling relay via Arduino (relay_controller)

Architecture:
Sensor (Arduino) → Serial Reader → Sensor Store → Agent → Relay Controller → Motor
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uvicorn
import threading
import time

import config
from schemas import SensorData, InjectSensorRequest, DecisionResponse, StatusResponse
from sensor_store import SensorStore
from serial_reader import SerialReader
from relay_controller import RelayController
from safety import SafetyManager
from agent import decide_action


# Initialize FastAPI app
app = FastAPI(
    title="AgroSeva Irrigation Brain",
    description="Autonomous irrigation decision system - reads Arduino sensors, makes decisions, controls relay",
    version="1.0.0"
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
sensor_store = SensorStore()
serial_reader = SerialReader(sensor_store)
relay_controller = RelayController()
safety_manager = SafetyManager()

# Decision loop control
_decision_loop_running = False
_decision_loop_thread: threading.Thread = None
_last_processed_moisture: float = None


def start_decision_loop():
    """Start background thread for autonomous decision-making."""
    global _decision_loop_running, _decision_loop_thread
    
    if _decision_loop_running:
        return
    
    _decision_loop_running = True
    _decision_loop_thread = threading.Thread(target=_decision_worker, daemon=True)
    _decision_loop_thread.start()
    print("[DECISION] Started decision loop thread")


def _decision_worker():
    """Background worker that continuously evaluates sensor data and makes decisions."""
    global _last_processed_moisture
    
    print("[DECISION] Decision loop running - monitoring sensor data...")
    
    while _decision_loop_running:
        try:
            # Get latest moisture reading
            moisture = sensor_store.get_moisture()
            
            # Only process if we have new data
            if moisture is not None and moisture != _last_processed_moisture:
                _last_processed_moisture = moisture
                
                # Get all sensor data
                sensor_data = sensor_store.get_all()
                
                # Agent makes decision
                decision = decide_action(sensor_data)
                
                print(f"\n{'='*60}")
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 🧠 Agent Decision")
                print(f"{'='*60}")
                print(f"  Sensor Data: {sensor_data}")
                print(f"  Decision: {decision['action']}")
                print(f"  Duration: {decision['duration']}s")
                print(f"  Reason: {decision['reason']}")
                
                # Execute decision if IRRIGATE
                if decision["action"] == "IRRIGATE":
                    duration = decision["duration"]
                    
                    # Check safety limits
                    can_irrigate, reason = safety_manager.check_can_irrigate(duration)
                    
                    if can_irrigate:
                        # Turn relay ON for duration
                        if relay_controller.turn_on_for(duration):
                            safety_manager.record_irrigation_start(duration)
                            print(f"  ✅ Relay activated - irrigating for {duration} seconds")
                        else:
                            print(f"  ⚠️ Relay activation failed")
                    else:
                        print(f"  ⚠️ Irrigation blocked by safety: {reason}")
                elif decision["action"] == "DO_NOTHING":
                    # Ensure relay is OFF
                    if relay_controller.is_on:
                        relay_controller.turn_off()
                        safety_manager.record_irrigation_end()
                        print(f"  ✅ Relay turned OFF (DO_NOTHING decision)")
                    print(f"  ℹ️ No irrigation needed")
                
                print(f"{'='*60}\n")
            
            # Wait before next check
            time.sleep(config.DECISION_INTERVAL)
            
        except Exception as e:
            print(f"[DECISION] ❌ Error in decision loop: {e}")
            time.sleep(config.DECISION_INTERVAL)


@app.on_event("startup")
async def startup_event():
    """Initialize system on startup."""
    print("\n" + "="*70)
    print("🌱 AgroSeva Irrigation Brain - Starting System")
    print("="*70)
    
    # Start serial reader
    serial_reader.start()
    print("[INIT] Serial reader started")
    
    # Start decision loop
    start_decision_loop()
    print("[INIT] Decision loop started")
    
    print("[INIT] ✅ System ready!")
    print("="*70 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global _decision_loop_running
    
    print("\n[SHUTDOWN] Stopping system...")
    _decision_loop_running = False
    serial_reader.stop()
    relay_controller.turn_off()
    relay_controller.disconnect()
    print("[SHUTDOWN] System stopped")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "serial_connected": serial_reader.is_connected(),
        "sensor_data_available": sensor_store.has_data()
    }


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """
    Get system status.
    
    Returns:
        - Latest sensor data
        - Current relay state
        - Last decision made
        - Safety manager status
    """
    # Get sensor data
    sensor_data = None
    if sensor_store.has_data():
        all_data = sensor_store.get_all()
        sensor_data = SensorData(
            moisture=all_data.get("moisture"),
            ph=all_data.get("ph"),
            temperature=all_data.get("temperature")
        )
    
    # Get last decision (if we have moisture data)
    last_decision = None
    if sensor_store.has_data():
        sensor_dict = sensor_store.get_all()
        decision = decide_action(sensor_dict)
        last_decision = DecisionResponse(
            action=decision["action"],
            duration=decision["duration"],
            reason=decision["reason"]
        )
    
    return StatusResponse(
        status="running",
        sensor_data=sensor_data,
        relay_state=relay_controller.get_status(),
        last_decision=last_decision,
        safety_status=safety_manager.get_status()
    )


@app.post("/inject-sensor")
async def inject_sensor(payload: InjectSensorRequest):
    """
    Inject sensor data (for demo/testing).
    
    This endpoint allows manual injection of sensor data for demonstrations.
    In production, data comes from Arduino via serial.
    
    Args:
        payload: Sensor data to inject
    """
    if not config.ENABLE_INJECT_SENSOR:
        raise HTTPException(status_code=403, detail="Sensor injection disabled")
    
    print(f"\n[INJECT] Manual sensor data injection")
    
    # Update sensor store
    if payload.moisture is not None:
        sensor_store.update_moisture(payload.moisture, source="inject")
        print(f"  Moisture: {payload.moisture}%")
    
    if payload.ph is not None:
        sensor_store.update("ph", payload.ph, source="inject")
        print(f"  pH: {payload.ph}")
    
    if payload.temperature is not None:
        sensor_store.update("temperature", payload.temperature, source="inject")
        print(f"  Temperature: {payload.temperature}°C")
    
    print(f"[INJECT] ✅ Sensor data injected - decision loop will process it\n")
    
    return {
        "status": "injected",
        "sensor_data": sensor_store.get_all()
    }


@app.get("/")
async def root():
    """Root endpoint - system information."""
    return {
        "system": "AgroSeva Irrigation Brain",
        "description": "Autonomous irrigation decision system",
        "architecture": "Sensor → Agent → Relay → Motor",
        "endpoints": {
            "GET /health": "Health check",
            "GET /status": "System status",
            "POST /inject-sensor": "Inject sensor data (demo/testing)"
        },
        "note": "System reads sensor data from Arduino and makes autonomous decisions"
    }


def main():
    """Main entry point."""
    print("="*70)
    print("🌱 AgroSeva Irrigation Brain")
    print("="*70)
    print(f"Starting server at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Server: http://localhost:8000")
    print(f"\n📡 Endpoints:")
    print(f"  GET  http://localhost:8000/health")
    print(f"  GET  http://localhost:8000/status")
    print(f"  POST http://localhost:8000/inject-sensor")
    print(f"\n🔧 Configuration:")
    print(f"  Serial Port: {config.SERIAL_PORT}")
    print(f"  Moisture Thresholds: <{config.MOISTURE_THRESHOLD_LOW}% (30s), <{config.MOISTURE_THRESHOLD_HIGH}% (15s)")
    print(f"  Max ON Time: {config.MAX_ON_TIME}s")
    print(f"  Cooldown: {config.COOLDOWN}s")
    print(f"\nPress Ctrl+C to stop")
    print("="*70)
    print()
    
    # Start server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )


if __name__ == "__main__":
    main()

