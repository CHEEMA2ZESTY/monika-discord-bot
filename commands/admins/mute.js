const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to mute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);
    const muteRoleId = process.env.MUTED_ROLE_ID;

    if (!muteRoleId) {
      return interaction.reply({ content: '❌ Muted role not set.', ephemeral: true });
    }

    await member.roles.add(muteRoleId);
    await interaction.reply({ content: `🔇 <@${user.id}> has been muted.`, ephemeral: true });
  }
};
