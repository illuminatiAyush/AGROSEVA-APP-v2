# API Contract - AgroSeva Irrigation Brain

**Complete API documentation for the backend server.**

## Base URL

```
http://<LAPTOP_IP>:8000
```

**Example:**
```
http://192.168.1.100:8000
```

**Note:** Replace `<LAPTOP_IP>` with your laptop's IP address on the local network.

---

## Endpoints

### GET /health

Health check endpoint. Returns system health status.

**Request:**
```http
GET /health HTTP/1.1
Host: 192.168.1.100:8000
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-24T18:50:00.123456",
  "serial_connected": true,
  "moisture_data_available": true
}
```

**Response Fields:**
- `status` (string): System status ("healthy" or "unhealthy")
- `timestamp` (string): ISO 8601 timestamp
- `serial_connected` (boolean): Whether Arduino is connected via Serial
- `moisture_data_available` (boolean): Whether moisture data has been received

**Status Codes:**
- `200 OK`: System is healthy

**Example (cURL):**
```bash
curl http://192.168.1.100:8000/health
```

---

### GET /moisture

Get latest live moisture reading from Arduino.

**Request:**
```http
GET /moisture HTTP/1.1
Host: 192.168.1.100:8000
```

**Response (Success):**
```json
{
  "moisture": 42,
  "unit": "%",
  "source": "arduino",
  "timestamp": 1706123400
}
```

**Response Fields:**
- `moisture` (integer, nullable): Live moisture percentage (0-100)
- `unit` (string): Unit of measurement ("%")
- `source` (string): Data source ("arduino")
- `timestamp` (integer, nullable): Unix timestamp of reading

**Response (No Data):**
```json
{
  "detail": "No moisture data available. Arduino may not be connected or no sensor readings received yet."
}
```

**Status Codes:**
- `200 OK`: Moisture data returned
- `404 Not Found`: No moisture data available

**Example (cURL):**
```bash
curl http://192.168.1.100:8000/moisture
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://192.168.1.100:8000/moisture');
const data = await response.json();
console.log(`Moisture: ${data.moisture}%`);
```

**Notes:**
- Returns **ONLY live data** from Arduino - no mocks or dummy values
- Returns `404` if Arduino is not connected or no data received yet
- Moisture value is integer (0-100)
- Timestamp is Unix timestamp (seconds since epoch)

---

### GET /status

Get comprehensive system status including sensor data, relay state, and last decision.

**Request:**
```http
GET /status HTTP/1.1
Host: 192.168.1.100:8000
```

**Response:**
```json
{
  "moisture": 42.0,
  "temperature": 25.5,
  "ph": 6.8,
  "irrigation": "OFF",
  "explanation": "Soil moisture adequate (moisture 42% >= 35%)",
  "timestamp": 1706123400
}
```

**Response Fields:**
- `moisture` (float, nullable): Live moisture percentage (0-100)
- `temperature` (float, nullable): Live temperature in Celsius
- `ph` (float, nullable): Live pH value (0-14)
- `irrigation` (string): Irrigation status ("ON" or "OFF")
- `explanation` (string, nullable): XAI explanation of last decision
- `timestamp` (integer, nullable): Unix timestamp of last reading

**Status Codes:**
- `200 OK`: Status returned

**Example (cURL):**
```bash
curl http://192.168.1.100:8000/status
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://192.168.1.100:8000/status');
const data = await response.json();
console.log(`Moisture: ${data.moisture}%`);
console.log(`Temperature: ${data.temperature}°C`);
console.log(`pH: ${data.ph}`);
console.log(`Irrigation: ${data.irrigation}`);
```

**Notes:**
- Returns **ONLY live data** from Arduino - no mocks or dummy values
- All sensor values may be `null` if sensor not connected or no data received
- `explanation` is provided by the XAI (Explainable AI) system
- `timestamp` is Unix timestamp (seconds since epoch)

---

### GET /

Root endpoint. Returns system information and available endpoints.

**Request:**
```http
GET / HTTP/1.1
Host: 192.168.1.100:8000
```

**Response:**
```json
{
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
```

**Status Codes:**
- `200 OK`: Information returned

**Example (cURL):**
```bash
curl http://192.168.1.100:8000/
```

---

