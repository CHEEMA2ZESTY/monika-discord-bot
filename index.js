// index.js
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const client = require('./bot'); // ✅ Shared client instance
require('dotenv').config();

// 📦 Initialize Firebase
require('./firebase');

// 📦 Load Slash Commands
const commands = [];
for (const folder of fs.readdirSync(path.join(__dirname, 'commands'))) {
  for (const file of fs.readdirSync(path.join(__dirname, 'commands', folder))) {
    const command = require(`./commands/${folder}/${file}`);
    if (command.data) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// 🧩 Load Event Handlers
for (const file of fs.readdirSync(path.join(__dirname, 'events'))) {
  const event = require(`./events/${file}`);
  const executor = (...args) => event.execute(...args, client);
  event.once ? client.once(event.name, executor) : client.on(event.name, executor);
}

// 🔁 Scheduled Jobs
require('./utils/monthlySellerCreditScheduler');
require('./utils/monthlyPriorityReset');
require('./cron/resetBuyerMilestones');
const { scheduleJTLDReset } = require('./utils/resetJTLDWeekly');

// 🌐 Start webhook server
require('./web');

// 🤖 Login & Register Slash Commands
client.login(process.env.TOKEN)
  .then(async () => {
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

    // ⏰ Start weekly JTLD reset
    scheduleJTLDReset(client);
  })
  .catch(console.error);
