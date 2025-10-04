const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(__dirname + '/public'));

// MQTT Setup - using unique client ID to avoid conflicts
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', {
    clientId: 'esp32_web_monitor_' + Date.now() + '_' + Math.random().toString(16).substr(2, 8),
    keepalive: 60,
    clean: true,
    reconnectPeriod: 1000,
    port: 1883,
    protocol: 'mqtt'
});

console.log('🔄 Attempting to connect to MQTT broker...');

mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    console.log('🆔 Client ID:', mqttClient.options.clientId);
    
    // Subscribe to button topic
    mqttClient.subscribe('esp32/button', { qos: 0 }, (err) => {
        if (!err) {
            console.log('✅ Subscribed to topic: esp32/button');
        } else {
            console.error('❌ Failed to subscribe:', err);
        }
    });
    
    // Subscribe to control acknowledgment topic
    mqttClient.subscribe('esp32/control', { qos: 0 }, (err) => {
        if (!err) {
            console.log('✅ Subscribed to topic: esp32/control');
        } else {
            console.error('❌ Failed to subscribe:', err);
        }
    });
    
    // Send a test message to verify our own connection after 2 seconds
    setTimeout(() => {
        mqttClient.publish('esp32/button', 'Server connected - test message from web monitor');
        console.log('🧪 Test message sent to esp32/button');
    }, 2000);
});

mqttClient.on('message', (topic, message) => {
    const data = message.toString();
    const timestamp = new Date().toISOString();
    
    console.log('📨 MQTT message received:');
    console.log('   Topic:', topic);
    console.log('   Message:', data);
    console.log('   Time:', new Date().toLocaleString());
    
    // Only process messages from esp32/button topic
    if(topic === 'esp32/button') {
        console.log('🎯 ESP32 Button Data received:', data);
        
        // Enhanced data object for frontend
        const buttonData = {
            message: data,
            timestamp: timestamp,
            displayTime: new Date().toLocaleString(),
            isPressed: data.toLowerCase().includes('pressed') && !data.toLowerCase().includes('released'),
            isReleased: data.toLowerCase().includes('released')
        };
        
        // Broadcast to all connected clients with enhanced data
        io.emit('button', buttonData);
        console.log('📡 Enhanced data sent to', io.engine.clientsCount, 'frontend clients');
    }
    
    // Process control acknowledgments from ESP32
    if(topic === 'esp32/control') {
        console.log('🎯 ESP32 Control acknowledgment received:', data);
        
        // Enhanced data object for frontend
        const controlData = {
            message: data,
            timestamp: timestamp,
            displayTime: new Date().toLocaleString(),
            type: 'control_ack'
        };
        
        // Broadcast to all connected clients
        io.emit('controlAck', controlData);
        console.log('📡 Control acknowledgment sent to', io.engine.clientsCount, 'frontend clients');
    }
});

mqttClient.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

mqttClient.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT broker...');
});

mqttClient.on('offline', () => {
    console.log('📴 MQTT client offline');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Handle start command (LED on port 23)
    socket.on('start', () => {
        console.log('🟢 Start command received from client:', socket.id);
        mqttClient.publish('esp32/led/start', 'START', { qos: 1 });
        console.log('📤 Published START command to esp32/led/start (LED port 23)');
    });
    
    // Handle stop command (LED on port 22)
    socket.on('stop', () => {
        console.log('🔴 Stop command received from client:', socket.id);
        mqttClient.publish('esp32/led/stop', 'STOP', { qos: 1 });
        console.log('📤 Published STOP command to esp32/led/stop (LED port 22)');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mqtt_connected: mqttClient.connected,
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 Server running on http://localhost:' + PORT);
    console.log('📡 MQTT Topic: esp32/button');
    console.log('🌐 Frontend available at: http://localhost:' + PORT);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down gracefully...');
    mqttClient.end();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