## Data Models

### MoistureResponse

```typescript
interface MoistureResponse {
  moisture: number | null;  // 0-100
  unit: string;              // "%"
  source: string;            // "arduino"
  timestamp: number | null;  // Unix timestamp
}
```

### StatusResponse

```typescript
interface StatusResponse {
  moisture: number | null;      // 0-100
  temperature: number | null;   // Celsius
  ph: number | null;            // 0-14
  irrigation: "ON" | "OFF";     // Irrigation state
  explanation: string | null;    // XAI explanation
  timestamp: number | null;      // Unix timestamp
}
```

---

## Error Responses

All endpoints may return standard HTTP error codes:

### 404 Not Found

```json
{
  "detail": "No moisture data available. Arduino may not be connected or no sensor readings received yet."
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error"
}
```

---

## CORS

The API has CORS enabled for all origins:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: *`
- `Access-Control-Allow-Headers: *`

This allows the mobile app to make requests from any origin.

---

## Rate Limiting

Currently, there is **no rate limiting**. The mobile app polls `/moisture` every 2 seconds, which is acceptable for this use case.

---

## Authentication

Currently, there is **no authentication**. The API is intended for use on a local network only.

**For production:** Add authentication (API keys, JWT tokens, etc.)

---

## Real-Time Data

**Important:** All endpoints return **ONLY live data** from Arduino:

- ✅ **Real sensor readings** from Arduino via Serial
- ❌ **NO mocks** or dummy values
- ❌ **NO random** or simulated data
- ❌ **NO cached** data (always latest reading)

If Arduino is not connected or no data received yet, endpoints return `404` or `null` values.

---

## Example Integration

### React Native (TypeScript)

```typescript
// Fetch moisture
const fetchMoisture = async () => {
  try {
    const response = await fetch('http://192.168.1.100:8000/moisture');
    if (!response.ok) {
      throw new Error('Failed to fetch moisture');
    }
    const data = await response.json();
    console.log(`Moisture: ${data.moisture}%`);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

// Poll every 2 seconds
useEffect(() => {
  const interval = setInterval(fetchMoisture, 2000);
  return () => clearInterval(interval);
}, []);

// Fetch status (includes all sensors)
const fetchStatus = async () => {
  try {
    const response = await fetch('http://192.168.1.100:8000/status');
    const data = await response.json();
    console.log(`Moisture: ${data.moisture}%`);
    console.log(`Temperature: ${data.temperature}°C`);
    console.log(`pH: ${data.ph}`);
    console.log(`Irrigation: ${data.irrigation}`);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};
```

### Python

```python
import requests

# Fetch moisture
response = requests.get('http://192.168.1.100:8000/moisture')
if response.status_code == 200:
    data = response.json()
    print(f"Moisture: {data['moisture']}%")
else:
    print("No moisture data available")

# Fetch status
response = requests.get('http://192.168.1.100:8000/status')
if response.status_code == 200:
    data = response.json()
    print(f"Moisture: {data['moisture']}%")
    print(f"Temperature: {data['temperature']}°C")
    print(f"pH: {data['ph']}")
    print(f"Irrigation: {data['irrigation']}")
```

### cURL

```bash
# Health check
curl http://192.168.1.100:8000/health

# Get moisture
curl http://192.168.1.100:8000/moisture

# Get status
curl http://192.168.1.100:8000/status
```

---

## Testing

### Test with cURL

```bash
# Health check
curl http://localhost:8000/health

# Get moisture (requires Arduino connected)
curl http://localhost:8000/moisture

# Get status
curl http://localhost:8000/status
```

### Test with Postman

1. Create new request
2. Set method to `GET`
3. Enter URL: `http://192.168.1.100:8000/moisture`
4. Click "Send"
5. View response

---

## Changelog

### v2.0.0 (2026-01-24)
- Self-healing architecture
- Multi-sensor support (moisture, temperature, pH)
- XAI explanations
- Enhanced `/status` endpoint
- Improved error handling

### v1.0.0 (2026-01-24)
- Initial API release
- Endpoints: `/health`, `/moisture`, `/status`
- Live Arduino sensor data integration
- Autonomous decision-making

---

**For questions or issues, refer to `README.md` or `RUN_ORDER.md`.**

