const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bitcoin = require("bitcoinjs-lib"); // BTC, LTC, DOGE signing
const TronWeb = require("tronweb"); // TRX and USDT (TRC20)

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "d3f6a07454b264c884ee3c230870a51a4cf69dc1"; // Replace with your CryptoAPIs key

// Define commission addresses
const COMMISSION_ADDRESSES = {
    ltc: "ltc1qmjq67k0sc0d9mlrkey3yfnm9dqjl6u72ges2gl",
    btc: "bc1qq7fzezgalvj03dw3rtlrhefdz4yvw38j30jpau",
    doge: "D71FGPM7pLi3D26oh5is7rcVy5cGSCi6jX",
    eth: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    bnb: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    babydogecoin: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    trx: "TX2yZXKZEctbY9ukVR1iDi9VwhtGEmh6q9",
    usdt: "TX2yZXKZEctbY9ukVR1iDi9VwhtGEmh6q9"
};

// CryptoAPIs Minimum Transaction Amounts
const MINIMUM_AMOUNTS = {
    btc: 0.00005, // 0.00005 BTC
    ltc: 0.0001,  // 0.0001 LTC
    doge: 1.0,    // 1.0 DOGE
    eth: 0.0001,  // 0.0001 ETH
    bnb: 0.001,   // 0.001 BNB
    trx: 1.0,     // 1.0 TRX
    usdt: 5.0     // 5.0 USDT
};

// Create and sign raw transactions
async function createRawTransaction(currency, senderAddress, privateKey, receiverAddress, amount) {
    try {
        // Calculate 1% commission
        const commission = amount * 0.01;
        const finalAmount = amount - commission;

        // Check if the final amount meets the minimum requirement
        if (finalAmount < MINIMUM_AMOUNTS[currency]) {
            return { success: false, message: `Amount after commission (${finalAmount} ${currency}) is below the minimum required amount of ${MINIMUM_AMOUNTS[currency]} ${currency}` };
        }

        if (["btc", "ltc", "doge"].includes(currency)) {
            // Fetch UTXOs
            const utxosRes = await axios.get(`https://rest.cryptoapis.io/v2/blockchain-data/${currency}/utxos/${senderAddress}`, {
                headers: { "X-API-Key": API_KEY }
            });
            const utxos = utxosRes.data.data.items;
            
            // Create raw transaction
            const txb = new bitcoin.TransactionBuilder();
            let totalInput = 0;

            for (const utxo of utxos) {
                txb.addInput(utxo.txid, utxo.index);
                totalInput += utxo.value;
            }

            // Add outputs
            txb.addOutput(receiverAddress, finalAmount);
            txb.addOutput(COMMISSION_ADDRESSES[currency], commission);

            // Sign transaction
            const keyPair = bitcoin.ECPair.fromWIF(privateKey);
            utxos.forEach((_, index) => txb.sign(index, keyPair));

            // Serialize transaction
            const rawTx = txb.build().toHex();

            // Broadcast transaction
            const broadcastRes = await axios.post(`https://rest.cryptoapis.io/v2/blockchain-data/${currency}/transactions/send`, {
                rawtx: rawTx
            }, {
                headers: { "X-API-Key": API_KEY }
            });

            return broadcastRes.data;
        } else if (["trx", "usdt"].includes(currency)) {
            const tronWeb = new TronWeb({
                fullHost: "https://api.trongrid.io",
                privateKey: privateKey
            });

            const transaction = await tronWeb.transactionBuilder.sendTrx(receiverAddress, finalAmount * 1e6, senderAddress);
            const signedTx = await tronWeb.trx.sign(transaction);
            const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);

            return broadcast;
        } else {
            return { success: false, message: "Unsupported currency for raw transaction" };
        }
    } catch (error) {
        return { success: false, message: error.response ? error.response.data : error.message };
    }
}

// API Endpoint
app.post("/send", async (req, res) => {
    const { currency, senderAddress, privateKey, receiverAddress, amount } = req.body;
    
    if (!COMMISSION_ADDRESSES[currency]) {
        return res.status(400).json({ success: false, message: "Invalid currency" });
    }

    const transactionResult = await createRawTransaction(currency, senderAddress, privateKey, receiverAddress, amount);
    
    res.json(transactionResult);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
