# AgroSeva Irrigation Brain

**Autonomous irrigation decision system that reads live sensor data from Arduino and makes intelligent decisions.**

## 🎯 System Overview

This system demonstrates an **autonomous intelligent agent** for smart irrigation:

```
Arduino Sensor → Serial Reader → Sensor Store → Agent → Relay Controller → Motor
```

**Key Principle:** The laptop runs the intelligence; the Arduino executes actions.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Laptop (Python)                 │
│  ┌──────────────────────────────────┐   │
│  │  Serial Reader (background)      │   │
│  │  Reads: "MOISTURE:42"            │   │
│  └──────────────┬───────────────────┘   │
│                 ↓                        │
│  ┌──────────────────────────────────┐   │
│  │  Sensor Store                     │   │
│  │  Stores latest values             │   │
│  └──────────────┬───────────────────┘   │
│                 ↓                        │
│  ┌──────────────────────────────────┐   │
│  │  Agent (Decision Loop)            │   │
│  │  IF moisture < 25% → IRRIGATE 30s│   │
│  │  IF 25-35% → IRRIGATE 15s        │   │
│  │  ELSE → DO_NOTHING                │   │
│  └──────────────┬───────────────────┘   │
│                 ↓                        │
│  ┌──────────────────────────────────┐   │
│  │  Relay Controller                │   │
│  │  Sends: "ON\n" / "OFF\n"         │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
         ↑                    ↓
    Arduino Sensor      Arduino Relay
    (A0 - Moisture)     (D7 - Motor)
```

## 🚀 Quick Start (3 Commands)

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure System

Edit `config.py`:
```python
SERIAL_PORT = "COM6"  # Change to your Arduino port
```

### 3. Run Server

```bash
python server.py
```

**That's it!** The system will:
- Connect to Arduino
- Read moisture sensor data
- Make autonomous decisions
- Control relay automatically

## 📡 API Endpoints

### GET /health

Health check endpoint.

```bash
curl http://localhost:8000/health
```

### GET /status

Get comprehensive system status.

```bash
curl http://localhost:8000/status
```

**Response:**
```json
{
  "status": "running",
  "sensor_data": {
    "moisture": 42.5,
    "ph": null,
    "temperature": null
  },
  "relay_state": {
    "is_on": false,
    "connected": true
  },
  "last_decision": {
    "action": "DO_NOTHING",
    "duration": 0,
    "reason": "Soil moisture adequate (moisture 42.5% >= 35%)"
  },
  "safety_status": { ... }
}
```

### POST /inject-sensor

Inject sensor data for demo/testing (optional).

```bash
curl -X POST http://localhost:8000/inject-sensor \
  -H "Content-Type: application/json" \
  -d '{
    "moisture": 22.0,
    "ph": 5.6,
    "temperature": 32.0
  }'
