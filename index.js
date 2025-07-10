const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
require('dotenv').config();

// 📦 Firebase must be initialized before cron or webhook logic
require('./firebase');

// 🧠 Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const commands = [];

// 📦 Load Slash Commands
for (const folder of fs.readdirSync(path.join(__dirname, 'commands'))) {
  for (const file of fs.readdirSync(path.join(__dirname, 'commands', folder))) {
    const command = require(`./commands/${folder}/${file}`);
    if (command.data) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }
}

// 🧩 Load Events
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

// 🌐 Webhook Setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/paystack-webhook', async (req, res) => {
  const webhookHandler = require('./paystackwebhook');
  await webhookHandler(req, res, process.env, client);
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});

// 🤖 Login Bot + Register Slash Commands + Schedule Jobs
client.login(process.env.TOKEN)
  .then(async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // 🔄 Register Slash Commands
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

    // ⏰ Schedule Weekly JTLD Reset
    scheduleJTLDReset(client);
  })
  .catch(console.error);
