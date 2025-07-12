// commands/admin/timeout.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily timeout a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Timeout duration in minutes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for timeout')
        .setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(user.id);
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Permission check
    const staffRoles = [
      process.env.ADMIN_ROLE_ID,
      process.env.MOD_ROLE_ID,
      process.env.STAFF_ROLE_ID
    ];

    const hasPermission = interaction.member.roles.cache.some(r =>
      staffRoles.includes(r.id)
    ) || interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    if (!member) {
      return interaction.reply({
        content: '❌ User not found in this server.',
        ephemeral: true
      });
    }

    try {
      const durationMs = duration * 60 * 1000;
      await member.timeout(durationMs, reason);

      await interaction.reply({
        content: `⏳ <@${user.id}> has been timed out for **${duration} minute(s)**.\nReason: *${reason}*`
      });

      // Log to mod channel
      const logChannel = interaction.guild.channels.cache.get(process.env.MOD_LOG_CHANNEL_ID);
      if (logChannel) {
        logChannel.send(`⏳ <@${user.id}> was **timed out** by <@${interaction.user.id}> for ${duration}m. Reason: *${reason}*`);
      }
    } catch (err) {
      console.error('❌ Timeout failed:', err);
      return interaction.reply({
        content: '❌ Failed to timeout the user.',
        ephemeral: true
      });
    }
  }
};
