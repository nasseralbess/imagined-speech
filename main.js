const Cortex = require('./cortex'); // Assuming this is the file containing your class
const config = require('./config'); // Contains clientId, clientSecret, etc.

(async () => {
    const userConfig = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        license: "",
        debit: 1,
    };

    const socket = new (require('ws'))('wss://localhost:6868'); // WebSocket for Cortex API
    const cortex = new Cortex(socket, userConfig);

    try {
        console.log('Requesting API access...');
        await cortex.requestAccess();
        console.log('Access granted. Please accept in the EMOTIV Launcher.');

        console.log('Querying headset...');
        const headsetInfo = await cortex.queryHeadsetId();
        if (!cortex.isHeadsetConnected) {
            console.error('No connected headset detected. Ensure your headset is properly connected.');
            return;
        }
        console.log('Headset information:', headsetInfo);

        console.log('Connecting to headset...');
        await cortex.controlDevice(cortex.headsetId);
        console.log('Headset connected.');

        console.log('Authorizing...');
        const authToken = await cortex.authorize();
        console.log('Cortex token:', authToken);

        console.log('Creating a session...');
        const sessionId = await cortex.createSession(authToken, cortex.headsetId);
        console.log('Session created:', sessionId);

        console.log('Subscribing to EEG data...');
        cortex.subRequest(['eeg'], authToken, sessionId);

        // Optionally record data
        const recordName = `record-${Date.now()}`;
        console.log('Starting data recording...');
        const recordId = await cortex.startRecord(authToken, sessionId, recordName);
        console.log('Recording started with ID:', recordId);

        // Simulate data collection duration
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds

        console.log('Stopping data recording...');
        const stopResult = await cortex.stopRecord(authToken, sessionId, recordName);
        console.log('Recording stopped:', stopResult);

        console.log('All operations completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        socket.close();
    }
})();
