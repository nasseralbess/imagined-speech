const fs = require('fs');
const path = require('path');
const EmotivWrapper = require('./index'); // Import the wrapper
const config = require('./config'); // Import configuration

(async () => {
    const wrapper = new EmotivWrapper(config.clientId, config.clientSecret, config.appId);

    try {
        // Step 1: Initialize the wrapper (connect to WebSocket)
        console.log('Initializing wrapper...');
        await wrapper.initialize();

        // Step 2: Request access to the API
        console.log('Requesting access...');
        await wrapper.cortex.requestAccess();
        console.log('Access granted. Accept the request in the EMOTIV Launcher.');

        // Step 3: Refresh devices to start headset scanning
        console.log('Refreshing devices...');
        await wrapper.cortex.controlDevice('refresh');
        console.log('Devices refreshed.');

        // Step 4: Query available headsets
        console.log('Querying headsets...');
        const headsets = await wrapper.cortex.queryHeadsets();
        console.log('Available Headsets:', headsets);

        if (headsets.length > 0) {
            const headsetId = headsets[0].id; // Select the first available headset

            // Step 5: Connect to the headset
            console.log(`Connecting to headset ${headsetId}...`);
            await wrapper.cortex.controlDevice('connect');
            console.log('Headset connected.');

            // Step 6: Authorize the application to get a Cortex token
            console.log('Authorizing...');
            const cortexToken = await wrapper.cortex.authorize();
            console.log('Cortex Token:', cortexToken);

            // Step 7: Create a session for data streaming
            console.log('Creating a session...');
            const session = await wrapper.cortex.createSession(headsetId);
            console.log('Session Created:', session);

            // Step 8: Subscribe to EEG data
            console.log('Subscribing to EEG data...');
            const dataStream = await wrapper.cortex.subscribe(['eeg']);
            console.log('Subscribed to EEG data stream.');

            // Step 9: Handle data and store it
            console.log('Starting data storage...');
            const dataFolder = path.join(__dirname, 'data');
            
            // Ensure the data folder exists
            if (!fs.existsSync(dataFolder)) {
                fs.mkdirSync(dataFolder);
            }

            const dataFile = path.join(dataFolder, `eeg-data-${Date.now()}.json`);
            const writeStream = fs.createWriteStream(dataFile);

            dataStream.on('data', (data) => {
                console.log('Data received:', data);
                writeStream.write(`${JSON.stringify(data)}\n`);
            });

            // Stop after a specific duration for testing (e.g., 30 seconds)
            await new Promise((resolve) => setTimeout(resolve, 30000));
            console.log('Stopping data stream...');
            writeStream.end();

            // Step 10: Stop data reading
            await wrapper.stopReadingData();
            console.log('Data stream stopped. Data saved to:', dataFile);
        } else {
            console.error('No headsets detected. Please connect a headset.');
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();
