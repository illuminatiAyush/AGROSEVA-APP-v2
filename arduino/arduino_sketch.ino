/**
 * AgroSeva Irrigation Brain - Arduino Sketch
 * 
 * Reads moisture sensor and controls relay based on commands from laptop.
 * 
 * WIRING:
 * - Moisture Sensor (analog) → A0
 * - Relay Module IN → D7 (active LOW)
 * - Relay Module VCC → 5V
 * - Relay Module GND → GND
 * 
 * SERIAL COMMUNICATION:
 * - Sends: "MOISTURE:<value>" every 2 seconds
 * - Receives: "ON\n" or "OFF\n" to control relay
 * 
 * Upload this once - no Arduino IDE needed at runtime.
 */

// Pin definitions
const int MOISTURE_SENSOR_PIN = A0;  // Analog pin for moisture sensor
const int RELAY_PIN = 7;             // Digital pin for relay (active LOW)

// Calibration values (adjust based on your sensor)
const int DRY_VALUE = 0;    // Raw ADC value when completely dry
const int WET_VALUE = 1023; // Raw ADC value when completely wet

// Timing
unsigned long lastReading = 0;
const unsigned long READING_INTERVAL = 2000; // Read every 2 seconds

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(MOISTURE_SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Start with relay OFF (active LOW)
  
  // Wait for serial connection
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  Serial.println("AgroSeva Irrigation Brain - Arduino Ready");
  Serial.println("Reading moisture sensor on A0");
  Serial.println("Relay control on D7");
}

void loop() {
  // Read moisture sensor periodically
  unsigned long currentMillis = millis();
  if (currentMillis - lastReading >= READING_INTERVAL) {
    lastReading = currentMillis;
    
    // Read analog value
    int rawValue = analogRead(MOISTURE_SENSOR_PIN);
    
    // Convert to percentage (0-100%)
    // Map from [DRY_VALUE, WET_VALUE] to [0, 100]
    int moisture = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
    moisture = constrain(moisture, 0, 100); // Clamp to 0-100
    
    // Send to laptop via serial
    Serial.print("MOISTURE:");
    Serial.println(moisture);
  }
  
  // Check for commands from laptop
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "ON") {
      digitalWrite(RELAY_PIN, LOW);  // Active LOW - turn relay ON
      Serial.println("Relay ON");
    }
    else if (command == "OFF") {
      digitalWrite(RELAY_PIN, HIGH); // Active LOW - turn relay OFF
      Serial.println("Relay OFF");
    }
    else {
      Serial.print("Unknown command: ");
      Serial.println(command);
    }
  }
}

