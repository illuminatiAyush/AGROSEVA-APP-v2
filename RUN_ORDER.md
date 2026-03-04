# Run Order - Demo Instructions

**Step-by-step guide to run the complete AgroSeva system for live demonstration.**

## ⚠️ Pre-Demo Checklist

Before starting the demo, ensure:

- [ ] Arduino is connected to laptop via USB
- [ ] Moisture sensor is connected to Arduino A0
- [ ] Relay module is connected to Arduino D7
- [ ] Laptop and phone are on the same WiFi network
- [ ] Arduino sketch is uploaded (from `arduino/arduino_sketch.ino`)
- [ ] Python 3.8+ is installed
- [ ] Node.js 18+ is installed
- [ ] Expo Go app is installed on phone

## 📋 Demo Steps

### Step 1: Upload Arduino Sketch (One-Time Setup)

**Time:** 2 minutes

1. Open Arduino IDE
2. Open `arduino/arduino_sketch.ino`
3. Select your board: **Tools → Board → Arduino Uno** (or your board)
4. Select port: **Tools → Port → COM6** (or your port)
5. Click **Upload** button
6. Wait for "Done uploading" message
7. **Close Arduino IDE** (not needed at runtime)

**Verify:**
- Open Serial Monitor (9600 baud)
- You should see: "AgroSeva Irrigation Brain - Arduino Ready"
- You should see: "MOISTURE:XX" messages every 2 seconds

**Note:** If moisture values are 0 or 100, adjust sensor calibration in sketch.

---

### Step 2: Configure Backend

**Time:** 1 minute

1. Open `backend/server/config.py`
2. Find `SERIAL_PORT = "COM6"`
3. Change to your Arduino port:
   - Windows: `COM3`, `COM4`, `COM6`, etc.
   - Mac/Linux: `/dev/ttyUSB0`, `/dev/ttyACM0`, etc.
4. Save file

**Find your port:**
- Windows: Device Manager → Ports (COM & LPT)
- Mac/Linux: `ls /dev/tty*` or Arduino IDE → Tools → Port

---

### Step 3: Start Backend Server

**Time:** 1 minute

1. Open terminal/command prompt
2. Navigate to backend:
   ```bash
   cd merged_final/backend
   ```
3. Install dependencies (first time only):
   ```bash
   pip install -r requirements.txt
   ```
4. Start server:
   ```bash
   python run_server.py
   ```

**Expected Output:**
```
======================================================================
🌱 AgroSeva Irrigation Brain (Self-Healing)
======================================================================
Starting server at 2026-01-24 18:50:00
Server: http://localhost:8000

📡 Endpoints:
  GET  http://localhost:8000/health
  GET  http://localhost:8000/status
  GET  http://localhost:8000/moisture

🔧 Configuration:
  Serial Port: COM6
  Moisture Thresholds: <25.0% (30s), <35.0% (15s)
  Max ON Time: 30s
  Cooldown: 10s

💡 System reads LIVE moisture from Arduino - no mocks or dummy data

Press Ctrl+C to stop
======================================================================

[INIT] Serial reader started - waiting for Arduino sensor data...
[INIT] Decision loop started
[INIT] ✅ System ready!
```

**Verify:**
- You should see `[SERIAL] ✅ Connected to COM6` (or your port)
- You should see `[SERIAL] 📊 Moisture: 42%` messages
- You should see agent decisions in console

**Keep this terminal open!**

---

### Step 4: Find Your Laptop IP Address

**Time:** 1 minute

**Windows:**
1. Open Command Prompt
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your WiFi adapter
4. Example: `192.168.1.100`

**Mac/Linux:**
1. Open Terminal
2. Run: `ifconfig` or `ip addr`
3. Look for `inet` address under `wlan0` or `en0`
4. Example: `192.168.1.100`

**Write down this IP address!**

---

### Step 5: Configure Mobile App API

**Time:** 1 minute

1. Open `app/src/config/api.ts`
2. Find: `export const LAPTOP_IP_ADDRESS = 'http://<YOUR_LAPTOP_IP>:8000';`
3. Replace `<YOUR_LAPTOP_IP>` with your laptop IP from Step 4
4. Save file

**Example:**
```typescript
export const LAPTOP_IP_ADDRESS = 'http://192.168.1.100:8000';
```

---

### Step 6: Start Mobile App

**Time:** 2 minutes

