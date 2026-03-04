/**
 * AgroSeva Irrigation Brain - Soil Moisture Sensor & Relay Control
 * 
 * DEMO-GRADE FAIL-SAFE SYSTEM
 * 
 * Features:
 * - Hardware watchdog timer (4s timeout) - auto-resets on freeze
 * - Software heartbeat (10s timeout) - detects communication loss
 * - Relay lock-ON protection - firmware-enforced max ON time
 * - Safe boot state - relay defaults to OFF on reset
 * - Heartbeat messages every 2 seconds
 * 
 * WIRING:
 * - Soil Moisture Sensor (analog) → A0
 *   - VCC → 5V
 *   - GND → GND
 *   - Signal → A0
 * 
 * - Relay Module → D7 (active LOW)
 *   - IN → D7
 *   - VCC → 5V
 *   - GND → GND
 *   - NO/COM → DC Motor/Pump
 * 
 * SERIAL COMMUNICATION:
 * - Sends: "MOISTURE:<percent>" every 2 seconds
 * - Sends: "HB:<uptime_ms>" every 2 seconds (heartbeat)
 * - Receives: "ON:<duration_ms>\n" or "OFF\n" to control relay
 * 
 * SAFETY GUARANTEES:
 * - Relay NEVER stays ON if software crashes (watchdog resets)
 * - Arduino always recovers from freezes (hardware watchdog)
 * - Max ON time enforced in firmware (prevents lock-ON)
 * - Communication loss detected (heartbeat timeout)
 */

#include <avr/wdt.h>  // Hardware watchdog timer

// Pin definitions
const int MOISTURE_SENSOR_PIN = A0;  // Analog pin for soil moisture sensor
const int RELAY_PIN = 7;             // Digital pin for relay (active LOW)

// Calibration values (adjust based on your sensor)
const int DRY_VALUE = 0;    // Raw ADC value when completely dry
const int WET_VALUE = 1023; // Raw ADC value when completely wet

// Timing
unsigned long lastReading = 0;
const unsigned long READING_INTERVAL = 2000;  // Read and send every 2 seconds

// Heartbeat tracking
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 2000;  // Send heartbeat every 2 seconds

// Software heartbeat timeout (communication loss detection)
unsigned long lastCommandReceived = 0;
const unsigned long COMMAND_TIMEOUT = 10000;  // 10 seconds - if no command, reset

// Relay state tracking
bool relayOn = false;
unsigned long relayTurnedOnAt = 0;
unsigned long relayMaxOnDuration = 0;  // Max ON time in milliseconds
const unsigned long FIRMWARE_MAX_ON_TIME = 30000;  // 30 seconds max (firmware hard limit)

// Boot flag (to detect first run after reset)
bool isFirstBoot = true;

