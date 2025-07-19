const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./events/paystackWebhook');
const db = require('./firebase');
require('dotenv').config();
require('./utils/logger');

module.exports = (client, app) => {
  const PORT = parseInt(process.env.PORT) || 8080;

  app.use(cookieParser());
  app.use(express.json());

  // ✅ Paystack Webhook Route
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

  // 🔐 Auth Token Exchange Route
  app.post('/auth/token', async (req, res) => {
    const code = req.body.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    try {
      const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI,
      });

      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.status(400).json({ error: 'Invalid token exchange', detail: tokenData });
      }

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const user = await userRes.json();

      const payload = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      // 🍪 Set JWT as HttpOnly cookie
      res.cookie('monika_jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax', // or 'None' if cross-site requests are needed
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('❌ Error exchanging token:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🔐 JWT Middleware (reads from cookie!)
  const authMiddleware = (req, res, next) => {
    const token = req.cookies.monika_jwt;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  // 🔒 Secure API Routes
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

  console.log('✅ Backend API routes registered');
};
