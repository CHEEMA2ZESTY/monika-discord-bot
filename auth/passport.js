const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('../firebase'); // Adjust path if needed

require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) return done(null, null);
    done(null, userDoc.data());
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI, // Must match the one in Discord Developer Portal
      scope: ['identify', 'guilds'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userData = {
          id: profile.id,
          username: profile.username,
          avatar: profile.avatar,
          discriminator: profile.discriminator,
        };

        await db.collection('users').doc(profile.id).set(userData, { merge: true });
        return done(null, userData);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
