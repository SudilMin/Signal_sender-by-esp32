

---

# IoT Remote Controller for *The Return of Attention*

### ESP32 • MQTT • Node.js • Socket.IO • Web UI

This project is my **first IoT build**, created as part of
**“The Return Of Attention – Practices for the Happiness that Stays.”**

It features a **9-button wireless remote** using an **ESP32 NodeMCU** that controls a web application in real time. The system is designed to support mindful interaction through a simple, physical interface.

---

## ✨ Features

### 🔘 ESP32 Hardware

* 9 push buttons arranged as a 3×3 grid
* Start/Stop session control
* LED indicators for feedback
* Publishes button events via MQTT
* Sends device health/status updates

### 🖧 Backend (Node.js + Express)

* Subscribes to MQTT topics
* Forwards events instantly to the frontend via Socket.IO
* Receives session summary data
* Stores button counts, timing, and patterns for future analysis

### 🌐 Frontend (Web App)

* Real-time 3×3 grid that highlights button presses
* Start/Stop control UI
* Device status indicator
* Sends Stop-session data to backend

---

## 📊 Session Tracking

When the **Stop** button is pressed:

* All button presses during the session are recorded
* Each button’s press count is calculated
* Timestamps are stored
* Entire summary is sent to the backend for analysis


---

## 🧩 System Architecture

```
ESP32 → MQTT Broker (HiveMQ)
       ↓
Node.js/Express (MQTT Subscriber)
       ↓
   Socket.IO Server
       ↓
     Web Frontend
```

---

## 🛠️ Tech Stack

* **Hardware:** ESP32 NodeMCU, Arduino (C/C++)
* **Messaging:** MQTT, HiveMQ
* **Backend:** Node.js, Express, MQTT.js, Socket.IO
* **Frontend:** HTML, CSS, JavaScript, Socket.IO Client

---




## 🛰️ MQTT Topics

| Topic            | Purpose                          |
| ---------------- | -------------------------------- |
| `remote/buttons` | Publishes button press events    |
| `remote/start`   | Start session                    |
| `remote/stop`    | Stop session + send summary      |
| `remote/status`  | Device health (online/heartbeat) |

---

## 🙏 Acknowledgment

This project was built as part of
**“The Return Of Attention – Practices for the Happiness that Stays.”**
Special thanks to **Nadil Siriwardana** for the guidance and support.


