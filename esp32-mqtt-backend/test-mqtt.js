const mqtt = require('mqtt');

// Connect to the same broker
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    clientId: 'test_9button_publisher_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('✅ Test publisher connected to MQTT broker');
    console.log('🎯 Testing 9-button grid simulation...');
    
    let counter = 0;
    
    // Send test button messages for 9-button grid every 2 seconds
    setInterval(() => {
        counter++;
        
        // Simulate random button press from 3x3 grid
        const row = Math.floor(Math.random() * 3); // 0, 1, or 2
        const col = Math.floor(Math.random() * 3); // 0, 1, or 2
        const pins = [
            [21, 4, 5],    // Row 0
            [12, 13, 14],  // Row 1
            [15, 18, 19]   // Row 2
        ];
        const pin = pins[row][col];
        
        // Test message for general topic
        const testMessage = `Button[${row}][${col}] PRESSED (Pin ${pin}) - Test ${counter}`;
        client.publish('esp32/buttons', testMessage);
        console.log(`📤 General: ${testMessage}`);
        
        // Test message for specific button topic
        const specificTopic = `esp32/button/${row}/${col}`;
        client.publish(specificTopic, 'PRESSED');
        console.log(`📤 Specific: ${specificTopic} -> PRESSED`);
        
        // Simulate button release after 500ms
        setTimeout(() => {
            const releaseMessage = `Button[${row}][${col}] RELEASED (Pin ${pin})`;
            client.publish('esp32/buttons', releaseMessage);
            client.publish(specificTopic, 'RELEASED');
            console.log(`📤 Release: ${releaseMessage}`);
        }, 500);
        
    }, 2000);
    
    // Test LED control commands every 10 seconds
    setInterval(() => {
        const commands = ['START', 'STOP'];
        const command = commands[Math.floor(Math.random() * 2)];
        const topic = `esp32/led/${command.toLowerCase()}`;
        
        client.publish(topic, command);
        console.log(`🔥 LED Test: ${topic} -> ${command}`);
    }, 10000);
});

client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

console.log('🧪 Starting 9-Button MQTT test publisher...');
console.log('   📍 Grid Layout:');
console.log('   [21] [4]  [5]   <- Row 0');
console.log('   [12] [13] [14]  <- Row 1');  
console.log('   [15] [18] [19]  <- Row 2');
console.log('   📡 Topics: esp32/buttons, esp32/button/row/col');
console.log('   🔥 LED Topics: esp32/led/start, esp32/led/stop');
console.log('   ⏱️  Button tests every 2s, LED tests every 10s');
console.log('   Press Ctrl+C to stop');