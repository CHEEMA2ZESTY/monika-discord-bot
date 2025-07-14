const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./events/paystackWebhook');
const db = require('./firebase');
require('dotenv').config();

module.exports = (client) => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // ✅ Only use raw body parser for this route
  app.use('/paystack/webhook', express.raw({ type: 'application/json' }));

  // ✅ Global Middleware (excluding /paystack/webhook)
  app.use((req, res, next) => {
    if (req.originalUrl === '/paystack/webhook') return next();
    cors({
      origin: ['http://localhost:5173', 'https://your-frontend-site.com'],
      credentials: true,
    })(req, res, () => {
      express.json()(req, res, next);
    });
  });

  // ✅ Paystack webhook
  app.post('/paystack/webhook', async (req, res) => {
    try {
      const rawBody = req.body;
      const signature = req.headers['x-paystack-signature'];
      if (!verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY)) {
        console.warn('❌ Invalid Paystack signature');
        return res.status(400).send('Invalid signature');
      }

      const event = JSON.parse(rawBody.toString('utf8'));
      handlePaystackEvent(event, client).catch(console.error);
      res.status(200).send('Received');
    } catch (err) {
      console.error('🔥 Webhook error:', err);
      res.status(500).send('Webhook handler crashed');
    }
  });

  // 🔐 JWT Middleware
  function authMiddleware(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // 🔐 Discord OAuth Handler
  app.post('/api/login', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    try {
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.REDIRECT_URI,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token } = tokenResponse.data;
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const user = userResponse.data;

      const token = jwt.sign(
        { id: user.id, username: user.username, avatar: user.avatar },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({ token });
    } catch (err) {
      console.error('❌ OAuth login failed:', err?.response?.data || err.message);
      res.status(500).json({ error: 'OAuth login failed' });
    }
  });

  // ✅ Protected Routes
  app.use('/api', authMiddleware);

  app.get('/api/me', (req, res) => res.json(req.user));

  app.get('/api/dashboard', async (req, res) => {
    res.json({ totalGuilds: 4, activeUsers: 27, creditsSpent: 13200 });
  });

  app.get('/api/analytics', async (req, res) => {
    res.json({ totalXP: 92410, creditsPurchased: 25600, activeServers: 7 });
  });

  app.get('/api/users', async (req, res) => {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  });

  app.get('/api/guilds/:guildId', async (req, res) => {
    const doc = await db.collection('guildSettings').doc(req.params.guildId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Guild not found' });
    res.json(doc.data());
  });

  app.post('/api/guilds/:guildId', async (req, res) => {
    await db.collection('guildSettings').doc(req.params.guildId).set(req.body, { merge: true });
    res.json({ success: true });
  });

  app.listen(PORT, () => {
    console.log(`🌐 API server running on port ${PORT}`);
  });
};
