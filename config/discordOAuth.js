// config/discordOAuth.js
const passport = require('passport');
const { Strategy } = require('passport-discord');
const jwt = require('jsonwebtoken');

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new Strategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.REDIRECT_URI,
  scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Add custom logic here if you want to save the user to a database
    return done(null, profile);
  } catch (err) {
    console.error('Error in Discord Strategy:', err);
    return done(err, null);
  }
}));
