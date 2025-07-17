require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const client = require('./bot');
require('./firebase');

// ✅ Use logger.js for tracing malformed Express routes
const express = require('express');
const app = express();
require('./logger')(app); // 📦 This sets up route-level logging

// ✅ Start Express API Server
require('./web')(client);

// ✅ Environment Variable Check
if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  throw new Error('❌ Missing required environment variables in .env');
}

// 🧠 Load Slash Commands
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

// 🎧 Load Events
const eventsPath = path.join(__dirname, 'events');

for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(`./events/${file}`);
  const bind = (...args) => event.execute(...args, client);
  event.once ? client.once(event.name, bind) : client.on(event.name, bind);
}
console.log(`✅ Loaded ${fs.readdirSync(eventsPath).length} events.`);

// 🤖 Bot Login + Register Slash Commands
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

  // 🔁 Start Cron Jobs
  require('./utils/monthlySellerCreditScheduler');
  require('./utils/monthlyPriorityReset');
  require('./cron/resetBuyerMilestones');
  const { scheduleJTLDReset } = require('./utils/resetJTLDWeekly');
  scheduleJTLDReset(client);

}).catch((err) => {
  console.error('❌ Bot failed to login:', err);
});
