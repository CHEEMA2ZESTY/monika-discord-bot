// frontendLink.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

require('dotenv').config();

module.exports = (app) => {
  const router = express.Router();

  // 🔐 Route to start Discord OAuth login
  router.get('/auth/discord', (req, res, next) => {
    const redirect_uri = req.query.redirect_uri;
    if (redirect_uri) {
      req.session.redirect_uri = redirect_uri; // Store custom redirect
    }
    passport.authenticate('discord')(req, res, next);
  });

  // 🔁 OAuth callback route
  router.get(
    '/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
      if (!req.user || !req.user.id) {
        return res.redirect('/login');
      }

      // ✅ Create JWT for frontend
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      // ✅ Redirect to frontend (default or custom callback)
      const redirectTo = req.session.redirect_uri || 'https://monika-dashboard.vercel.app';
      const finalURL = `${redirectTo}?token=${token}`;
      res.redirect(finalURL);
    }
  );

  // 📜 Optional route to return current user info (useful for frontend session check)
  router.get('/auth/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      return res.json({ user: req.user });
    } else {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // 🚪 Logout route
  router.post('/auth/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
      });
    });
  });

  // ✅ Attach router
  app.use('/', router);
};