```

## 🧠 Agent Decision Logic - Deep Reinforcement Learning (DRL)

The system uses a **Deep Q-Network (DQN)** agent trained with Deep Reinforcement Learning to make optimal irrigation decisions.

### DRL Formulation

#### State Space (3-dimensional, normalized)
- **soil_moisture**: 0.0-1.0 (0% = completely dry, 1.0 = 100% saturated)
- **irrigation_on**: 0.0 or 1.0 (boolean: is irrigation currently active)
- **time_since_last_irrigation**: 0.0-1.0 (normalized: 0 = just irrigated, 1.0 = max time)

#### Action Space (Discrete, 3 actions)
- **0**: DO_NOTHING (no irrigation)
- **1**: IRRIGATE_15S (irrigate for 15 seconds)
- **2**: IRRIGATE_30S (irrigate for 30 seconds)

#### Reward Function
- **+1.0** if moisture in optimal range (35-60%) - encourages maintaining healthy soil
- **-1.0** if moisture < 25% (too dry) - penalizes under-irrigation
- **-0.5** if moisture > 70% (too wet) - penalizes over-irrigation
- **-0.2** for any irrigation action - water cost penalty
- **-2.0** if irrigating while already wet (>60%) - waste penalty

The agent learns to maximize cumulative reward by:
- Maintaining optimal soil moisture (35-60%)
- Avoiding over-irrigation (water waste)
- Avoiding under-irrigation (crop stress)
- Minimizing unnecessary irrigation actions

### Why DQN?

**Deep Q-Network (DQN)** is ideal for irrigation decision-making because:

1. **Discrete Actions**: Irrigation durations are naturally discrete (15s, 30s, or nothing)
2. **State Complexity**: Neural networks can learn complex relationships between moisture, irrigation state, and timing
3. **Experience Replay**: Learns from past experiences efficiently
4. **Offline Training**: Train once, deploy many times (no training during live operation)
5. **Stability**: Proven algorithm for discrete action spaces

### Training (Offline)

**Training is done OFFLINE before deployment:**

```bash
# Train the DQN agent (~5-10 minutes)
python backend/drl/train.py
```

**Training Process:**
1. Creates `IrrigationEnv` environment with realistic moisture dynamics
2. Initializes DQN neural network (2 hidden layers, 128 neurons each)
3. Uses epsilon-greedy exploration (starts random, becomes more greedy)
4. Experience replay buffer stores (state, action, reward, next_state) tuples
5. Updates Q-network using Bellman equation
6. Saves trained model to `backend/drl/policy.pth`

**Training Output:**
- Model saved to `backend/drl/policy.pth`
- Reward progression logged to console
- Training takes ~5-10 minutes (500 episodes)

### Inference (Online)

**Inference is done ONLINE during live operation:**

1. **State Building**: System builds state vector from:
   - Live Arduino moisture reading (normalized 0-1)
   - Current irrigation state (ON/OFF)
   - Time since last irrigation (normalized 0-1)

2. **Action Prediction**: DRL policy predicts optimal action:
   - Loads trained model from `policy.pth`
   - Passes state through neural network
   - Returns action with highest Q-value

3. **Action Execution**: Action converted to irrigation duration:
   - Action 0 → DO_NOTHING (0 seconds)
   - Action 1 → IRRIGATE_15S (15 seconds)
   - Action 2 → IRRIGATE_30S (30 seconds)

4. **Safety Enforcement**: Safety limits ALWAYS enforced:
   - Max ON time (30 seconds)
   - Cooldown period (10 seconds)
   - DRL never bypasses safety

### Fallback Behavior

If trained model is not available, system automatically falls back to rule-based logic:
- **IF moisture < 25%** → IRRIGATE for 30 seconds
- **IF 25% ≤ moisture < 35%** → IRRIGATE for 15 seconds
- **IF moisture >= 35%** → DO_NOTHING

This ensures the system always works, even without a trained model.

### DRL Module Structure

```
backend/drl/
├── __init__.py      # Module exports
├── env.py           # IrrigationEnv (Gym-style environment)
├── dqn.py           # DQN neural network + ReplayBuffer
├── train.py         # Offline training script
├── policy.py        # Inference-only policy loader
└── policy.pth       # Trained model (generated after training)
```

### Usage

**Step 1: Train the model (once)**
```bash
cd backend
python -m drl.train
```

**Step 2: Run the server (uses trained model)**
```bash
python -m server.server
```

The server will automatically:
- Load the trained DRL policy
- Build state from live Arduino data
- Use DRL to make decisions
- Fall back to rule-based if model not available

## 🔌 Arduino Setup

### Wiring

```
Moisture Sensor:
  Signal → A0
  VCC → 5V
  GND → GND

Relay Module:
  IN → D7
  VCC → 5V
  GND → GND
  NO/COM → DC Motor/Pump
