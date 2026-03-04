# Hardware Bridge - Arduino Serial to HTTP

## Overview

This is a **TEMPORARY** Node.js bridge that reads pH sensor data from Arduino via USB Serial and exposes it via HTTP endpoint.

**Purpose:** Allows the React Native app to receive live pH data from Arduino while developing, before ESP32 is ready.

**When ESP32 is ready:** Delete this bridge and update `src/hardware/HardwareConfig.ts` to point to ESP32 IP address.

---

## Installation

1. **Navigate to bridge directory:**
   ```bash
   cd hardware-bridge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Finding Your Arduino COM Port

### Windows
1. Open Device Manager
2. Look under "Ports (COM & LPT)"
3. Find "Arduino" or "USB Serial Port" - note the COM number (e.g., COM3, COM4)

### Mac
1. Open Terminal
2. Run: `ls /dev/tty.usbserial-*` or `ls /dev/ttyUSB*`
3. Note the port name (e.g., `/dev/tty.usbserial-1410`)

### Linux
1. Open Terminal
2. Run: `ls /dev/ttyUSB*` or `ls /dev/ttyACM*`
3. Note the port name (e.g., `/dev/ttyUSB0`)

---

## Configuration

### Option 1: Environment Variable (Recommended)
```bash
# Windows PowerShell
$env:COM_PORT="COM3"; npm start

# Windows CMD
set COM_PORT=COM3 && npm start

# Mac/Linux
COM_PORT=/dev/tty.usbserial-1410 npm start
```

### Option 2: Edit server.js
Update the `COM_PORT` constant in `server.js`:
```javascript
const COM_PORT = 'COM3'; // Change to your port
```

---

## Starting the Bridge

1. **Make sure Arduino is connected via USB**

2. **Start the bridge:**
   ```bash
   npm start
   ```

3. **You should see:**
   ```
   🔌 Starting Hardware Bridge...
   📡 Attempting to connect to COM3 at 9600 baud
   ✅ Serial port COM3 opened successfully
   📊 Waiting for Arduino data...
   🌐 HTTP server running on http://localhost:3000
   📡 Endpoint: GET http://localhost:3000/ph
   ```

4. **When Arduino sends data, you'll see:**
   ```
   📥 Received: {"pH":5.12,"timestamp":123456}
   ✅ Valid pH reading: 5.1 (timestamp: 123456)
   ```

---

## Testing

### Test HTTP Endpoint
```bash
# Using curl
curl http://localhost:3000/ph

# Expected response:
# {"pH":5.1,"timestamp":123456}
```

### Health Check
```bash
curl http://localhost:3000/health
```

---

## Arduino Code Requirements

Your Arduino must output JSON in this exact format:
```json
{"pH":5.12,"timestamp":123456}
```

**Important:**
- Each reading must be on a single line
- End with `\r\n` (newline)
- pH value must be a number (0-14)
- timestamp must be a number (milliseconds or seconds)

**Example Arduino code:**
```cpp
void loop() {
  float pHValue = readPH(); // Your sensor reading function
  unsigned long timestamp = millis();
  
  Serial.print("{\"pH\":");
  Serial.print(pHValue, 2);
  Serial.print(",\"timestamp\":");
  Serial.print(timestamp);
  Serial.println("}");
  
  delay(1000); // Send every second
}
```

---

## Troubleshooting

### "Failed to open serial port"
- ✅ Check Arduino is connected via USB
- ✅ Verify COM port is correct
- ✅ Close Arduino IDE (it locks the serial port)
- ✅ Close any other programs using the serial port
- ✅ Try a different USB cable/port

### "No sensor data available" (HTTP 503)
- ✅ Arduino is not sending data yet
- ✅ Check Arduino code is running
- ✅ Verify baud rate matches (9600)
- ✅ Check serial monitor in Arduino IDE to see if data is being sent

### "Invalid data structure"
- ✅ Arduino JSON format is incorrect
- ✅ Check Arduino code matches the required format
- ✅ Verify JSON is valid (use JSON validator)

### Port Already in Use
- ✅ Close Arduino IDE
- ✅ Close any other serial monitor programs
- ✅ Restart the bridge

---

## Integration with App

The React Native app is already configured to use this bridge:

1. **Update `src/hardware/HardwareConfig.ts`:**
   ```typescript
   const USE_REAL_HARDWARE = true; // Set to true
   const ESP32_IP_ADDRESS = 'http://localhost:3000'; // Bridge address
   ```

2. **Start the bridge first:**
   ```bash
   cd hardware-bridge
   npm start
   ```

3. **Then start the React Native app:**
   ```bash
   npm start
   ```

The app will automatically fetch pH data from `http://localhost:3000/ph`.

---

## API Endpoint

### GET /ph

**Response (200 OK):**
```json
{
  "pH": 5.1,
  "timestamp": 123456
}
```

**Response (503 Service Unavailable):**
```json
{
  "error": "No sensor data available",
  "message": "Arduino has not sent any data yet. Check serial connection."
}
```

This endpoint **exactly matches** the ESP32 format, so no app refactoring is needed later.

---

## Stopping the Bridge

Press `Ctrl+C` in the terminal to stop the bridge gracefully.

---

## Future: ESP32 Migration

When ESP32 is ready:

1. **Delete this bridge:**
   ```bash
   rm -rf hardware-bridge
   ```

2. **Update `src/hardware/HardwareConfig.ts`:**
   ```typescript
   const USE_REAL_HARDWARE = true;
   const ESP32_IP_ADDRESS = 'http://192.168.1.100'; // ESP32 IP
   ```

3. **No other changes needed!** The app will automatically use ESP32.

---

## Notes

- This bridge is **temporary** - delete when ESP32 is ready
- Data is stored in memory (latest reading only)
- Malformed JSON is safely ignored
- pH values are clamped to 0-14 range
- Console logs show all activity for debugging

