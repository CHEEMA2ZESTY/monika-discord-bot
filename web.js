// web.js
const express = require('express');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./webhooks/paystackwebhook');
const client = require('./bot'); // ✅ Shared client instance
const config = require('./config');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse raw body only for this route
app.use('/paystack/webhook', express.raw({ type: 'application/json' }));

app.post('/paystack/webhook', async (req, res) => {
  try {
    const rawBody = req.body;
    const signature = req.headers['x-paystack-signature'];

    const isValid = verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY);
    if (!isValid) {
      console.warn('❌ Invalid Paystack signature');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    req.body = event; // Emulate JSON body for handler

    await handlePaystackEvent(req, res, config, client);
  } catch (err) {
    console.error('🔥 Webhook error:', err);
    res.status(500).send('Webhook handler crashed');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Webhook server running on port ${PORT}`);
});
