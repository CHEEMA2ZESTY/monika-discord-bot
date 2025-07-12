// commands/admin/warn.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const db = require('../../firebase');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user and log it. Auto-bans at 6 warnings.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;
    const moderator = interaction.user;

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: '❌ Could not find that user in this server.',
        ephemeral: true
      });
    }

    const staffRoles = [
      process.env.ADMIN_ROLE_ID,
      process.env.MOD_ROLE_ID,
      process.env.STAFF_ROLE_ID
    ];

    const isStaff = member.roles.cache.some(role =>
      staffRoles.includes(role.id)
    );

    if (isStaff) {
      return interaction.reply({
        content: '❌ You cannot warn another staff member.',
        ephemeral: true
      });
    }

    const warnRef = db.collection('warnings').doc(targetUser.id);
    const warnSnap = await warnRef.get();
    const currentWarnings = warnSnap.exists ? warnSnap.data().count || 0 : 0;

    const newWarnings = currentWarnings + 1;

    await warnRef.set({
      count: newWarnings,
      lastWarnedAt: Date.now(),
      lastReason: reason,
      lastModerator: moderator.id
    }, { merge: true });

    const logChannel = interaction.guild.channels.cache.get(process.env.MOD_LOGS_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ User Warned`)
      .setColor('Yellow')
      .addFields(
        { name: 'User', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Total Warnings', value: `${newWarnings}/6`, inline: true }
      )
      .setTimestamp();

    if (logChannel) logChannel.send({ embeds: [embed] }).catch(console.error);

    if (newWarnings >= 6) {
      try {
        await member.ban({ reason: `Auto-ban: Reached ${newWarnings} warnings` });

        const banEmbed = new EmbedBuilder()
          .setTitle(`🚫 User Auto-Banned`)
          .setColor('Red')
          .setDescription(`<@${targetUser.id}> has been automatically banned for reaching 6 warnings.`)
          .addFields(
            { name: 'Reason', value: `Reached 6 warnings\nLast reason: ${reason}` },
            { name: 'Moderator', value: `<@${moderator.id}>` }
          )
          .setTimestamp();

        if (logChannel) logChannel.send({ embeds: [banEmbed] }).catch(console.error);
        await interaction.reply({
          content: `🚫 <@${targetUser.id}> was automatically **banned** after receiving their 6th warning.`,
          ephemeral: true
        });
      } catch (err) {
        console.error('❌ Failed to auto-ban user:', err);
        await interaction.reply({
          content: `⚠️ Warning added, but failed to ban <@${targetUser.id}>.`,
          ephemeral: true
        });
      }
    } else {
      await interaction.reply({
        content: `⚠️ <@${targetUser.id}> has been warned. They now have **${newWarnings}/6** warnings.`,
        ephemeral: true
      });
    }
  }
};
