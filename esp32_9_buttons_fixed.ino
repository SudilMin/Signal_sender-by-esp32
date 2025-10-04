#include <WiFi.h>
#include <PubSubClient.h>

// WiFi credentials - UPDATE THESE WITH YOUR NETWORK DETAILS
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// LED pins
const int LED_START_PIN = 23;  // LED for START command
const int LED_STOP_PIN = 22;   // LED for STOP command

// Button pins (if you have physical buttons)
const int BUTTON_PINS[] = {2, 4, 5, 18, 19, 21, 25, 26, 27};
const int NUM_BUTTONS = 9;

// Variables
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;
bool buttonStates[NUM_BUTTONS] = {false};
bool lastButtonStates[NUM_BUTTONS] = {false};

void setup() {
  Serial.begin(115200);
  
  // Initialize LED pins
  pinMode(LED_START_PIN, OUTPUT);
  pinMode(LED_STOP_PIN, OUTPUT);
  digitalWrite(LED_START_PIN, LOW);
  digitalWrite(LED_STOP_PIN, LOW);
  
  // Initialize button pins
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }
  
  Serial.println("ESP32 MQTT LED Controller Starting...");
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("Setup complete!");
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  randomSeed(micros());

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Handle START command - turn on LED on pin 23
  if (String(topic) == "esp32/led/start") {
    if (message == "START") {
      digitalWrite(LED_START_PIN, HIGH);
      digitalWrite(LED_STOP_PIN, LOW);  // Turn off stop LED
      Serial.println("START LED ON (Pin 23)");
      
      // Send acknowledgment back to server
      client.publish("esp32/control", "START_LED_ON_PIN_23");
    }
  }
  
  // Handle STOP command - turn on LED on pin 22
  else if (String(topic) == "esp32/led/stop") {
    if (message == "STOP") {
      digitalWrite(LED_STOP_PIN, HIGH);
      digitalWrite(LED_START_PIN, LOW);  // Turn off start LED
      Serial.println("STOP LED ON (Pin 22)");
      
      // Send acknowledgment back to server
      client.publish("esp32/control", "STOP_LED_ON_PIN_22");
    }
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    // Attempt to connect
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to LED control topics
      client.subscribe("esp32/led/start");
      client.subscribe("esp32/led/stop");
      
      Serial.println("Subscribed to:");
      Serial.println("- esp32/led/start");
      Serial.println("- esp32/led/stop");
      
      // Announce that we're online
      client.publish("esp32/control", "ESP32_ONLINE");
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void checkButtons() {
  // Read all button states
  for (int i = 0; i < NUM_BUTTONS; i++) {
    buttonStates[i] = !digitalRead(BUTTON_PINS[i]); // Inverted because of pull-up
    
    // Check for button press (state change from false to true)
    if (buttonStates[i] && !lastButtonStates[i]) {
      String buttonMsg = "Button " + String(i + 1) + " pressed on pin " + String(BUTTON_PINS[i]);
      client.publish("esp32/button", buttonMsg.c_str());
      Serial.println(buttonMsg);
    }
    
    // Check for button release (state change from true to false)
    if (!buttonStates[i] && lastButtonStates[i]) {
      String buttonMsg = "Button " + String(i + 1) + " released on pin " + String(BUTTON_PINS[i]);
      client.publish("esp32/button", buttonMsg.c_str());
      Serial.println(buttonMsg);
    }
    
    lastButtonStates[i] = buttonStates[i];
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
  
  // Small delay to prevent overwhelming the system
  delay(10);
}
