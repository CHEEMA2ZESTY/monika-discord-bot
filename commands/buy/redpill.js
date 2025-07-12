const { SlashCommandBuilder } = require('discord.js');
const { isOnCooldown, getCooldownRemaining } = require('../../utils/cooldowns');
const { saveReference } = require('../../utils/paymentReferences');
const generatePaystackLink = require('../../utils/generatePaystackLink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buyredpill')
    .setDescription('Buy the Red Pill for a spin on the Wheel of Fate'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;

    await interaction.deferReply({ ephemeral: true });

    const onCooldown = await isOnCooldown(userId);
    if (onCooldown) {
      const remaining = await getCooldownRemaining(userId);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.editReply({
        content: `⏳ You’ve already bought a pill today. Please wait **${hours}h ${minutes}m** before buying another one.`
      });
    }

    const reference = `redpill_${userId}_${Date.now()}`;
    const metadata = {
      discordUserId: userId,
      channelId,
      pillType: 'red',
      category: 'other'
    };

    await saveReference(reference, userId, metadata);

    try {
      const paystackLink = await generatePaystackLink({
        amount: 10000,
        email: 'buyer@monika.gg',
        reference,
        metadata
      });

      await interaction.editReply({
        content: `❤️ Click below to buy the **Red Pill** and spin the **Wheel of Fate**:\n${paystackLink}`
      });
    } catch (err) {
      console.error('❌ Failed to create Paystack link:', err);
      await interaction.editReply({
        content: '❌ Failed to generate Paystack link. Please try again shortly.'
      });
    }
  }
};
