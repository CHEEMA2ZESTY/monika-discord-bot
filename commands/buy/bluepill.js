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
    const channelId = interaction.channel.id;

    // ⏳ Defer early to avoid timeout
    await interaction.deferReply({ ephemeral: true });

    // ⏳ Cooldown check
    const onCooldown = await isOnCooldown(userId);
    if (onCooldown) {
      const remaining = await getCooldownRemaining(userId);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.editReply({
        content: `⏳ You must wait **${hours}h ${minutes}m** before buying another pill.`
      });
    }

    // 🧾 Generate unique reference and save it
    const reference = `bluepill_${userId}_${Date.now()}`;
    const metadata = {
      discordUserId: userId,
      channelId,
      pillType: 'blue',
      category: 'boost'
    };

    await saveReference(reference, userId, metadata);

    try {
      const paystackLink = await generatePaystackLink({
        amount: 10000, // ₦100 in kobo
        email: 'boost@monika.gg',
        reference,
        metadata
      });

      await interaction.editReply({
        content: `💊 Click below to buy the **Blue Pill** and enjoy **double XP** for 24 hours:\n${paystackLink}`
      });
    } catch (err) {
      console.error('❌ Failed to create Paystack link:', err);
      await interaction.editReply({
        content: '❌ Failed to generate Paystack link. Please try again shortly.'
      });
    }
  }
};
