/**
 * Arduino Serial to HTTP Bridge
 * 
 * This is a TEMPORARY bridge that reads pH data from Arduino via USB Serial
 * and exposes it via HTTP endpoint matching the ESP32 format.
 * 
 * When ESP32 is ready, delete this bridge and update HardwareConfig.ts
 * to point to the ESP32 IP address.
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for React Native app
app.use(cors());
app.use(express.json());

// Current pH data (latest reading from Arduino)
let currentData = null;
let lastUpdateTime = null;

// Serial port configuration
// TODO: Update COM_PORT to match your Arduino's port
// Windows: COM3, COM4, etc.
// Mac/Linux: /dev/tty.usbserial-*, /dev/ttyUSB0, etc.
const COM_PORT = process.env.COM_PORT || 'COM9'; // Default to COM3 on Windows
const BAUD_RATE = 9600;

console.log('🔌 Starting Hardware Bridge...');
console.log(`📡 Attempting to connect to ${COM_PORT} at ${BAUD_RATE} baud`);

// Initialize serial port
let serialPort = null;
let parser = null;

function initializeSerial() {
  try {
    serialPort = new SerialPort({
      path: COM_PORT,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    // Create readline parser (reads until newline)
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // Handle incoming serial data
    parser.on('data', (line) => {
      // Trim whitespace first (needed in both try and catch)
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines

      try {
        console.log(`📥 Received: ${trimmed}`);

        const data = JSON.parse(trimmed);

        // Validate data structure
        if (typeof data.pH === 'number' && typeof data.timestamp === 'number') {
          // Clamp pH to valid range (0-14)
          const clampedPH = Math.max(0, Math.min(14, data.pH));

          currentData = {
            pH: Math.round(clampedPH * 10) / 10, // Round to 1 decimal
            timestamp: data.timestamp || Date.now(),
            source: 'arduino',
          };

          lastUpdateTime = Date.now();

          console.log(`✅ Valid pH reading: ${currentData.pH} (timestamp: ${currentData.timestamp})`);
        } else {
          console.warn(`⚠️  Invalid data structure: ${trimmed}`);
        }
      } catch (parseError) {
        // Silently ignore malformed JSON (partial data, noise, etc.)
        // Only log if it looks like it might be valid JSON
        if (trimmed.includes('{') && trimmed.includes('pH')) {
          console.warn(`⚠️  Failed to parse JSON: ${trimmed.substring(0, 50)}...`);
        }
      }
    });

    // Handle serial port errors
    serialPort.on('error', (error) => {
      console.error(`❌ Serial port error: ${error.message}`);
      console.error('   Make sure Arduino is connected and COM port is correct');
    });

    // Open serial port
    serialPort.open((error) => {
      if (error) {
        console.error(`❌ Failed to open serial port ${COM_PORT}: ${error.message}`);
        console.error('   Check that:');
        console.error('   1. Arduino is connected via USB');
        console.error('   2. COM port is correct (see README.md)');
        console.error('   3. No other program is using the serial port');
        console.error(`\n   Current COM_PORT: ${COM_PORT}`);
        console.error('   Set COM_PORT environment variable to change: COM_PORT=COM8 npm start');
      } else {
        console.log(`✅ Serial port ${COM_PORT} opened successfully`);
        console.log('📊 Waiting for Arduino data...');
      }
    });
  } catch (error) {
    console.error(`❌ Failed to initialize serial port: ${error.message}`);
  }
}

// HTTP Endpoint: GET /ph
// This MUST match the ESP32 endpoint format exactly
app.get('/ph', (req, res) => {
  if (!currentData) {
    // No data received yet - return 503 Service Unavailable
    return res.status(503).json({
      error: 'No sensor data available',
      message: 'Arduino has not sent any data yet. Check serial connection.',
    });
  }

  // Return latest reading (matches ESP32 format)
  console.log(`📤 Serving pH request: ${currentData.pH} (age: ${Math.round((Date.now() - lastUpdateTime) / 1000)}s)`);

  res.json({
    pH: currentData.pH,
    timestamp: currentData.timestamp,
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    serialConnected: serialPort && serialPort.isOpen,
    hasData: currentData !== null,
    lastUpdate: lastUpdateTime ? new Date(lastUpdateTime).toISOString() : null,
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`🌐 HTTP server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: GET http://localhost:${PORT}/ph`);
  console.log(`💚 Health check: GET http://localhost:${PORT}/health`);
  console.log('');

  // Initialize serial connection
  initializeSerial();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
  }
  process.exit(0);
});
