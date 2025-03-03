const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const COMMISSION_ADDRESS = {
    ltc: "ltc1qmjq67k0sc0d9mlrkey3yfnm9dqjl6u72ges2gl",
    btc: "bc1qq7fzezgalvj03dw3rtlrhefdz4yvw38j30jpau",
    doge: "D71FGPM7pLi3D26oh5is7rcVy5cGSCi6jX",
    eth: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    bnb: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    babydoge: "0x3Aa191e00F46e59B152f9d6233ac4204dc4C3E86",
    trx: "TX2yZXKZEctbY9ukVR1iDi9VwhtGEmh6q9",
    usdt: "TX2yZXKZEctbY9ukVR1iDi9VwhtGEmh6q9"
};

app.post("/send", async (req, res) => {
    const { currency, amount } = req.body;
    const commission = amount * 0.01;
    const finalAmount = amount - commission;
    const commissionAddress = COMMISSION_ADDRESS[currency];

    if (finalAmount <= 0) {
        return res.status(400).json({ error: "Amount too small after commission" });
    }

    try {
        const response = await axios.post(
            `https://rest.cryptoapis.io/v2/blockchain-transactions/${currency}/mainnet`,
            {
                fromAddress: "sender-address",
                toAddress: "receiver-address",
                amount: finalAmount.toString(),
                privateKey: "private-key",
                commission: { address: commissionAddress, amount: commission.toString() }
            },
            { headers: { "X-API-Key": "d3f6a07454b264c884ee3c230870a51a4cf69dc1" } }
        );

        res.json({ message: "Transaction sent!", data: response.data });
    } catch (error) {
        res.status(500).json({ error: error.response?.data || "Transaction failed" });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
