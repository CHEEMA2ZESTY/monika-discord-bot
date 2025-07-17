const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { verifyPaystackSignature } = require('./utils/verifyPaystack');
const handlePaystackEvent = require('./events/paystackWebhook');
const db = require('./firebase');
require('dotenv').config();

module.exports = (client) => {
  const app = express();

  const PORT = parseInt(process.env.PORT) || 8080;

  // ✅ CORS setup
  const corsOptions = {
    origin: ['http://localhost:5173', 'https://monika-dashboard.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json());
  app.options('*', cors(corsOptions));

  // ✅ Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
  });
  app.use('/api/', apiLimiter);

  // ✅ Paystack Webhook (raw body only for this route)
  app.post('/paystack/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-paystack-signature'];
      const rawBody = req.body;

      if (!verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY)) {
        console.warn('❌ Invalid Paystack signature');
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

  // ✅ Login
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

      const accessToken = jwt.sign(
        { id: user.id, username: user.username, avatar: user.avatar },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken });
    } catch (err) {
      console.error('❌ OAuth login failed:', err?.response?.data || err.message);
      res.status(500).json({ error: 'OAuth login failed' });
    }
  });

  // ✅ Refresh token
  app.post('/api/refresh', (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: 'Missing refresh token' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const newAccessToken = jwt.sign({ id: payload.id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
      });
      res.json({ accessToken: newAccessToken });
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  // ✅ Logout
  app.post('/api/logout', (req, res) => {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ success: true });
  });

  // ✅ Dashboard & Analytics (public)
  app.get('/api/dashboard', async (req, res) => {
    res.json({ totalGuilds: 4, activeUsers: 27, creditsSpent: 13200 });
  });

  app.get('/api/analytics', async (req, res) => {
    res.json({ totalXP: 92410, creditsPurchased: 25600, activeServers: 7 });
  });

  // ✅ Auth middleware
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

  // ✅ Protected API
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

  // ✅ Start server
  app.listen(PORT, () => {
    console.log(`🚀 Monika API running on port ${PORT}`);
    console.log(`✅ CORS allowed from: ${corsOptions.origin.join(', ')}`);

    // 🐛 Debug route paths
    console.log(`🔍 Registered API Routes:`);
    app._router.stack
      .filter(r => r.route && r.route.path)
      .forEach(r => {
        const methods = Object.keys(r.route.methods)
          .map(m => m.toUpperCase())
          .join(', ');
        console.log(`➡️  [${methods}] ${r.route.path}`);
      });
  });
};
