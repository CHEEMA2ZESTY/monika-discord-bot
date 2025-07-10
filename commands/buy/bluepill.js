const { SlashCommandBuilder } = require('discord.js');
const { saveReference } = require('../../utils/paymentReferences');
const { isOnCooldown, getCooldownRemaining } = require('../../utils/cooldowns');
const generatePaystackLink = require('../../utils/generatePaystackLink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buybluepill')
    .setDescription('Buy the Blue Pill to double your XP rewards for 24 hours'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // ⏳ Check cooldown
    const onCooldown = await isOnCooldown(userId);
    if (onCooldown) {
      const remaining = await getCooldownRemaining(userId);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({
        content: `⏳ You must wait **${hours}h ${minutes}m** before buying another pill.`,
        ephemeral: true
      });
    }

    // 🧾 Generate unique reference
    const reference = `bluepill_${userId}_${Date.now()}`;
    await saveReference(reference, userId, {
      discordUserId: userId,
      pillType: 'blue',
      category: 'boost'
    });

    // 💳 Create Paystack payment link
    const paystackLink = await generatePaystackLink({
      amount: 10000, // ₦100 in kobo
      email: interaction.user.email ?? 'boost@monika.gg',
      reference,
      metadata: {
        discordUserId: userId,
        pillType: 'blue',
        category: 'boost'
      }
    });

    await interaction.reply({
      content: `💊 Click below to buy the **Blue Pill** and enjoy **double XP** for 24 hours:\n${paystackLink}`,
      ephemeral: true
    });
  }
};
