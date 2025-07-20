require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const { REST, Routes } = require('discord.js');
const client = require('./bot');

// ✅ Firebase, Logger, Passport Strategy
require('./firebase');
require('./utils/logger');
require('./auth/passport');

const app = express();

// ✅ Allowed Origins (local + Vercel frontend)
const allowedOrigins = [
  'http://localhost:5173',
  'https://monika-dashboard.vercel.app'
];

// ✅ CORS (MUST come before any session/cookie middleware)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
}));

// ✅ Required Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'None',               // 🔥 Allows cross-site cookies
    secure: true,                   // 🔐 Must be true for production (HTTPS only)
    httpOnly: true,                 // 🛡️ Prevents JS access
  }
}));

// ✅ Passport Auth
app.use(passport.initialize());
app.use(passport.session());

// 🔗 Auth routes (/auth/discord, /auth/token, etc.)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 🔗 Serve frontend preview (for dev/testing)
require('./frontendLink')(app);

// 🎯 Main app logic (APIs, webhooks, etc.)
require('./web')(client, app);

// 🟢 Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is live on port ${PORT}`);
});

// 🌍 Required ENV Check
if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  throw new Error('❌ Missing required environment variables in .env');
}

// 🛠 Load & Register Slash Commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
    const command = require(`./commands/${folder}/${file}`);
    if (command?.data) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}
console.log(`✅ Loaded ${commands.length} slash commands.`);

// 📡 Load Event Handlers
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(`./events/${file}`);
  const bind = (...args) => event.execute(...args, client);
  event.once ? client.once(event.name, bind) : client.on(event.name, bind);
}
console.log(`✅ Loaded ${fs.readdirSync(eventsPath).length} events.`);

// 🤖 Start Discord Bot
client.login(process.env.TOKEN).then(async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }

  // 📆 Schedule Tasks
  require('./utils/monthlySellerCreditScheduler');
  require('./utils/monthlyPriorityReset');
  require('./cron/resetBuyerMilestones');
  const { scheduleJTLDReset } = require('./utils/resetJTLDWeekly');
  scheduleJTLDReset(client);
}).catch((err) => {
  console.error('❌ Bot failed to login:', err);
});
