const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Load all command files recursively with error handling
fs.readdirSync(commandsPath).forEach(folder => {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = `./commands/${folder}/${file}`;
    try {
      const command = require(filePath);

      if (command?.data?.name && typeof command.execute === 'function') {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded: /${command.data.name} (${folder}/${file})`);
      } else {
        console.warn(`⚠️ Skipped: ${folder}/${file} – Missing 'data.name' or 'execute' function`);
      }

    } catch (err) {
      console.error(`❌ Failed to load ${folder}/${file}: ${err.message}`);
    }
  }
});

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🚀 Deploying ${commands.length} command(s) to guild ${process.env.GUILD_ID}...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
