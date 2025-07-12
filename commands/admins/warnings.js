const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View all warnings for a user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to view warnings for').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const doc = await db.collection('warnings').doc(user.id).get();

    if (!doc.exists || !doc.data().warnings?.length) {
      return interaction.reply({ content: `✅ <@${user.id}> has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${user.username}`)
      .setColor('Orange')
      .setDescription(doc.data().warnings.map((warn, i) =>
        `**#${i + 1}** – ${warn.reason}\nModerator: <@${warn.moderator}> | <t:${Math.floor(warn.timestamp / 1000)}:R>`
      ).join('\n\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
