// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const client = require('./bot'); // ✅ Shared client
require('./firebase'); // ✅ Firebase init

// 🧠 Set up command collection
const commands = [];

// 📁 Load Slash Commands
const commandsPath = path.join(__dirname, 'commands');
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath)) {
    const command = require(`./commands/${folder}/${file}`);
    if (command?.data) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// 🎧 Load Events
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath)) {
  const event = require(`./events/${file}`);
  const bind = (...args) => event.execute(...args, client);
  event.once ? client.once(event.name, bind) : client.on(event.name, bind);
}

// ⏰ Cron + Schedulers
require('./utils/monthlySellerCreditScheduler');
require('./utils/monthlyPriorityReset');
require('./cron/resetBuyerMilestones');
const { scheduleJTLDReset } = require('./utils/resetJTLDWeekly');

// 🤖 Bot Login
client.login(process.env.TOKEN).then(async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 📤 Register Slash Commands
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

  // ⏰ JTLD Reset (Weekly)
  scheduleJTLDReset(client);

  // 🌐 Start Webhook Server
  require('./web')(client);
}).catch((err) => {
  console.error('❌ Bot failed to login:', err);
});
