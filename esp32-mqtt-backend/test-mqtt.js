const mqtt = require('mqtt');

// Connect to the same broker
const client = mqtt.connect('mqtt://broker.hivemq.com', {
    clientId: 'test_publisher_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('✅ Test publisher connected to MQTT broker');
    
    let counter = 0;
    
    // Send test button messages every 3 seconds
    setInterval(() => {
        counter++;
        const testMessage = `Button pressed ${counter} times`;
        
        client.publish('esp32/button', testMessage);
        console.log(`📤 Sent: ${testMessage}`);
        
        // Also send some other test data
        client.publish('esp32/button', `Sensor reading: ${Math.random() * 100}`);
        
    }, 3000);
});

client.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

console.log('🧪 Starting MQTT test publisher...');
console.log('   Will send test messages to esp32/button every 3 seconds');
console.log('   Press Ctrl+C to stop');