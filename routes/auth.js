// routes/auth.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Redirect to Discord for login
router.get('/discord', passport.authenticate('discord'));

// Callback from Discord after authorization
router.get('/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/login',
  session: false
}), (req, res) => {
  const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  res.redirect(`https://monika-dashboard.vercel.app?token=${token}`);
});

module.exports = router;
