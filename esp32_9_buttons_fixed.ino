#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// WiFi credentials
const char* ssid = "Galaxy M01 Core9053";
const char* password = "methuki123";

// MQTT Broker settings
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// LED pins for ESP8266 NodeMCU V3 (separate from buttons)
const int LED_START_PIN = D0;  // GPIO16 - START LED
const int LED_STOP_PIN = D8;   // GPIO15 - STOP LED

// 9 Button pins for ESP8266 NodeMCU V3
// RX = GPIO3, TX = GPIO1
const int BUTTON_PINS[] = {D1, D2, D3, D5, D6, D7, 3, 1, D4};
// Grid layout:
// [D1] [D2] [D3]  <- Row 0 (GPIO5, GPIO4, GPIO0)
// [D5] [D6] [D7]  <- Row 1 (GPIO14, GPIO12, GPIO13)
// [RX] [TX] [D4]  <- Row 2 (GPIO3, GPIO1, GPIO2)

const int NUM_BUTTONS = 9;

// Variables
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;
bool buttonStates[NUM_BUTTONS] = {false};
bool lastButtonStates[NUM_BUTTONS] = {false};
bool buttonReadingEnabled = false;  // START/STOP control

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial to be ready
  
  Serial.println("\n\n========================================");
  Serial.println("ESP8266 NodeMCU V3 - 9 Button Grid");
  Serial.println("========================================");
  
  // Initialize LED pins
  pinMode(LED_START_PIN, OUTPUT);
  pinMode(LED_STOP_PIN, OUTPUT);
  digitalWrite(LED_START_PIN, HIGH);  // HIGH = OFF
  digitalWrite(LED_STOP_PIN, LOW);    // LOW = ON (STOP state initially)
  
  // Initialize button pins
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }
  
  Serial.println("\nButton Grid Layout:");
  Serial.println("[D1] [D2] [D3]  <- Row 0");
  Serial.println("[D5] [D6] [D7]  <- Row 1");
  Serial.println("[RX] [TX] [D4]  <- Row 2");
  Serial.println("\nLED Pins: D0=START, D8=STOP");
  
  // Connect to WiFi
  setup_wifi();
  
  // Test buttons at startup
  testButtons();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("\n========================================");
  Serial.println("Setup complete!");
  Serial.println("Button reading: DISABLED (waiting for START command)");
  Serial.println("========================================\n");
}

void setup_wifi() {
  delay(10);
  Serial.println("\n========================================");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("✗ WiFi connection FAILED!");
    Serial.println("Check your SSID and password");
  }
  Serial.println("========================================");
}

