const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user manually')
    .addUserOption(option =>
      option.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const muteRoleId = process.env.MUTED_ROLE_ID;

    if (!muteRoleId) {
      return interaction.reply({ content: '❌ Muted role not configured.', ephemeral: true });
    }

    await member.roles.remove(muteRoleId);
    await interaction.reply({ content: `🔊 <@${user.id}> has been unmuted.`, ephemeral: true });
  }
};