```

### Upload Sketch

1. Open `arduino/arduino_sketch.ino` in Arduino IDE
2. Select your Arduino board and port
3. Upload sketch
4. **No Arduino IDE needed at runtime** - Arduino just executes

### Arduino Behavior

- **Sends:** "MOISTURE:42" every 2 seconds
- **Sends:** "HB:<uptime_ms>" every 2 seconds (heartbeat)
- **Receives:** "ON:<duration_ms>\n" or "OFF\n" to control relay
- **Relay:** Active LOW (LOW = ON, HIGH = OFF)
- **Watchdog:** 4 second timeout (auto-reset on freeze)
- **Heartbeat Timeout:** 10 seconds (auto-reset on communication loss)

## 📊 Demo Flow Explanation

### For Judges/Demonstration

**"This system demonstrates an autonomous intelligent agent for smart irrigation."**

1. **Sensor Reading:** Arduino reads moisture sensor on A0
2. **Data Transmission:** Arduino sends "MOISTURE:42" via Serial
3. **Agent Evaluation:** Laptop agent evaluates moisture level
4. **Automatic Decision:** 
   - If dry → Agent decides IRRIGATE
   - If adequate → Agent decides DO_NOTHING
5. **Automatic Action:** 
   - If IRRIGATE → Laptop sends "ON\n" to Arduino
   - Arduino turns relay ON → Motor runs
   - After duration → Laptop sends "OFF\n" → Motor stops
6. **No Manual Control:** Everything is autonomous

**Key Points:**
- Laptop runs intelligence (decision-making)
- Arduino executes actions (sensor reading, relay control)
- System is sensor-agnostic (easy to add pH, temperature)
- Future-ready (will use DRL for optimal decisions)

## 🔧 Configuration

Edit `config.py` to customize:

```python
SERIAL_PORT = "COM6"                    # Arduino serial port
MOISTURE_THRESHOLD_LOW = 25.0          # Below this → 30s irrigation
MOISTURE_THRESHOLD_HIGH = 35.0         # Below this → 15s irrigation
IRRIGATION_DURATION_LONG = 30         # Seconds when very dry
IRRIGATION_DURATION_SHORT = 15        # Seconds when moderately dry
MAX_ON_TIME = 30                      # Safety limit (seconds)
COOLDOWN = 10                         # Cooldown between irrigations
```

## 🛡️ Safety Features

- **Maximum Duration:** 30 seconds (prevents over-irrigation)
- **Cooldown Period:** 10 seconds (prevents rapid cycling)
- **Emergency Stop:** Can block all irrigation
- **Auto-Off:** Relay automatically turns OFF after duration
- **Thread-Safe:** All operations are thread-safe

## 🔄 Self-Healing Architecture

**CRITICAL FOR AGRICULTURE:** This system automatically recovers from ANY crash, freeze, serial failure, or power glitch — without user interaction.

### Why Self-Healing is Critical

In agricultural applications, system failures can lead to:
- **Crop loss** from over-irrigation or under-irrigation
- **Water waste** from stuck relays
- **Equipment damage** from continuous operation
- **Data loss** from communication failures

**This system guarantees safe recovery from any failure scenario.**

### Part 1: Arduino Auto-Restart (Hardware Watchdog)

The Arduino firmware includes multiple fail-safe mechanisms:

#### Hardware Watchdog Timer (WDT)
- **Timeout:** 4 seconds
- **Behavior:** If `loop()` freezes or blocks for >4 seconds, Arduino automatically resets
- **Protection:** Prevents infinite loops, deadlocks, or software freezes
- **Implementation:** Uses `avr/wdt.h` library

```cpp
// Watchdog reset at start of every loop iteration
wdt_reset();