void setup() {
  // Disable watchdog during setup (will enable in loop)
  wdt_disable();
  
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(MOISTURE_SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  
  // SAFE STATE: Relay OFF on boot (active LOW = HIGH = OFF)
  digitalWrite(RELAY_PIN, HIGH);
  relayOn = false;
  
  // Wait for serial connection (with timeout to prevent infinite wait)
  unsigned long serialWaitStart = millis();
  while (!Serial && (millis() - serialWaitStart < 3000)) {
    ; // Wait max 3 seconds for serial
  }
  
  // Print boot message
  Serial.println("========================================");
  Serial.println("AgroSeva Irrigation Brain - Arduino Ready");
  Serial.println("BOOT: Watchdog enabled, Relay OFF (safe state)");
  Serial.println("========================================");
  Serial.print("Reading soil moisture sensor on A0");
  Serial.print(" | Relay control on D7 (active LOW)");
  Serial.print(" | Watchdog: 4s timeout");
  Serial.println();
  
  // Initialize timing
  lastReading = millis();
  lastHeartbeat = millis();
  lastCommandReceived = millis();  // Start timer from boot
  
  // Enable hardware watchdog timer (4 second timeout)
  // If watchdog is not reset within 4 seconds, Arduino will auto-reset
  wdt_enable(WDTO_4S);
  
  isFirstBoot = false;
}

void loop() {
  // CRITICAL: Reset watchdog at start of every loop iteration
  // If loop() freezes or blocks for >4 seconds, watchdog will reset Arduino
  wdt_reset();
  
  unsigned long currentMillis = millis();
  
  // ========================================
  // 1. READ MOISTURE SENSOR (every 2 seconds)
  // ========================================
  if (currentMillis - lastReading >= READING_INTERVAL) {
    lastReading = currentMillis;
    
    // Read analog value (0-1023 for 10-bit ADC)
    int rawValue = analogRead(MOISTURE_SENSOR_PIN);
    
    // Convert to percentage (0-100%)
    int moisture = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
    moisture = constrain(moisture, 0, 100);  // Clamp to 0-100 range
    
    // Send to laptop via serial in format: "MOISTURE:<value>"
    Serial.print("MOISTURE:");
    Serial.println(moisture);
    
    // Reset watchdog after sensor read (critical operation)
    wdt_reset();
  }
  
  // ========================================
  // 2. SEND HEARTBEAT (every 2 seconds)
  // ========================================
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    
    // Send heartbeat: "HB:<uptime_ms>"
    Serial.print("HB:");
    Serial.println(currentMillis);
    
    // Reset watchdog after heartbeat
    wdt_reset();
  }
  
  // ========================================
  // 3. CHECK FOR COMMANDS FROM LAPTOP
  // ========================================
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Update last command received time (communication is alive)
    lastCommandReceived = currentMillis;
    
    // Reset watchdog after receiving command
    wdt_reset();
    
    // Parse command: "ON:<duration_ms>" or "OFF"
    if (command.startsWith("ON:")) {
      // Extract duration from "ON:<duration_ms>"
      String durationStr = command.substring(3);
      unsigned long durationMs = durationStr.toInt();
      
      // Validate duration (must be > 0 and <= firmware max)
      if (durationMs > 0 && durationMs <= FIRMWARE_MAX_ON_TIME) {
        // Turn relay ON
        digitalWrite(RELAY_PIN, LOW);  // Active LOW - turn relay ON
        relayOn = true;
        relayTurnedOnAt = currentMillis;
        relayMaxOnDuration = durationMs;
        
        Serial.print("Relay ON for ");
        Serial.print(durationMs);
        Serial.println("ms");
      } else {
        // Invalid duration - ignore command
        Serial.print("Invalid duration: ");
        Serial.println(durationMs);
      }
    }
    else if (command == "OFF") {
      // Turn relay OFF
      digitalWrite(RELAY_PIN, HIGH);  // Active LOW - turn relay OFF
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
      
      Serial.println("Relay OFF");
    }
    else {
      // Unknown command - ignore (fail-safe: don't act on malformed commands)
      Serial.print("Unknown command: ");
      Serial.println(command);
    }
    
    // Reset watchdog after processing command
    wdt_reset();
  }
  
  // ========================================
  // 4. RELAY LOCK-ON PROTECTION
  // ========================================
  // Firmware-enforced max ON time - prevents relay from staying ON forever
  if (relayOn && relayTurnedOnAt > 0) {
    unsigned long elapsed = currentMillis - relayTurnedOnAt;
    
    // If max duration exceeded OR firmware max time exceeded, turn OFF
    if (elapsed >= relayMaxOnDuration || elapsed >= FIRMWARE_MAX_ON_TIME) {
      digitalWrite(RELAY_PIN, HIGH);  // Turn OFF
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
      
      Serial.println("Relay OFF (firmware timeout)");
      
      // Reset watchdog after safety action
      wdt_reset();
    }
  }
  
  // ========================================
  // 5. SOFTWARE HEARTBEAT TIMEOUT
  // ========================================
  // If no command received for 10 seconds, assume communication loss
  // Turn relay OFF and trigger watchdog reset (safe recovery)
  if (currentMillis - lastCommandReceived >= COMMAND_TIMEOUT) {
    // Communication lost - enter safe state
    if (relayOn) {
      digitalWrite(RELAY_PIN, HIGH);  // Turn relay OFF (safe state)
      relayOn = false;
      relayTurnedOnAt = 0;
      relayMaxOnDuration = 0;
      
      Serial.println("COMM_LOSS: Relay OFF (no command for 10s)");
    }
    
    // Trigger watchdog reset to recover
    Serial.println("COMM_LOSS: Triggering watchdog reset...");
    delay(100);  // Small delay to allow serial to flush
    wdt_enable(WDTO_15MS);  // Enable very short watchdog to force reset
    while(1) {}  // Wait for reset (watchdog will reset in 15ms)
  }
  
  // ========================================
  // 6. SMALL DELAY (prevents watchdog timeout)
  // ========================================
  // Never use delay() > 1 second without resetting watchdog
  // Small delay allows other operations and prevents tight loop
  delay(10);  // 10ms delay - safe (well under 4s watchdog timeout)
  
  // Watchdog will be reset at start of next loop() iteration
}
