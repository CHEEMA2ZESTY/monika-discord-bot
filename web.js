// web.js
const express = require('express');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./events/paystackWebhook');
require('dotenv').config();

module.exports = (client) => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Use raw body parser for Paystack webhook route
  app.use('/paystack/webhook', express.raw({ type: 'application/json' }));

  app.post('/paystack/webhook', async (req, res) => {
    try {
      const rawBody = req.body;
      const signature = req.headers['x-paystack-signature'];

      if (!verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY)) {
        console.warn('❌ Invalid Paystack signature');
        return res.status(400).send('Invalid signature');
      }

      const event = JSON.parse(rawBody.toString('utf8'));
      handlePaystackEvent(event, client).catch(err => {
        console.error('🔥 Webhook processing error:', err);
      });

      res.status(200).send('Received');
    } catch (err) {
      console.error('🔥 Webhook error:', err);
      res.status(500).send('Webhook handler crashed');
    }
  });

  app.listen(PORT, () => {
    console.log(`🌐 Webhook server running on port ${PORT}`);
  });
};
