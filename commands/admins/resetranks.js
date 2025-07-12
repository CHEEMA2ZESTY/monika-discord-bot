const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetranks')
    .setDescription('Reset XP and rank for all users.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return interaction.editReply('No users found in database.');
    }

    const batch = db.batch();
    snapshot.forEach(doc => {
      const userRef = usersRef.doc(doc.id);
      batch.update(userRef, {
        xp: 0,
        level: 1,
        dailyMessageCount: 0,
        messageXPDate: null
      });
    });

    await batch.commit();

    return interaction.editReply('✅ Successfully reset XP and rank for all users.');
  }
};
