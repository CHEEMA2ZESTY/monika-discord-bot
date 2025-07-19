// frontendLink.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router(); // ✅ Using Express's built-in Router

// Discord Login
router.get('/auth/discord', passport.authenticate('discord'));

// Discord OAuth Callback
router.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // ✅ Redirect user to the frontend with token in query
    res.redirect(`https://monika-dashboard.vercel.app?token=${token}`);
  }
);

module.exports = router;
