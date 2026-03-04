# AgroSeva - Smart Irrigation System

**Complete integrated project for autonomous smart irrigation with live hardware integration.**

## 🎯 Project Overview

This is a **fully integrated smart irrigation system** that combines:
- **Arduino hardware** for sensor reading and relay control
- **Python backend (FastAPI)** for autonomous decision-making
- **React Native mobile app (Expo)** for real-time monitoring and farm management

### Architecture: "Laptop as Brain, Arduino as Executor"

The system follows a **distributed intelligence architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    LAPTOP (Brain)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  FastAPI Server (Python)                         │  │
│  │  - Reads live sensor data from Arduino            │  │
│  │  - Makes autonomous irrigation decisions          │  │
│  │  - Controls relay via Arduino                     │  │
│  │  - Exposes REST API for mobile app                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↑ Serial (USB)                    ↓ Serial (USB)
    ┌────────────┐                    ┌────────────┐
    │  Arduino   │                    │  Arduino   │
    │  (Sensor)   │                    │ (Relay)  │
    │  Reads A0   │                    │ Controls │
    │  Moisture   │                    │  Motor   │
    └────────────┘                    └────────────┘
```

**Key Principle:** 
- **Laptop = Intelligence** (decision-making, data processing, API)
- **Arduino = Executor** (sensor reading, relay control)
- **Mobile App = Interface** (monitoring, visualization, farm management)

## 📁 Project Structure

```
merged_final/
├── backend/              # Python FastAPI server
│   ├── server/          # Main server code
│   │   ├── server.py    # FastAPI app entry point
│   │   ├── routes.py    # API endpoints
│   │   ├── serial_reader.py  # Arduino serial communication
│   │   ├── relay_controller.py  # Relay control
│   │   ├── agent.py     # Decision-making logic
│   │   └── ...
│   ├── config.py        # System configuration
│   ├── requirements.txt # Python dependencies
│   └── run_server.py    # Entry point
│
├── arduino/             # Arduino sketches
│   ├── arduino_sketch.ino  # Main sketch (moisture + relay)
│   └── soil_moisture_relay.ino  # Alternative sketch
│
├── app/                 # React Native mobile app (Expo)
│   ├── src/
│   │   ├── screens/     # UI screens
│   │   ├── store/       # State management (Zustand)
│   │   ├── services/    # Business logic
│   │   ├── config/      # API configuration
│   │   └── ...
│   ├── package.json     # Node dependencies
│   └── App.tsx          # App entry point
│
├── README.md            # This file
├── RUN_ORDER.md         # Step-by-step demo instructions
└── API_CONTRACT.md      # API endpoint documentation
```

## 🚀 Quick Start

### Prerequisites

1. **Arduino IDE** (for uploading sketch)
2. **Python 3.8+** (for backend)
3. **Node.js 18+** (for mobile app)
4. **Expo CLI** (for mobile app)
5. **Arduino hardware:**
   - Arduino Uno/Nano
   - Moisture sensor (analog)
   - Relay module
   - DC motor/pump (optional for demo)

### Step 1: Upload Arduino Sketch

1. Open `arduino/arduino_sketch.ino` in Arduino IDE
2. Select your board and port
3. Upload sketch
4. **Note:** Arduino runs independently - no IDE needed at runtime

### Step 2: Start Backend

```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

Backend will start at `http://0.0.0.0:8000` (accessible from mobile app)

### Step 3: Configure Mobile App API

Edit `app/src/config/api.ts`:
```typescript
export const LAPTOP_IP_ADDRESS = 'http://<YOUR_LAPTOP_IP>:8000';
```

**Find your laptop IP:**
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### Step 4: Start Mobile App

```bash
cd app
npm install
npm start
```

Scan QR code with Expo Go app on your phone.

## 🔧 System Components

### Backend (Python FastAPI)

- **Serial Reader:** Continuously reads moisture data from Arduino
- **Agent/Decision Engine:** Makes autonomous irrigation decisions
- **Relay Controller:** Sends commands to Arduino to control relay
- **Safety Manager:** Enforces safety limits (max duration, cooldown)
- **REST API:** Exposes endpoints for mobile app

### Arduino

- **Sensor Reading:** Reads moisture sensor on A0, sends "MOISTURE:42" via Serial
- **Relay Control:** Receives "ON"/"OFF" commands, controls relay on D7
- **No Logic:** Arduino is executor only - all intelligence on laptop

