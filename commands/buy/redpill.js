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

    const onCooldown = await isOnCooldown(userId);
    if (onCooldown) {
      const remaining = await getCooldownRemaining(userId);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `⏳ You’ve already bought a pill today. Please wait **${hours}h ${minutes}m** before buying another one.`,
        ephemeral: true,
      });
    }

    const reference = `redpill_${userId}_${Date.now()}`;
    await saveReference(reference, userId, {
      discordUserId: userId,
      pillType: 'red',
      category: 'other'
    });

    // Use a fixed default email here
    const paystackLink = await generatePaystackLink({
      amount: 50000, // ₦500 in kobo
      email: 'buyer@monika.gg',
      reference,
      metadata: {
        discordUserId: userId,
        pillType: 'red',
        category: 'other'
      }
    });

    await interaction.reply({
      content: `❤️ Click below to buy the **Red Pill** and spin the **Wheel of Fate**:\n${paystackLink}`,
      ephemeral: true,
    });
  }
};
