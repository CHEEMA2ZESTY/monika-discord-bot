const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetcredits')
    .setDescription('Reset buyer/seller credits for all users.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of credits to reset')
        .setRequired(true)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Buyers Only', value: 'buyer' },
          { name: 'Sellers Only', value: 'seller' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    await interaction.deferReply({ ephemeral: true });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return interaction.editReply('No users found in database.');
    }

    const batch = db.batch();
    snapshot.forEach(doc => {
      const userRef = usersRef.doc(doc.id);
      if (type === 'all') {
        batch.update(userRef, {
          buyerCredits: 0,
          sellerCredits: 0
        });
      } else if (type === 'buyer') {
        batch.update(userRef, { buyerCredits: 0 });
      } else if (type === 'seller') {
        batch.update(userRef, { sellerCredits: 0 });
      }
    });

    await batch.commit();

    return interaction.editReply(`✅ Successfully reset **${type}** credits for all users.`);
  }
};
