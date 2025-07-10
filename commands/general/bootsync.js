const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { handleBoostSync } = require('../../utils/boostSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boostsync')
    .setDescription('Manually trigger monthly boost reward sync')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    // 🔒 Confirm admin permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '🚫 You don’t have permission to use this command.',
        ephemeral: true
      });
    }

    // ⏳ Prevent timeout
    await interaction.deferReply({ ephemeral: true });

    try {
      await handleBoostSync(interaction.guild);

      return interaction.editReply('✅ Boost reward sync complete. Roles and XP have been updated.');
    } catch (err) {
      console.error('❌ Boost sync failed:', err);
      return interaction.editReply('❌ Failed to sync boost rewards. Check logs for more details.');
    }
  }
};
