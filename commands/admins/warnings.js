const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View all warnings for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view warnings for')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');

    const userRef = db.collection('warnings').doc(user.id);
    const doc = await userRef.get();

    if (!doc.exists || !doc.data().warnings || doc.data().warnings.length === 0) {
      return interaction.reply({
        content: `✅ <@${user.id}> has no warnings.`,
        ephemeral: true
      });
    }

    const warnings = doc.data().warnings;

    // Sort latest first
    const sortedWarnings = warnings.sort((a, b) => b.timestamp - a.timestamp);

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${user.tag}`)
      .setColor('Orange')
      .setDescription(
        sortedWarnings.map((warn, index) => {
          const reason = warn.reason || 'No reason provided';
          const mod = warn.moderator ? `<@${warn.moderator}>` : 'Unknown';
          const time = warn.timestamp
            ? `<t:${Math.floor(warn.timestamp / 1000)}:R>`
            : 'Unknown time';

          return `**#${index + 1}** – ${reason}\nModerator: ${mod} | ${time}`;
        }).join('\n\n')
      )
      .setFooter({ text: `Total warnings: ${warnings.length}` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
