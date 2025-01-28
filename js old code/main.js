import Cortex from '../cortex.js'; // Import the Cortex class
import config from '../config.js'; // Import configuration

let socketUrl = 'wss://localhost:6868';
let user = {
    license: config.license,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    debit: 5000,
};

// Initialize Cortex
let c = new Cortex(user, socketUrl);

// Function to ensure WebSocket is open
const waitForSocketToOpen = async (socket) => {
    return new Promise((resolve, reject) => {
        if (socket.readyState === WebSocket.OPEN) {
            resolve();
        } else {
            socket.on('open', resolve); // Wait for 'open' event
            socket.on('error', reject); // Handle errors
        }
    });
};

(async () => {
    try {
        // Wait for WebSocket to open
        console.log('Waiting for WebSocket connection...');
        await waitForSocketToOpen(c.socket);

        console.log('Requesting access...');
        await c.requestAccess(); // Request access and accept it in CortexUI

        // console.log('Subscribing to streams...');
        // let streams = ['eeg'];
        // await c.sub(streams); // Subscribe to EEG streams
        
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        console.log("Testing");
        c.socket.close(); // Close the WebSocket connection
    }
})();