### Mobile App (React Native/Expo)

- **Real-time Monitoring:** Polls `/moisture` endpoint every 2 seconds
- **Farm Management:** Zones, crops, recommendations
- **Supabase Integration:** User authentication, data persistence
- **UI/UX:** Modern, responsive interface

## 📡 API Endpoints

See `API_CONTRACT.md` for complete endpoint documentation.

**Key Endpoints:**
- `GET /health` - Health check
- `GET /status` - System status (includes moisture, pH, temperature)
- `GET /moisture` - Latest live moisture reading

## 🧠 Autonomous Decision Logic

The backend agent makes irrigation decisions based on live moisture readings:

- **IF moisture < 25%** → IRRIGATE for 30 seconds
- **IF 25% ≤ moisture < 35%** → IRRIGATE for 15 seconds
- **IF moisture >= 35%** → DO_NOTHING

**Future:** This rule-based logic is a placeholder for a Deep Reinforcement Learning (DRL) agent that will learn optimal irrigation strategies.

## 🛡️ Safety Features

- **Maximum Duration:** 30 seconds (prevents over-irrigation)
- **Cooldown Period:** 10 seconds (prevents rapid cycling)
- **Emergency Stop:** Can block all irrigation
- **Auto-Off:** Relay automatically turns OFF after duration

## 📊 Data Flow

1. **Arduino** reads moisture sensor → sends "MOISTURE:42" via Serial
2. **Backend Serial Reader** receives data → updates state
3. **Backend Agent** evaluates moisture → makes decision
4. **Backend Relay Controller** sends "ON\n" to Arduino → relay activates
5. **Mobile App** polls `/moisture` → displays live data

## 🔍 Verification Checklist

After setup, verify:

- [ ] Arduino sends live moisture readings (check Serial Monitor)
- [ ] Backend logs changing moisture values
- [ ] `GET /moisture` returns live values
- [ ] App UI updates moisture in real time
- [ ] No mocks, random values, or fake sensors remain
- [ ] Backend runs independently of frontend
- [ ] App runs independently of backend

## 🎓 For Judges/Demonstration

**"This system demonstrates an autonomous intelligent agent for smart irrigation."**

**Key Points:**
- **Autonomous:** No manual control - decisions based on live sensor data
- **Intelligent:** Agent evaluates conditions and makes optimal decisions
- **Real-time:** Live data from hardware, no mocks or simulations
- **Scalable:** Easy to add more sensors, zones, and crops
- **Industry-Ready:** Architecture used in commercial systems

## 📝 Configuration

### Backend Configuration

Edit `backend/server/config.py`:
```python
SERIAL_PORT = "COM6"  # Your Arduino port
MOISTURE_THRESHOLD_LOW = 25.0
MOISTURE_THRESHOLD_HIGH = 35.0
```

### Mobile App Configuration

Edit `app/src/config/api.ts`:
```typescript
export const LAPTOP_IP_ADDRESS = 'http://<YOUR_LAPTOP_IP>:8000';
```

## 🐛 Troubleshooting

### Backend can't connect to Arduino
- Check `SERIAL_PORT` in `backend/server/config.py`
- Ensure Arduino is connected and sketch is uploaded
- Check Serial Monitor in Arduino IDE

### Mobile app can't reach backend
- Verify `LAPTOP_IP_ADDRESS` in `app/src/config/api.ts`
- Ensure laptop and phone are on same WiFi network
- Check firewall settings on laptop
- Backend must bind to `0.0.0.0` (not `127.0.0.1`)

### No moisture data in app
- Check backend logs for serial communication
- Verify Arduino is sending "MOISTURE:XX" format
- Check network connectivity between app and backend

## 📚 Additional Documentation

- `RUN_ORDER.md` - Step-by-step demo instructions
- `API_CONTRACT.md` - Complete API documentation
- `backend/README.md` - Backend-specific documentation

## 🔮 Future Enhancements

- **DRL Agent:** Replace rule-based logic with trained DRL agent
- **More Sensors:** pH, temperature, NPK sensors (already supported in backend)
- **Multi-Zone:** Support multiple irrigation zones
- **Weather Integration:** Use weather forecasts in decisions
- **Cloud Sync:** Sync data to cloud for historical analysis

## 📄 License

This project is part of a hackathon submission.

---

**Built with ❤️ for smart agriculture**

