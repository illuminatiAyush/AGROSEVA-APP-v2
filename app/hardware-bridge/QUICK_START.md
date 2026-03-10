# Quick Start Guide

## 1. Install Dependencies
```bash
cd hardware-bridge
npm install
```

## 2. Find Your Arduino COM Port

**Windows:**
- Open Device Manager → Ports (COM & LPT)
- Look for "Arduino" or "USB Serial Port"
- Note the COM number (e.g., COM3)

**Mac/Linux:**
- Run: `ls /dev/tty.usbserial-*` or `ls /dev/ttyUSB*`
- Note the port name

## 3. Start the Bridge

**Option A: Set COM port via environment variable**
```bash
# Windows PowerShell
$env:COM_PORT="COM3"; npm start

# Windows CMD
set COM_PORT=COM3 && npm start

# Mac/Linux
COM_PORT=/dev/tty.usbserial-1410 npm start
```

**Option B: Edit server.js**
Change line 30: `const COM_PORT = 'COM3';`

Then run:
```bash
npm start
```

## 4. Verify It's Working

You should see:
```
✅ Serial port COM3 opened successfully
📊 Waiting for Arduino data...
🌐 HTTP server running on http://localhost:3000
```

When Arduino sends data:
```
📥 Received: {"pH":5.12,"timestamp":123456}
✅ Valid pH reading: 5.1
```

## 5. Enable in App

Update `src/hardware/HardwareConfig.ts`:
```typescript
const USE_REAL_HARDWARE = true; // Change to true
```

The app will now fetch from `http://localhost:3000/ph`!

## Troubleshooting

- **"Failed to open serial port"** → Close Arduino IDE, check COM port
- **"No sensor data available"** → Arduino not sending data yet
- **Port already in use** → Close other programs using the serial port

See README.md for detailed troubleshooting.

