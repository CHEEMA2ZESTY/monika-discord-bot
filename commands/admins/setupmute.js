const { SlashCommandBuilder } = require('discord.js');
const applyMutePermissions = require('../../utils/applyMutePermissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupmute')
    .setDescription('Force apply the muted role permission deny across all channels (admin only)'),

  async execute(interaction) {
    const member = interaction.member;

    // Optional: check if user is admin/staff/mod
    const allowedRoles = [
      process.env.ADMIN_ROLE_ID,
      process.env.MOD_ROLE_ID,
      process.env.STAFF_ROLE_ID
    ];
    const hasPermission = member.roles.cache.some(r => allowedRoles.includes(r.id));

    if (!hasPermission) {
      return interaction.reply({
        content: '🚫 You do not have permission to use this command.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await applyMutePermissions(interaction.guild, process.env.MUTED_ROLE_ID);
      await interaction.editReply('✅ Mute permissions have been applied to all channels.');
    } catch (err) {
      console.error('🔥 Failed to apply mute permissions:', err);
      await interaction.editReply('❌ Failed to apply mute permissions. Check console for errors.');
    }
  }
};