// If loop() freezes, watchdog resets Arduino in 4 seconds
// Relay defaults to OFF on boot (safe state)
```

#### Software Heartbeat Timeout
- **Timeout:** 10 seconds
- **Behavior:** If no valid command received for 10 seconds, Arduino:
  1. Turns relay OFF (safe state)
  2. Triggers watchdog reset (recovery)
- **Protection:** Detects communication loss and recovers automatically

#### Relay Lock-ON Protection
- **Firmware Max ON Time:** 30 seconds (hard limit)
- **Behavior:** Even if laptop crashes, Arduino firmware enforces max ON time
- **Protection:** Relay NEVER stays ON forever, even if software fails

#### Safe Boot State
- **On Reset:** Relay defaults to OFF
- **Boot Message:** Clear indication of system state
- **Protection:** System always starts in safe state

### Part 2: Serial Fail-Safe Protocol

#### Heartbeat Messages
- **Format:** `HB:<uptime_ms>`
- **Frequency:** Every 2 seconds
- **Purpose:** Laptop detects if Arduino is alive

#### Command Protocol
- **Valid Commands:**
  - `ON:<duration_ms>\n` → Turn relay ON for duration (milliseconds)
  - `OFF\n` → Turn relay OFF immediately
- **Malformed Commands:** Ignored (fail-safe)
- **Heartbeat Loss Detection:** If heartbeat missing >6 seconds, laptop assumes Arduino failure

#### Communication Loss Handling
- **Laptop Behavior:** Stops sending ON commands if heartbeat lost
- **Arduino Behavior:** Turns relay OFF and resets if no command for 10 seconds
- **Recovery:** Automatic reconnection when communication restored

### Part 3: Python Server Self-Healing

#### Thread Auto-Restart
- **Serial Reader Thread:** Wrapped in try/except, auto-restarts on exception
- **Decision Loop Thread:** Wrapped in try/except, auto-restarts on exception
- **Never Crashes:** All threads have recovery wrappers

```python
def _read_loop_with_recovery(self):
    while self.running:
        try:
            self._read_loop()
        except Exception as e:
            # Auto-restart on any exception
            print(f"[RECOVERY] Serial thread restarted: {e}")
            time.sleep(3)
            continue
