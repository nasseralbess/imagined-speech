const Cortex = require('./cortex'); // Import the provided Cortex class

class EmotivWrapper {
    constructor(clientId, clientSecret, appId) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.appId = appId;
        this.cortex = new Cortex(clientId, clientSecret, appId); // Use the provided Cortex class
    }

    async initialize() {
        console.log('Initializing Cortex connection...');
        await this.cortex.connect();
    }

    async startReadingData() {
        console.log('Starting data reading...');
        await this.cortex.requestAccess();
        await this.cortex.authorize();
        const headsets = await this.cortex.queryHeadsets();
        if (headsets.length > 0) {
            await this.cortex.createSession(headsets[0].id);
            await this.cortex.subscribe(['eeg']); // Example: Subscribing to EEG data
            console.log('Data reading started.');
        } else {
            console.error('No headsets detected.');
        }
    }

    async stopReadingData() {
        console.log('Stopping data reading...');
        await this.cortex.closeSession();
        console.log('Data reading stopped.');
    }
}

module.exports = EmotivWrapper;