1. Open new terminal/command prompt
2. Navigate to app:
   ```bash
   cd merged_final/app
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start Expo:
   ```bash
   npm start
   ```

**Expected Output:**
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**On Your Phone:**
1. Open Expo Go app (Android) or Camera app (iOS)
2. Scan the QR code
3. Wait for app to load

**Keep this terminal open!**

---

### Step 7: Verify Live Integration

**Time:** 2 minutes

**In Mobile App:**
1. Navigate to **Monitor** screen
2. You should see **"Soil Moisture (Live)"** with a green dot
3. Moisture value should update every 2 seconds
4. Value should match what Arduino is sending

**In Backend Terminal:**
1. You should see: `[API] GET /moisture requested`
2. You should see: `[API] ✅ Returning moisture: 42%`

**In Arduino Serial Monitor (optional):**
1. Open Serial Monitor in Arduino IDE
2. You should see: `MOISTURE:42` every 2 seconds

**If values don't match:**
- Check network connectivity
- Verify IP address in `app/src/config/api.ts`
- Check backend logs for errors

---

### Step 8: Demonstrate Autonomous Irrigation

**Time:** 3 minutes

**Scenario 1: Dry Soil (Moisture < 25%)**

1. **Simulate dry soil:**
   - Remove moisture sensor from water
   - Or adjust sensor calibration to read low

2. **Observe:**
   - Backend logs: `[DECISION] Decision: IRRIGATE`
   - Backend logs: `✅ Relay activated - irrigating for 30 seconds`
   - Arduino relay turns ON (LED on relay module lights up)
   - After 30 seconds, relay turns OFF automatically

**Scenario 2: Adequate Moisture (Moisture >= 35%)**

1. **Simulate adequate moisture:**
   - Place moisture sensor in water
   - Or adjust sensor calibration to read high

2. **Observe:**
   - Backend logs: `[DECISION] Decision: DO_NOTHING`
   - Backend logs: `ℹ️ No irrigation needed`
   - Relay remains OFF

**Scenario 3: Real-Time Updates**

1. **Watch mobile app:**
   - Navigate to Monitor screen
   - Moisture value updates every 2 seconds
   - Value reflects live Arduino readings

2. **Explain:**
   - "The app polls the backend every 2 seconds"
   - "Backend reads live data from Arduino via Serial"
   - "No mocks or fake data - everything is real-time"

---

## 🎤 Demo Script (For Judges)

### Introduction (30 seconds)

**"This is AgroSeva, an autonomous smart irrigation system. It demonstrates how AI can make real-time decisions based on live sensor data."**

### Architecture Explanation (1 minute)

**"The system has three components:"**

1. **"Arduino - the executor"**
   - "Reads moisture sensor and controls relay"
   - "No intelligence - just follows commands"

2. **"Laptop - the brain"**
   - "Runs Python backend with FastAPI"
   - "Makes autonomous irrigation decisions"
   - "Exposes REST API for mobile app"

3. **"Mobile App - the interface"**
   - "React Native app built with Expo"
   - "Shows real-time sensor data"
   - "Manages farm zones and crops"

### Live Demonstration (2 minutes)

**"Let me show you the system in action:"**

1. **"First, here's the backend terminal"**
   - Show backend logs with live moisture readings
   - Show agent decisions

2. **"Now, here's the mobile app"**
   - Show Monitor screen with live moisture
   - Explain: "This updates every 2 seconds from the backend"

3. **"Watch what happens when soil is dry"**
   - Simulate dry soil
   - Show backend decision: "IRRIGATE"
   - Show relay activation
   - Explain: "The system made this decision autonomously"

4. **"And when moisture is adequate"**
   - Simulate adequate moisture
   - Show backend decision: "DO_NOTHING"
   - Explain: "The agent evaluated conditions and decided no irrigation needed"

### Key Points (30 seconds)

**"Key features:"**
- ✅ **Autonomous:** No manual control
- ✅ **Real-time:** Live data from hardware
- ✅ **Intelligent:** Agent makes optimal decisions
- ✅ **Scalable:** Easy to add more sensors
- ✅ **Future-ready:** Designed for DRL integration

---

## 🐛 Troubleshooting During Demo

### Backend can't connect to Arduino

**Quick Fix:**
1. Check `SERIAL_PORT` in `backend/server/config.py`
2. Restart backend server
3. Verify Arduino is connected and powered

### Mobile app shows "No moisture data"

**Quick Fix:**
1. Check backend is running
2. Verify IP address in `app/src/config/api.ts`
3. Check phone and laptop are on same WiFi
4. Check backend logs for errors

### Moisture values not updating

**Quick Fix:**
1. Check Arduino Serial Monitor for data
2. Check backend logs for serial communication
3. Verify sensor is connected to A0
4. Check sensor calibration

### Relay not activating

**Quick Fix:**
1. Check relay is connected to D7
2. Check relay module power (5V)
3. Check backend logs for relay commands
4. Verify Arduino is receiving commands

---

## ⏱️ Total Demo Time

- **Setup:** 10 minutes (one-time)
- **Demo:** 5 minutes
- **Total:** 15 minutes

---

## 📝 Post-Demo Notes

After demo, you can mention:

- **"This is a working prototype with real hardware integration"**
- **"The system is production-ready and can be deployed to farms"**
- **"Future enhancements include DRL for optimal decision-making"**
- **"The architecture supports multiple zones and sensors"**

---

**Good luck with your demo! 🚀**