```

#### Supervisor Loop
- **Purpose:** Monitors all background threads
- **Frequency:** Checks every 5 seconds
- **Actions:**
  - Detects dead threads
  - Restarts dead threads automatically
  - Logs thread health status
- **Never Crashes:** Supervisor itself wrapped in try/except

#### Serial Reader Auto-Reconnect
- **Behavior:** If COM port disconnects, retries every 3 seconds
- **Never Crashes:** All connection errors handled gracefully
- **Recovery:** Automatic reconnection when Arduino reconnected

#### Stale Data Handling
- **Detection:** Data older than 10 seconds = stale
- **Behavior:** Decision loop does NOTHING (safe state)
- **Never Crashes:** Stale data handled gracefully, no exceptions

### Part 4: System-Level Safety Guarantees

**These guarantees MUST be true:**

1. **Relay NEVER stays ON if software crashes**
   - Hardware watchdog resets Arduino (4s timeout)
   - Firmware enforces max ON time (30s hard limit)
   - Relay defaults to OFF on boot

2. **Arduino always recovers from freezes**
   - Hardware watchdog timer (4s timeout)
   - Software heartbeat timeout (10s timeout)
   - Automatic reset and recovery

3. **Laptop can be unplugged and replugged**
   - Serial reader auto-reconnects (retries every 3s)
   - Thread auto-restart on exception
   - Supervisor loop monitors and recovers

4. **Serial cable can be removed mid-operation**
   - Arduino detects communication loss (10s timeout)
   - Arduino turns relay OFF and resets
   - Laptop detects heartbeat loss (>6s timeout)
   - Laptop stops sending commands
   - Automatic recovery when cable reconnected

5. **System returns to safe state automatically**
   - Relay OFF on boot
   - Relay OFF on communication loss
   - Relay OFF on watchdog reset
   - Decision loop does NOTHING with stale data

### Recovery Logging

All recovery actions are clearly logged:

```
[RECOVERY] Serial thread exception (restart #1): SerialException
[RECOVERY] Serial thread will restart in 3 seconds...
[RECOVERY] Serial thread restarted

[SUPERVISOR] ⚠️ Serial reader thread is dead - restarting...
[SUPERVISOR] ✅ Serial reader thread restarted

[DECISION] ⚠️ Sensor data is stale (15.2s old) - waiting for fresh data...
```

### Testing Self-Healing

**Test Scenarios:**

1. **Unplug Arduino USB:**
   - Laptop detects heartbeat loss
   - Laptop stops sending commands
   - Arduino turns relay OFF (10s timeout)
   - Arduino resets (watchdog)
   - Reconnect: System auto-recovers

2. **Kill Python Process:**
   - Arduino detects no commands (10s timeout)
   - Arduino turns relay OFF
   - Arduino resets (watchdog)
   - Restart Python: System auto-recovers

3. **Freeze Arduino (infinite loop):**
   - Hardware watchdog resets Arduino (4s timeout)
   - Relay defaults to OFF on boot
   - System continues normally

4. **Crash Python Thread:**
   - Supervisor detects dead thread
   - Supervisor restarts thread automatically
   - System continues normally

**All scenarios result in safe recovery without user intervention.**

## 🔮 DRL Upgrade Path

### Current: Rule-Based Agent

- Hardcoded thresholds (25%, 35%)
- Fixed durations (15s, 30s)
- Simple IF/ELSE logic

### Future: Reward-Based DRL

1. **State Space:** Sensor readings (moisture, pH, temperature, history)
2. **Action Space:** Irrigation duration (0-60 seconds)
3. **Reward Function:**
   - Positive: Optimal moisture, water efficiency, crop yield
   - Negative: Over-irrigation, under-irrigation, crop stress
4. **Training:** Agent learns from experience
5. **Deployment:** Replace rule-based agent with trained DRL agent

**The sensor-agnostic design ensures DRL can use any sensor data without code changes.**

## 📝 System Behavior

### Automatic Operation

1. **Serial Reader** continuously reads Arduino output
2. **Sensor Store** updates with latest values
3. **Decision Loop** checks for new data every 2 seconds
4. **Agent** evaluates sensor data
5. **Relay Controller** executes decision automatically
6. **Safety Manager** enforces limits

### No Manual Control

- ❌ No "start irrigation" button
- ❌ No "stop irrigation" button
- ❌ No manual override endpoints
- ✅ Everything triggered by sensor data

## 🧪 Testing

### Test Without Arduino

Use `POST /inject-sensor` to inject test data:

```bash
# Dry soil
curl -X POST http://localhost:8000/inject-sensor \
  -H "Content-Type: application/json" \
  -d '{"moisture": 22.0}'

# Adequate moisture
curl -X POST http://localhost:8000/inject-sensor \
  -H "Content-Type: application/json" \
  -d '{"moisture": 45.0}'
```

### Test With Arduino

1. Upload `arduino/arduino_sketch.ino` to Arduino
2. Connect moisture sensor to A0
3. Connect relay to D7
4. Start server: `python server.py`
5. Watch console for sensor readings and decisions

## 📚 Code Structure

- `server.py`: FastAPI app with background threads
- `agent.py`: Decision-making logic
- `serial_reader.py`: Arduino serial reading (background thread)
- `relay_controller.py`: Relay control via serial
- `sensor_store.py`: Thread-safe sensor data storage
- `safety.py`: Safety limits and checks
- `config.py`: System configuration
- `schemas.py`: Pydantic models
- `arduino/arduino_sketch.ino`: Arduino code

## ⚠️ Important Notes

1. **Arduino is Executor Only:** Arduino reads sensors and controls relay - no logic
2. **Laptop is Brain:** All intelligence runs on laptop
3. **Sensor-Driven:** No manual control - everything triggered by sensor data
4. **Extensible:** Easy to add more sensors (pH, temperature, etc.)
5. **Future-Ready:** Designed for DRL integration

## 🎓 For Judges

This system demonstrates:
- **Autonomous Decision-Making:** Agent evaluates and acts without human intervention
- **Intelligent Behavior:** Decisions based on live sensor data
- **Safety:** Multiple safety layers prevent dangerous operations
- **Scalability:** Easy to extend with more sensors and zones
- **Industry-Ready:** Architecture used in commercial systems

**The system looks and behaves like an intelligent agent, not a switch.**

## 🔄 Extending for More Sensors

To add pH or temperature:

1. **Arduino:** Add sensor reading and send "PH:6.5" or "TEMP:25.0"
2. **Serial Reader:** Already parses any "SENSOR:value" format
3. **Sensor Store:** Already stores any sensor type
4. **Agent:** Can use new sensors in decision logic
5. **No other changes needed!**

The system is **sensor-agnostic** by design.

