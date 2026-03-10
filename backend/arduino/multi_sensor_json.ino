/**
 * AgroSeva Multi-Sensor Arduino Sketch
 * 
 * ⚠️ DO NOT PRINT ANY NON-JSON TEXT OVER SERIAL
 * 
 * Reads:
 * - Soil moisture (analog A0)
 * - Temperature (DHT11)
 * - pH sensor (analog A1)
 * 
 * Sends ONLY JSON over Serial (no banners, no text headers, no debug strings).
 * 
 * Output format (every 2-3 seconds, newline terminated):
 * {"moisture":49,"temperature":27.3,"pH":6.8,"timestamp":123456}
 * 
 * WIRING:
 * - Soil Moisture Sensor → A0
 * - DHT11 Temperature → D2 (data pin)
 * - pH Sensor → A1
 * - Relay Module → D7 (active LOW)
 * 
 * SAFETY:
 * - Hardware watchdog timer (4s timeout)
 * - Relay defaults to OFF on boot
 * - Firmware-enforced max ON time (30s)
 */

#include <avr/wdt.h>  // Hardware watchdog timer
#include <DHT.h>      // DHT11 library

// ⚠️ DO NOT PRINT ANY NON-JSON TEXT OVER SERIAL

// Pin definitions
const int MOISTURE_SENSOR_PIN = A0;  // Analog pin for soil moisture sensor
const int PH_SENSOR_PIN = A1;        // Analog pin for pH sensor
const int DHT_PIN = 2;               // Digital pin for DHT11
const int RELAY_PIN = 7;             // Digital pin for relay (active LOW)

// DHT11 setup
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// Calibration values (DO NOT CHANGE - formulas preserved)
const int MOISTURE_DRY_VALUE = 0;    // Raw ADC value when completely dry
const int MOISTURE_WET_VALUE = 1023;  // Raw ADC value when completely wet

// pH sensor calibration (DO NOT CHANGE - formulas preserved)
const float PH_SLOPE = 3.5;          // pH slope (adjust based on your sensor)
const float PH_OFFSET = 0.0;         // pH offset (adjust based on your sensor)
const int PH_REFERENCE_VOLTAGE = 5;  // Reference voltage for pH sensor

// Timing
unsigned long lastReading = 0;
const unsigned long READING_INTERVAL = 2500;  // Read and send every 2.5 seconds

// Relay state tracking
bool relayOn = false;
unsigned long relayTurnedOnAt = 0;
unsigned long relayMaxOnDuration = 0;
const unsigned long FIRMWARE_MAX_ON_TIME = 30000;  // 30 seconds max

// Software heartbeat timeout
unsigned long lastCommandReceived = 0;
const unsigned long COMMAND_TIMEOUT = 10000;  // 10 seconds

void setup() {
  // Disable watchdog during setup
  wdt_disable();
  
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(MOISTURE_SENSOR_PIN, INPUT);
  pinMode(PH_SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  
  // Initialize DHT11
  dht.begin();
  
  // SAFE STATE: Relay OFF on boot (active LOW = HIGH = OFF)
  digitalWrite(RELAY_PIN, HIGH);
  relayOn = false;
  
  // Wait for serial connection (with timeout)
  unsigned long serialWaitStart = millis();
  while (!Serial && (millis() - serialWaitStart < 3000)) {
    ; // Wait max 3 seconds
  }
  
  // ⚠️ DO NOT PRINT ANY NON-JSON TEXT OVER SERIAL
  // No Serial.println("READY"), no banners, no debug strings
  
  // Initialize timing
  lastReading = millis();
  lastCommandReceived = millis();
  
  // Enable hardware watchdog timer (4 second timeout)
  wdt_enable(WDTO_4S);
}

void loop() {
  // CRITICAL: Reset watchdog at start of every loop iteration
  wdt_reset();
  
  unsigned long currentMillis = millis();
  
  // ========================================
  // 1. READ ALL SENSORS AND SEND JSON (every 2.5 seconds)
  // ========================================
  if (currentMillis - lastReading >= READING_INTERVAL) {
    lastReading = currentMillis;
    
    // Read moisture sensor (formula preserved)
    int moistureRaw = analogRead(MOISTURE_SENSOR_PIN);
    int moisture = map(moistureRaw, MOISTURE_DRY_VALUE, MOISTURE_WET_VALUE, 0, 100);
    moisture = constrain(moisture, 0, 100);
    
    // Read temperature from DHT11 (formula preserved)
    float temperature = dht.readTemperature();  // Returns Celsius
    if (isnan(temperature)) {
      temperature = -999.0;  // Invalid reading marker
    }
    
    // Read pH sensor (formula preserved - DO NOT CHANGE)
    int phRaw = analogRead(PH_SENSOR_PIN);
    float phVoltage = (phRaw / 1023.0) * PH_REFERENCE_VOLTAGE;
    float ph = (PH_SLOPE * phVoltage) + PH_OFFSET;
    ph = constrain(ph, 0.0, 14.0);  // Clamp to valid pH range
    
    // Get timestamp (milliseconds since boot)
    unsigned long timestamp = currentMillis;
    
    // Send ONLY JSON (no banners, no text, no debug strings)
    Serial.print("{");
    Serial.print("\"moisture\":");
    Serial.print(moisture);
    Serial.print(",\"temperature\":");
    if (temperature == -999.0) {
      Serial.print("null");  // Invalid reading
    } else {
      Serial.print(temperature, 1);  // 1 decimal place
    }
    Serial.print(",\"pH\":");
    Serial.print(ph, 1);  // 1 decimal place
    Serial.print(",\"timestamp\":");
    Serial.print(timestamp);
    Serial.println("}");
    
    // Reset watchdog after sensor read
    wdt_reset();
  }
  
  // ========================================
  // 2. CHECK FOR COMMANDS FROM LAPTOP
  // ========================================
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Update last command received time
    lastCommandReceived = currentMillis;
    wdt_reset();
    
    // Parse command: "ON:<duration_ms>" or "OFF"
    if (command.startsWith("ON:")) {
      String durationStr = command.substring(3);
      unsigned long durationMs = durationStr.toInt();
      
      if (durationMs > 0 && durationMs <= FIRMWARE_MAX_ON_TIME) {
        digitalWrite(RELAY_PIN, LOW);  // Active LOW - turn relay ON
        relayOn = true;
        relayTurnedOnAt = currentMillis;
        relayMaxOnDuration = durationMs;
      }
    }
    else if (command == "OFF") {
      digitalWrite(RELAY_PIN, HIGH);  // Active LOW - turn relay OFF
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
    }
    
    wdt_reset();
  }
  
  // ========================================
  // 3. RELAY LOCK-ON PROTECTION
  // ========================================
  if (relayOn && relayTurnedOnAt > 0) {
    unsigned long elapsed = currentMillis - relayTurnedOnAt;
    
    if (elapsed >= relayMaxOnDuration || elapsed >= FIRMWARE_MAX_ON_TIME) {
      digitalWrite(RELAY_PIN, HIGH);  // Turn OFF
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
      wdt_reset();
    }
  }
  
  // ========================================
  // 4. SOFTWARE HEARTBEAT TIMEOUT
  // ========================================
  if (currentMillis - lastCommandReceived >= COMMAND_TIMEOUT) {
    if (relayOn) {
      digitalWrite(RELAY_PIN, HIGH);  // Turn relay OFF (safe state)
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
    }
    
    // Trigger watchdog reset to recover
    delay(100);
    wdt_enable(WDTO_15MS);
    while(1) {}  // Wait for reset
  }
  
  // Small delay (prevents watchdog timeout)
  delay(10);
}

