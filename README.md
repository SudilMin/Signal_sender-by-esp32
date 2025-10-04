# ESP32 MQTT Controller

A simple IoT project that controls ESP32 LEDs remotely through a web interface using MQTT.

## What it does

- **Monitor**: Real-time button presses from ESP32 on a web page
- **Control**: Turn LEDs on/off from your browser
- **Connect**: Uses MQTT for wireless communication

## Quick Demo

1. Press **START** on webpage → LED lights up on ESP32 pin 23
2. Press **STOP** on webpage → LED lights up on ESP32 pin 22  
3. Press button on ESP32 → See real-time updates on webpage

## What you need

**Hardware:**
- ESP32 board
- 2 LEDs + resistors
- 1 push button
- Breadboard & wires

**Software:**
- Arduino IDE
- Node.js

## Setup (5 minutes)

### 1. Install dependencies
```bash
npm install express socket.io mqtt
```

### 2. Update WiFi in ESP32 code
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_PASSWORD";
```

### 3. Connect hardware
```
ESP32 Pin 4  → Button
ESP32 Pin 22 → LED 1 (Stop)
ESP32 Pin 23 → LED 2 (Start)
```

### 4. Run the project
```bash
# Start web server
node server.js

# Upload ESP32 code in Arduino IDE
# Open http://localhost:3000
```

## How it works

```
Web Browser ←→ Node.js Server ←→ MQTT Broker ←→ ESP32
```

1. Click button on website
2. Server sends MQTT message
3. ESP32 receives message and controls LED
4. ESP32 sends confirmation back to website

## Files

- `server.js` - Web server + MQTT handler
- `esp32_code.ino` - ESP32 Arduino code
- `public/index.html` - Web interface
- `test-mqtt.js` - Test MQTT messages

## Troubleshooting

**ESP32 won't upload?**
- Hold BOOT button while uploading

**LEDs not working?**
- Check ESP32 Serial Monitor for MQTT messages
- Verify WiFi connection

**Website not loading?**
- Make sure server is running: `node server.js`
- Go to `http://localhost:3000`

## Test it

```bash
# Test MQTT messages
node test-mqtt.js

# Should see messages on website and ESP32
```

---

**Simple IoT project perfect for beginners! 🚀**
