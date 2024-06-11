Bitcoin Ordinals Inscription
A comprehensive guide to inscribing images on the Bitcoin blockchain using Bitcoin Core and the Ordinals Bot API. This project provides a complete workflow for creating and confirming inscriptions on the Bitcoin testnet.

Table of Contents
Introduction
Prerequisites
Installation
Configuration
Usage
Detailed Workflow
Troubleshooting
Contributing
License
Introduction
This project demonstrates how to inscribe images on the Bitcoin blockchain using Bitcoin Core and the Ordinals Bot API. It automates the entire process, from creating a new Bitcoin address to making payments and verifying inscriptions.

Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v14 or later)
Bitcoin Core (configured for testnet)
A Bitcoin Core wallet (thefastway) with sufficient testnet funds
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/MrDecryptDecipher/Bitcoin-Ordinals-Inscription.git
cd Bitcoin-Ordinals-Inscription
Install the required dependencies:

bash
Copy code
npm install
Configuration
Create a .env file in the project root directory and add the following environment variables:

bash
Copy code
BITCOIN_RPC_USER=<your-bitcoin-rpc-user>
BITCOIN_RPC_PASSWORD=<your-bitcoin-rpc-password>
BITCOIN_RPC_HOST=<your-bitcoin-rpc-host>
BITCOIN_RPC_PORT=<your-bitcoin-rpc-port>
Ensure your Bitcoin Core is running and properly configured for testnet.

Usage
To inscribe an image on the Bitcoin blockchain, follow these steps:

Place the image you want to inscribe in the images directory.
Update the image path in the index.js file if necessary.
Run the script:
bash
Copy code
node index.js
Detailed Workflow
Get a New Address:

javascript
Copy code
const address = await client.getNewAddress('', 'bech32m');
Inscribe the Image:

Read the image and convert it to base64.
Send the image data to the Ordinals Bot API to create an inscription order.
Wait for payment details and make the payment using Bitcoin Core.
Confirm the payment and wait for the reveal transaction.
Query the inscription details from the Ordinals Bot API.
Error Handling:

Detailed error messages and response data are logged for debugging.
Troubleshooting
Missing or Invalid Credentials:
Ensure your .env file contains the correct Bitcoin Core RPC credentials.

Insufficient Funds:
Check your wallet balance and ensure you have enough testnet BTC to cover the inscription fees.

Network Issues:
Verify your Bitcoin Core is running and properly configured for testnet. Check your network connection and API availability.

Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

License
This project is licensed under the MIT License. See the LICENSE file for details.

This README provides a detailed and structured overview of your project, including setup instructions, usage, and troubleshooting tips. If you need any further customization or additional sections, feel free to let me know!

NO, make the README file more detailed comprehensive understand the full code line by line now, go through each line of code understand everything
ChatGPT
Here is a more detailed and comprehensive README file based on a thorough line-by-line understanding of the provided code.

Bitcoin Ordinals Inscription
This project demonstrates how to inscribe images on the Bitcoin blockchain using Bitcoin Core and the Ordinals Bot API. It provides a complete automated workflow for creating and confirming inscriptions on the Bitcoin testnet.

Table of Contents
Introduction
Prerequisites
Installation
Configuration
Usage
Detailed Code Explanation
Bitcoin Core Client Configuration
Get New Address
Inscribe Image
Wait for Payment
Make Payment
Wait for Payment Confirmation
Wait for Reveal Transaction
Query Inscription
Main Execution
Troubleshooting
Contributing
License
Introduction
This project automates the process of inscribing images on the Bitcoin blockchain using the Ordinals Bot API. It includes functionalities to interact with Bitcoin Core, handle image data, and manage the entire inscription workflow from image upload to transaction confirmation.

Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v14 or later)
Bitcoin Core (configured for testnet)
A Bitcoin Core wallet (thefastway) with sufficient testnet funds
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/MrDecryptDecipher/Bitcoin-Ordinals-Inscription.git
cd Bitcoin-Ordinals-Inscription
Install the required dependencies:

bash
Copy code
npm install
Configuration
Create a .env file in the project root directory and add the following environment variables:

bash
Copy code
BITCOIN_RPC_USER=<your-bitcoin-rpc-user>
BITCOIN_RPC_PASSWORD=<your-bitcoin-rpc-password>
BITCOIN_RPC_HOST=<your-bitcoin-rpc-host>
BITCOIN_RPC_PORT=<your-bitcoin-rpc-port>
Ensure your Bitcoin Core is running and properly configured for testnet.

Usage
To inscribe an image on the Bitcoin blockchain, follow these steps:

Place the image you want to inscribe in the images directory.
Update the image path in the index.js file if necessary.
Run the script:
bash
Copy code
node index.js
Detailed Code Explanation
Bitcoin Core Client Configuration
The script starts by importing necessary modules and configuring the Bitcoin Core client:

