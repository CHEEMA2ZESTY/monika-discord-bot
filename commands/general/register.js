// commands/general/register.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../firebase');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your MLBB in-game account')
    .addStringOption(option =>
      option.setName('ign')
        .setDescription('Your in-game name')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('uid')
        .setDescription('Your in-game UID')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('server')
        .setDescription('Your server ID (e.g. 10001)')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const ign = interaction.options.getString('ign');
    const uid = interaction.options.getString('uid');
    const server = interaction.options.getString('server');

    const userRef = db.collection('users').doc(userId);

    try {
      await userRef.set({ ign, uid, server }, { merge: true });

      const logChannel = interaction.client.channels.cache.get(process.env.MLBB_LOG_CHANNEL_ID);
      if (logChannel) {
        logChannel.send(
          `📋 **MLBB Registration**\n👤 <@${userId}>\n📝 IGN: \`${ign}\`\n🆔 UID: \`${uid}\`\n🌐 Server: \`${server}\``
        ).catch(console.error);
      }

      return interaction.reply({
        content: '✅ Your MLBB account has been registered successfully!',
        ephemeral: true
      });

    } catch (error) {
      console.error('❌ /register error:', error);
      return interaction.reply({
        content: '❌ Something went wrong while registering your account. Please try again later.',
        ephemeral: true
      });
    }
  }
};
