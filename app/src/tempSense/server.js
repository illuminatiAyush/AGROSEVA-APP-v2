import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let latest = {
  temperature: 0,
  pH: null,
  timestamp: null
};

// 🔌 SERIAL PORT CONFIGURATION
try {
  const port = new SerialPort({
    path: 'COM6',
    baudRate: 9600
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', (line) => {
    try {
      const data = JSON.parse(line);
      latest = { ...latest, ...data, timestamp: Date.now() };
      console.log('📡 SENSOR (Serial):', latest);
    } catch (e) {
      // Ignore non-JSON data
    }
  });

  port.on('error', (err) => {
    console.error('Serial Port Error:', err.message);
  });
} catch (err) {
  console.log('ℹ️ Serial port not initialized (COM8). Ensure dependencies are installed and port is correct.');
}

// 🌐 API ENDPOINTS

// Get all latest sensor data
app.get('/sensor', (req, res) => {
  res.json(latest);
});

// Get temperature only (for compatibility with mobile app)
app.get('/temperature', (req, res) => {
  res.json({
    temperature: latest.temperature,
    timestamp: latest.timestamp || Date.now()
  });
});

// Update temperature via POST (Alternative to Serial, e.g., from a bridge)
app.post('/temperature', (req, res) => {
  const { temperature } = req.body;

  if (typeof temperature !== 'number') {
    return res.status(400).json({ error: 'Invalid temperature' });
  }

  latest.temperature = temperature;
  latest.timestamp = Date.now();
  console.log('🌡️ Temp received via POST:', temperature);

  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
