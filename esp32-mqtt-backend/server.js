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
    
    // Subscribe to 9-button grid topics
    mqttClient.subscribe('esp32/buttons', { qos: 0 }, (err) => {
        if (!err) {
            console.log('✅ Subscribed to topic: esp32/buttons (9-button grid)');
        } else {
            console.error('❌ Failed to subscribe to esp32/buttons:', err);
        }
    });
    
    // Subscribe to individual button topics (3x3 grid)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const topic = `esp32/button/${row}/${col}`;
            mqttClient.subscribe(topic, { qos: 0 }, (err) => {
                if (!err) {
                    console.log(`✅ Subscribed to topic: ${topic}`);
                } else {
                    console.error(`❌ Failed to subscribe to ${topic}:`, err);
                }
            });
        }
    }
    
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
        mqttClient.publish('esp32/buttons', 'Server connected - test message from 9-button grid monitor');
        console.log('🧪 Test message sent to esp32/buttons');
    }, 2000);
});

mqttClient.on('message', (topic, message) => {
    const data = message.toString();
    const timestamp = new Date().toISOString();
    
    console.log('📨 MQTT message received:');
    console.log('   Topic:', topic);
    console.log('   Message:', data);
    console.log('   Time:', new Date().toLocaleString());
    
    // Process 9-button grid messages
    if(topic === 'esp32/buttons') {
        console.log('🎯 ESP32 9-Button Grid Data received:', data);
        
        // Parse button grid data
        const buttonData = {
            message: data,
            timestamp: timestamp,
            displayTime: new Date().toLocaleString(),
            isPressed: data.toLowerCase().includes('pressed') && !data.toLowerCase().includes('released'),
            isReleased: data.toLowerCase().includes('released'),
            type: 'grid'
        };
        
        // Extract row and column if possible
        const gridMatch = data.match(/Button\[(\d+)\]\[(\d+)\]/);
        if (gridMatch) {
            buttonData.row = parseInt(gridMatch[1]);
            buttonData.col = parseInt(gridMatch[2]);
        }
        
        // Extract pin number if possible
        const pinMatch = data.match(/Pin (\d+)/);
        if (pinMatch) {
            buttonData.pin = parseInt(pinMatch[1]);
        }
        
        // Broadcast to all connected clients
        io.emit('buttonGrid', buttonData);
        console.log('📡 Grid data sent to', io.engine.clientsCount, 'frontend clients');
    }
    
    // Process individual button messages
    if(topic.startsWith('esp32/button/')) {
        const parts = topic.split('/');
        if (parts.length === 4) {
            const row = parseInt(parts[2]);
            const col = parseInt(parts[3]);
            
            console.log(`🎯 Individual Button [${row}][${col}] Data received:`, data);
            
            const buttonData = {
                message: data,
                timestamp: timestamp,
                displayTime: new Date().toLocaleString(),
                row: row,
                col: col,
                isPressed: data === 'PRESSED',
                isReleased: data === 'RELEASED',
                type: 'individual'
            };
            
            // Broadcast to all connected clients
            io.emit('buttonIndividual', buttonData);
            console.log(`📡 Individual button [${row}][${col}] data sent to`, io.engine.clientsCount, 'frontend clients');
        }
    }
    
    // Legacy support for single button (backward compatibility)
    if(topic === 'esp32/button') {
        console.log('🎯 ESP32 Legacy Button Data received:', data);
        
        const buttonData = {
            message: data,
            timestamp: timestamp,
            displayTime: new Date().toLocaleString(),
            isPressed: data.toLowerCase().includes('pressed') && !data.toLowerCase().includes('released'),
            isReleased: data.toLowerCase().includes('released'),
            type: 'legacy'
        };
        
        io.emit('button', buttonData);
        console.log('📡 Legacy button data sent to', io.engine.clientsCount, 'frontend clients');
    }
    
    // Process control acknowledgments from ESP32
    if(topic === 'esp32/control') {
        console.log('🎯 ESP32 Control acknowledgment received:', data);
        
        // Parse the control status from the message
        let buttonReadingEnabled = null;
        let ledStatus = null;
        
        if (data.includes('Button reading enabled')) {
            buttonReadingEnabled = true;
            ledStatus = 'START';
        } else if (data.includes('Button reading disabled')) {
            buttonReadingEnabled = false;
            ledStatus = 'STOP';
        }
        
        // Enhanced data object for frontend
        const controlData = {
            message: data,
            timestamp: timestamp,
            displayTime: new Date().toLocaleString(),
            type: 'control_ack',
            buttonReadingEnabled: buttonReadingEnabled,
            ledStatus: ledStatus
        };
        
        // Broadcast to all connected clients
        io.emit('controlAck', controlData);
        console.log('📡 Control acknowledgment sent to', io.engine.clientsCount, 'frontend clients');
        
        if (buttonReadingEnabled !== null) {
            console.log(`🎮 Button reading status: ${buttonReadingEnabled ? 'ENABLED' : 'DISABLED'}`);
        }
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
    
    // Handle start command (LED on port 23 + enable button reading)
    socket.on('start', () => {
        console.log('🟢 Start command received from client:', socket.id);
        mqttClient.publish('esp32/led/start', 'START', { qos: 1 });
        console.log('📤 Published START command to esp32/led/start (Enable button reading + LED port 23)');
        
        // Send immediate feedback to client
        socket.emit('commandSent', {
            command: 'START',
            message: 'START command sent - Enabling button reading',
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle stop command (LED on port 22 + disable button reading)
    socket.on('stop', () => {
        console.log('🔴 Stop command received from client:', socket.id);
        mqttClient.publish('esp32/led/stop', 'STOP', { qos: 1 });
        console.log('📤 Published STOP command to esp32/led/stop (Disable button reading + LED port 22)');
        
        // Send immediate feedback to client
        socket.emit('commandSent', {
            command: 'STOP',
            message: 'STOP command sent - Disabling button reading',
            timestamp: new Date().toISOString()
        });
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
