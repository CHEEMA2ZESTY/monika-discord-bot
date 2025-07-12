// commands/admin/announce.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send a styled embed announcement in a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send the announcement to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the announcement')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Main content of the announcement')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Hex color (e.g. #ff0000)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Footer text')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const color = interaction.options.getString('color') || '#2f3136';
    const footer = interaction.options.getString('footer') || '';

    const staffRoles = [
      process.env.ADMIN_ROLE_ID,
      process.env.MOD_ROLE_ID,
      process.env.STAFF_ROLE_ID
    ];

    const hasPermission = interaction.member.roles.cache.some(role =>
      staffRoles.includes(role.id)
    ) || interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor(color)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({
        content: `📢 Announcement sent in <#${channel.id}>`,
        ephemeral: true
      });
    } catch (err) {
      console.error('❌ Failed to send announcement:', err);
      await interaction.reply({
        content: '❌ Failed to send the announcement.',
        ephemeral: true
      });
    }
  }
};