javascript
Copy code
const BitcoinCore = require('bitcoin-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
require('dotenv').config();

const client = new BitcoinCore({
    network: 'testnet',
    username: process.env.BITCOIN_RPC_USER,
    password: process.env.BITCOIN_RPC_PASSWORD,
    host: process.env.BITCOIN_RPC_HOST,
    port: process.env.BITCOIN_RPC_PORT,
    wallet: 'thefastway'
});
BitcoinCore: Library to interact with Bitcoin Core.
axios: HTTP client to make API requests.
fs and path: File system and path utilities.
cliProgress: For displaying a progress bar.
dotenv: To load environment variables from a .env file.
Get New Address
Function to get a new Bech32m address from the Bitcoin Core wallet:

javascript
Copy code
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
getNewAddress: Calls client.getNewAddress to get a new Bech32m address.
Inscribe Image
Function to inscribe an image on the Bitcoin blockchain:

javascript
Copy code
async function inscribeImage(address, imagePath) {
    try {
        const imageData = fs.readFileSync(imagePath);
        const fileBase64 = imageData.toString('base64');
        const fileSize = Buffer.byteLength(imageData);

        console.log(`Inscribe Image - Path: ${imagePath}, Size: ${fileSize} bytes`);

        const response = await axios.post('https://testnet-api.ordinalsbot.com/order', {
            files: [{
                name: path.basename(imagePath),
                size: fileSize,
                type: 'image/jpeg',
                dataURL: `data:image/jpeg;base64,${fileBase64}`
            }],
            receiveAddress: address,
            fee: 150
        });

        console.log(`Inscription response: ${JSON.stringify(response.data, null, 2)}`);

        const { paymentAddress, amount, paymentLink } = await waitForPayment(response.data.id);

        console.log(`Payment Address: ${paymentAddress}`);
        console.log(`Amount: ${(amount / 1e8).toFixed(8)} BTC`);
        console.log(`Payment Link: ${paymentLink}`);

        const txid = await makePayment(paymentAddress, amount / 1e8);
        await waitForPaymentConfirmation(txid);
        const inscriptionId = await waitForRevealTransaction(response.data.id);

        console.log(`Inscription ID: ${inscriptionId}`);
        await queryInscription(inscriptionId);

    } catch (error) {
        console.error(`Error inscribing image: ${error.message}`);
        if (error.response) {
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}
inscribeImage: Reads the image file, converts it to base64, and posts it to the Ordinals Bot API.
await waitForPayment: Waits for payment details.
await makePayment: Makes the payment using Bitcoin Core.
await waitForPaymentConfirmation: Waits for the payment to be confirmed.
await waitForRevealTransaction: Waits for the reveal transaction.
await queryInscription: Queries the inscription details.
Wait for Payment
Function to wait for payment details to be available:

javascript
Copy code
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
waitForPayment: Polls the Ordinals Bot API for payment details until they are available.
Make Payment
Function to make the payment using the Bitcoin Core wallet:

javascript
Copy code
async function makePayment(address, amount) {
    try {
        const feeRate = 0.00005; // High fee rate in BTC/kB
        const totalAmount = amount + (feeRate * 1000) / 1e8;

        if (totalAmount <= 0 || isNaN(totalAmount)) {
            throw new Error(`Invalid amount: ${totalAmount} BTC`);
        }

        const txid = await client.sendToAddress(address, totalAmount.toFixed(8), '', '', true, true, null, null, false);
        console.log(`Payment sent. Transaction ID: ${txid}`);

        return txid;
    } catch (error) {
        console.error(`Error making payment: ${error.message}`);

        if (error.message.includes('Insufficient funds')) {
            console.log('Insufficient funds. Checking wallet balance...');
            const walletInfo = await client.getWalletInfo();
            const balance = walletInfo.balance;
            console.log(`Wallet balance: ${balance} BTC`);

            if (balance < amount) {
                throw new Error(`Insufficient funds. Required: ${amount} BTC, Available: ${balance} BTC`);
            }
        }

        throw error;
    }
}
makePayment: Sends the payment from the Bitcoin Core wallet to the provided address.
Wait for Payment Confirmation
Function to wait for the payment transaction to be confirmed:

javascript
Copy code
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
waitForPaymentConfirmation: Polls Bitcoin Core for the transaction confirmation status and displays a progress bar.
Wait for Reveal Transaction
Function to wait for the reveal transaction to be broadcasted and mined:

javascript
Copy code
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
waitForRevealTransaction: Polls the Ordinals Bot API for the reveal transaction and retries if necessary.
Query Inscription
Function to query the inscription details from the Ordinals Bot API:

javascript
Copy code
async function queryInscription(inscriptionId) {
    try {
        console.log(`Waiting for the inscription to be indexed...`);
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
queryInscription: Waits for the inscription to be indexed and then queries its details from the Ordinals Bot API.
Main Execution
Main function to execute the workflow:

javascript
Copy code
(async () => {
    try {
        const address = await getNewAddress();
        const imagePath = path.join(__dirname, 'images', 'thefastway.jpg');
        console.log(`Starting inscription process for image: ${imagePath}`);

        await inscribeImage(address, imagePath);
        console.log('Image inscribed successfully');
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        console.error(error.stack);
    }
})();
Main Execution: Fetches a new address, starts the inscription process, and handles errors.
Troubleshooting
Missing or Invalid Credentials: Ensure your .env file contains the correct Bitcoin Core RPC credentials.
Insufficient Funds: Check your wallet balance and ensure you have enough testnet BTC to cover the inscription fees.
Network Issues: Verify your Bitcoin Core is running and properly configured for testnet. Check your network connection and API availability.
Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

License
This project is licensed under the MIT License. See the LICENSE file for details.
