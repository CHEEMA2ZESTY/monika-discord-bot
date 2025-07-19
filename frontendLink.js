// frontendLink.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

require('dotenv').config();

module.exports = (app) => {
  const router = express.Router();

  // 🔐 Route to start Discord OAuth login
  router.get('/auth/discord', passport.authenticate('discord'));

  // 🔁 OAuth callback route
  router.get(
    '/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login', session: false }),
    (req, res) => {
      if (!req.user || !req.user.id) {
        return res.redirect('/login'); // safety check
      }

      // ✅ Sign a JWT token for frontend use
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      // ✅ Redirect to frontend with token
      res.redirect(`https://monika-dashboard.vercel.app?token=${token}`);
    }
  );

  // ✅ Attach router to app
  app.use('/', router);
};
