const mqtt = require('mqtt');

// Connect to the same broker as the server
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    clientId: 'esp32_button_simulator_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('✅ ESP32 Button Simulator connected to MQTT broker');
    console.log('🎮 Simulating button presses...');
    
    let buttonPressed = false;
    let counter = 0;
    
    // Simulate button press/release every 2 seconds
    setInterval(() => {
        counter++;
        
        if (!buttonPressed) {
            // Simulate button press
            client.publish('esp32/button', 'Button Pressed!');
            console.log(`🔴 ${counter}: Button Pressed!`);
            buttonPressed = true;
        } else {
            // Simulate button release
            client.publish('esp32/button', 'Button Released!');
            console.log(`🟢 ${counter}: Button Released!`);
            buttonPressed = false;
        }
    }, 2000);
});

client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

console.log('🎮 Starting ESP32 Button Simulator...');
console.log('   Will simulate button press/release every 2 seconds');
console.log('   Press Ctrl+C to stop');