const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./events/paystackWebhook');
const db = require('./firebase');
require('dotenv').config();
require('./utils/logger');

module.exports = (client) => {
  const app = express();
  const PORT = parseInt(process.env.PORT) || 8080;

  app.use(cookieParser());
  app.use(express.json());

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
  });
  app.use('/api/', apiLimiter);

  // Paystack Webhook
  app.post('/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-paystack-signature'];
      const rawBody = req.body;

      if (!verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY)) {
        return res.status(400).send('Invalid signature');
      }

      const event = JSON.parse(rawBody.toString('utf8'));
      await handlePaystackEvent(event, client);
      res.status(200).send('Received');
    } catch (err) {
      console.error('🔥 Webhook error:', err);
      res.status(500).send('Webhook handler crashed');
    }
  });

  // Auth middleware
  const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  // Protected API Routes (Discord backend settings)
  const secureApi = express.Router();
  secureApi.use(authMiddleware);

  secureApi.get('/me', (req, res) => {
    res.json(req.user);
  });

  secureApi.get('/users', async (req, res) => {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  });

  secureApi.get('/guilds/:guildId', async (req, res) => {
    const doc = await db.collection('guildSettings').doc(req.params.guildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Guild not found' });
    res.json(doc.data());
  });

  secureApi.post('/guilds/:guildId', async (req, res) => {
    await db.collection('guildSettings').doc(req.params.guildId).set(req.body, { merge: true });
    res.json({ success: true });
  });

  app.use('/api', secureApi);

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Monika API running on port ${PORT}`);
    
    if (app._router?.stack) {
      console.log(`🔍 Registered API Routes:`);
      app._router.stack
        .filter(r => r.route && r.route.path)
        .forEach(r => {
          const methods = Object.keys(r.route.methods)
            .map(m => m.toUpperCase())
            .join(', ');
          console.log(`➡️  [${methods}] ${r.route.path}`);
        });
    }
  });
};