void testButtons() {
  Serial.println("\n========================================");
  Serial.println("BUTTON CONNECTION TEST");
  Serial.println("========================================");
  Serial.println("Testing all 9 buttons at startup...\n");
  
  const char* pinNames[] = {"D1", "D2", "D3", "D5", "D6", "D7", "RX", "TX", "D4"};
  
  for (int i = 0; i < NUM_BUTTONS; i++) {
    int pinState = digitalRead(BUTTON_PINS[i]);
    Serial.print("Button ");
    Serial.print(i);
    Serial.print(" [");
    Serial.print(i/3);
    Serial.print("][");
    Serial.print(i%3);
    Serial.print("] (");
    Serial.print(pinNames[i]);
    Serial.print("): ");
    
    if (pinState == HIGH) {
      Serial.println("✓ NOT PRESSED (Pull-up active - Good!)");
    } else {
      Serial.println("✗ PRESSED or SHORT CIRCUIT (Check wiring!)");
    }
    delay(50);
  }
  
  Serial.println("\n========================================");
  Serial.println("Press buttons to test real-time...");
  Serial.println("(Button presses will be detected after START command)");
  Serial.println("LEDs: D0=START, D8=STOP");
  Serial.println("========================================\n");
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("\n[MQTT] Topic: ");
  Serial.print(topic);
  Serial.print(" | Message: ");
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Handle START command - enable button reading
  if (String(topic) == "esp32/led/start") {
    if (message == "START") {
      digitalWrite(LED_START_PIN, LOW);   // LOW = ON for D0
      digitalWrite(LED_STOP_PIN, HIGH);   // HIGH = OFF for built-in LED
      buttonReadingEnabled = true;
      
      Serial.println("========================================");
      Serial.println("🟢 START COMMAND RECEIVED");
      Serial.println("   - START LED (D0): ON");
      Serial.println("   - STOP LED (D8): OFF");
      Serial.println("   - Button reading: ENABLED");
      Serial.println("========================================\n");
      
      // Reset button states when starting
      for (int i = 0; i < NUM_BUTTONS; i++) {
        lastButtonStates[i] = !digitalRead(BUTTON_PINS[i]);
      }
      
      // Send acknowledgment back to server
      client.publish("esp32/control", "START_LED_ON - Button reading enabled");
    }
  }
  
  // Handle STOP command - disable button reading
  else if (String(topic) == "esp32/led/stop") {
    if (message == "STOP") {
      digitalWrite(LED_STOP_PIN, LOW);    // LOW = ON for built-in LED
      digitalWrite(LED_START_PIN, HIGH);  // HIGH = OFF for D0
      buttonReadingEnabled = false;
      
      Serial.println("========================================");
      Serial.println("🔴 STOP COMMAND RECEIVED");
      Serial.println("   - STOP LED (D8): ON");
      Serial.println("   - START LED (D0): OFF");
      Serial.println("   - Button reading: DISABLED");
      Serial.println("========================================\n");
      
      // Send acknowledgment back to server
      client.publish("esp32/control", "STOP_LED_ON - Button reading disabled");
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("\n[MQTT] Connecting to broker...");
    
    // Create a random client ID
    String clientId = "ESP8266-";
    clientId += String(random(0xffff), HEX);
    
    // Attempt to connect
    if (client.connect(clientId.c_str())) {
      Serial.println(" CONNECTED!");
      
      // Subscribe to LED control topics
      client.subscribe("esp32/led/start");
      client.subscribe("esp32/led/stop");
      
      Serial.println("[MQTT] Subscribed to topics:");
      Serial.println("  - esp32/led/start");
      Serial.println("  - esp32/led/stop");
      
      // Announce that we're online
      client.publish("esp32/control", "ESP8266_ONLINE");
      Serial.println("[MQTT] Published: ESP8266_ONLINE");
      
    } else {
      Serial.print(" FAILED! rc=");
      Serial.print(client.state());
      Serial.println(" | Retry in 5 seconds...");
      delay(5000);
    }
  }
}

void checkButtons() {
  // Only check buttons if reading is enabled
  if (!buttonReadingEnabled) {
    return;
  }
  
  // Read all button states
  for (int i = 0; i < NUM_BUTTONS; i++) {
    buttonStates[i] = !digitalRead(BUTTON_PINS[i]); // Inverted because of INPUT_PULLUP
    
    // Check for state change
    if (buttonStates[i] != lastButtonStates[i]) {
      // Calculate row and column for grid position
      int row = i / 3;     // 0, 1, or 2
      int col = i % 3;     // 0, 1, or 2
      
      // Get pin name for display
      const char* pinNames[] = {"D1", "D2", "D3", "D5", "D6", "D7", "RX", "TX", "D4"};
      String pinName = pinNames[i];
      
      if (buttonStates[i]) {
        // Button pressed
        String message = "Button[" + String(row) + "][" + String(col) + "] PRESSED (Pin " + pinName + ")";
        
        // Publish to general button topic
        client.publish("esp32/buttons", message.c_str());
        
        // Publish to specific button topic
        String buttonTopic = "esp32/button/" + String(row) + "/" + String(col);
        client.publish(buttonTopic.c_str(), "PRESSED");
        
        // Serial output with visual indicator
        Serial.println("╔════════════════════════════════════╗");
        Serial.print("║ ✓ ");
        Serial.print(message);
        for (int j = message.length(); j < 33; j++) Serial.print(" ");
        Serial.println("║");
        Serial.println("╚════════════════════════════════════╝");
        
      } else {
        // Button released
        String message = "Button[" + String(row) + "][" + String(col) + "] RELEASED (Pin " + pinName + ")";
        
        // Publish to general button topic
        client.publish("esp32/buttons", message.c_str());
        
        // Publish to specific button topic
        String buttonTopic = "esp32/button/" + String(row) + "/" + String(col);
        client.publish(buttonTopic.c_str(), "RELEASED");
        
        // Serial output
        Serial.print("  → ");
        Serial.println(message);
      }
      
      lastButtonStates[i] = buttonStates[i];
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Check physical buttons every 50ms
  unsigned long now = millis();
  if (now - lastMsg > 50) {
    lastMsg = now;
    checkButtons();
  }
  
  // Small delay and yield for ESP8266 stability
  delay(10);
  yield();  // Important for ESP8266 to prevent watchdog reset
}
