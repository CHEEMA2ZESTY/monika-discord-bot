const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

const FRONTEND_URL = process.env.REDIRECT_URI.replace('/callback', ''); // from .env REDIRECT_URI
const JWT_SECRET = process.env.JWT_SECRET;

// Redirect to Discord
router.get('/discord', passport.authenticate('discord'));

// Discord Callback (for dev or fallback)
router.get(
  '/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/login',
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(req.user, JWT_SECRET, { expiresIn: '7d' });

    // For backward compatibility or testing
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${FRONTEND_URL}/dashboard`);
  }
);

// Exchange code for token (called from Callback.tsx)
router.post('/token', async (req, res) => {
  const code = req.body.code;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const data = new URLSearchParams({
      client_id: process.env.CLIENT_ID,         // your .env CLIENT_ID
      client_secret: process.env.CLIENT_SECRET, // your .env CLIENT_SECRET
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,   // your .env REDIRECT_URI
    });

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = userRes.data;

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// Check user via cookie
router.get('/me', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ user: decoded });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
