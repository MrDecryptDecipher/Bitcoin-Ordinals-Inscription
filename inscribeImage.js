const BitcoinCore = require('bitcoin-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
require('dotenv').config();

// Bitcoin Core client configuration
const client = new BitcoinCore({
    network: 'testnet',
    username: process.env.BITCOIN_RPC_USER,
    password: process.env.BITCOIN_RPC_PASSWORD,
    host: process.env.BITCOIN_RPC_HOST,
    port: process.env.BITCOIN_RPC_PORT,
    wallet: 'thefastway'
});

/**
 * Get a new Bech32m address from the Bitcoin Core wallet.
 * @returns {Promise<string>} The new address.
 */
async function getNewAddress() {
    try {
        const address = await client.getNewAddress('', 'bech32m');
        console.log(`New address: ${address}`);
        return address;
    } catch (error) {
        console.error(`Error getting new address: ${error.message}`);
        throw error;
    }
}

/**
 * Inscribe an image on the Bitcoin blockchain using the Ordinals Bot API.
 * @param {string} address - The receiving address.
 * @param {string} imagePath - The path to the image file.
 */
async function inscribeImage(address, imagePath) {
    try {
        const imageData = fs.readFileSync(imagePath);
        const fileBase64 = imageData.toString('base64');
        const fileSize = Buffer.byteLength(imageData);

        // Log image details for debugging
        console.log(`Inscribe Image - Path: ${imagePath}, Size: ${fileSize} bytes`);

        const response = await axios.post('https://testnet-api.ordinalsbot.com/order', {
            files: [{
                name: path.basename(imagePath),
                size: fileSize,
                type: 'image/jpeg',
                dataURL: `data:image/jpeg;base64,${fileBase64}`
            }],
            receiveAddress: address,
            fee: 150 // Updated to meet the minimum fee requirement
        });

        // Log the entire response object for debugging
        console.log(`Inscription response: ${JSON.stringify(response.data, null, 2)}`);

        const { paymentAddress, amount, paymentLink } = await waitForPayment(response.data.id);

        console.log(`Payment Address: ${paymentAddress}`);
        console.log(`Amount: ${(amount / 1e8).toFixed(8)} BTC`);
        console.log(`Payment Link: ${paymentLink}`);

        // Automate the payment from Bitcoin Core wallet
        const txid = await makePayment(paymentAddress, amount / 1e8); // Convert satoshis to BTC

        // Wait for the payment to be confirmed
        await waitForPaymentConfirmation(txid);

        // Wait for the reveal transaction to be broadcasted and mined
        const inscriptionId = await waitForRevealTransaction(response.data.id);

        console.log(`Inscription ID: ${inscriptionId}`);

        // Query the inscription details from the Ordinals Bot API
        await queryInscription(inscriptionId);

    } catch (error) {
        console.error(`Error inscribing image: ${error.message}`);
        if (error.response) {
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

/**
 * Wait for the payment details to be available for the given order ID.
 * @param {string} orderId - The ID of the inscription order.
 * @returns {Promise<Object>} The payment details (address, amount, and link).
 */
async function waitForPayment(orderId) {
    let paymentAddress = null;
    let amount = null;
    let paymentLink = null;

    while (!paymentAddress || !amount || !paymentLink) {
        try {
            const response = await axios.get(`https://testnet-api.ordinalsbot.com/order?id=${orderId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            const charge = response.data.charge;
            paymentAddress = charge ? charge.address : null;
            amount = charge ? charge.amount : null;
            paymentLink = charge ? charge.hosted_checkout_url : null;

            if (paymentAddress && amount && paymentLink) {
                return { paymentAddress, amount, paymentLink };
            }

            // Wait for a few seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        } catch (error) {
            console.error(`Error checking payment status: ${error.message}`);
            if (error.response) {
                console.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }
}

/**
 * Make the payment using the Bitcoin Core wallet.
 * @param {string} address - The payment address.
 * @param {number} amount - The amount to pay in BTC.
 * @returns {Promise<string>} The transaction ID of the payment.
 */
async function makePayment(address, amount) {
    try {
        // Set a high fee rate to prioritize the transaction
        const feeRate = 0.00005; // High fee rate in BTC/kB

        // Calculate the total amount including the fee
        const totalAmount = amount + (feeRate * 1000) / 1e8; // Assuming a typical transaction size of 1000 bytes

        // Validate the total amount
        if (totalAmount <= 0 || isNaN(totalAmount)) {
            throw new Error(`Invalid amount: ${totalAmount} BTC`);
        }

        // Send the payment transaction with RBF enabled
        const txid = await client.sendToAddress(address, totalAmount.toFixed(8), '', '', true, true, null, null, false);
        console.log(`Payment sent. Transaction ID: ${txid}`);

        return txid;
    } catch (error) {
        console.error(`Error making payment: ${error.message}`);

        // Check if the error is related to insufficient funds
        if (error.message.includes('Insufficient funds')) {
            console.log('Insufficient funds. Checking wallet balance...');

            // Get the current wallet balance
            const walletInfo = await client.getWalletInfo();
            const balance = walletInfo.balance;

            console.log(`Wallet balance: ${balance} BTC`);

            // Check if the balance is sufficient for the payment
            if (balance < amount) {
                throw new Error(`Insufficient funds. Required: ${amount} BTC, Available: ${balance} BTC`);
            }
        }

        throw error;
    }
}

/**
 * Wait for the payment transaction to be confirmed.
 * @param {string} txid - The transaction ID of the payment.
 */
async function waitForPaymentConfirmation(txid) {
    let isConfirmed = false;

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(100, 0);

    while (!isConfirmed) {
        try {
            const tx = await client.getTransaction(txid);
            isConfirmed = tx.confirmations > 0;

            if (isConfirmed) {
                console.log('Payment confirmed!');
            } else {
                // Wait for a few seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
                bar.increment(10);
            }
        } catch (error) {
            console.error(`Error checking payment confirmation: ${error.message}`);
            throw error;
        }
    }

    bar.update(100);
    bar.stop();
}

/**
 * Wait for the reveal transaction to be broadcasted and mined.
 * @param {string} orderId - The ID of the inscription order.
 * @returns {Promise<string>} The inscription ID.
 */
async function waitForRevealTransaction(orderId) {
    let inscriptionId = null;
    let retryCount = 0;
    const maxRetries = 5;

    while (!inscriptionId && retryCount < maxRetries) {
        try {
            const response = await axios.get(`https://testnet-api.ordinalsbot.com/order?id=${orderId}`, {
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 30000 // Set a timeout of 30 seconds for the request
            });

            if (response.data.inscriptionId) {
                inscriptionId = response.data.inscriptionId;
                console.log(`Inscription ID: ${inscriptionId}`);
            } else {
                console.log(`Waiting for reveal transaction... (Order state: ${response.data.state})`);
                // Wait for a few seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
            }
        } catch (error) {
            console.error(`Error checking reveal transaction: ${error.message}`);
            if (error.response) {
                console.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            retryCount++;
            console.log(`Retrying... (Attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        }
    }

    if (!inscriptionId) {
        throw new Error('Failed to obtain inscription ID after multiple attempts');
    }

    return inscriptionId;
}

/**
 * Query the inscription details from the Ordinals Bot API.
 * @param {string} inscriptionId - The ID of the inscription to query.
 */
async function queryInscription(inscriptionId) {
    try {
        console.log(`Waiting for the inscription to be indexed...`);
        // Wait for a few seconds to give the explorer time to catch up
        await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds

        const response = await axios.get(`https://testnet-api.ordinalsbot.com/inscription/${inscriptionId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log(`Inscription details: ${JSON.stringify(response.data, null, 2)}`);
        const explorerUrl = `https://testnet.ordinalsbot.com/inscription/${inscriptionId}`;
        console.log(`You can view the inscription at: ${explorerUrl}`);
    } catch (error) {
        console.error(`Error querying inscription: ${error.message}`);
        if (error.response) {
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

/**
 * Main function to execute the workflow.
 */
(async () => {
    try {
        // Fetch new address
        const address = await getNewAddress();

        // Log start of inscription process
        const imagePath = path.join(__dirname, 'images', 'thefastway.jpg');
        console.log(`Starting inscription process for image: ${imagePath}`);

        // Inscribe the image
        await inscribeImage(address, imagePath);

        // Log success
        console.log('Image inscribed successfully');
    } catch (error) {
        // Log detailed error information
        console.error(`An error occurred: ${error.message}`);
        console.error(error.stack);
    }
})();