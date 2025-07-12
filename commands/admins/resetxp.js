const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription('Reset XP for all users')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const snapshot = await db.collection('users').get();
    const batch = db.batch();

    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        xp: 0,
        buyerXP: 0,
        sellerXP: 0
      });
    });

    await batch.commit();
    await interaction.reply({ content: '✅ All user XP has been reset.', ephemeral: true });
  }
};
