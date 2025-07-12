const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingeveryone')
    .setDescription('Ping everyone in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      content: '@everyone 🔔 Attention everyone!',
      allowedMentions: { parse: ['everyone'] }
    });
  }
};
