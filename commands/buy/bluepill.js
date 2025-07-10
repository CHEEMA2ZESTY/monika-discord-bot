const { SlashCommandBuilder } = require('discord.js');
const { Timestamp } = require('firebase-admin/firestore');
const db = require('../../firebase');
const { saveReference } = require('../../utils/paymentReferences');
const { isOnCooldown, getCooldownRemaining } = require('../../utils/cooldowns');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buybluepill')
    .setDescription('Buy the Blue Pill to double your XP rewards for 24 hours'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const userData = doc.exists ? doc.data() : {};

    // ❌ Check unified cooldown
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

    // 🔗 Save reference for webhook to verify
    const reference = `bluepill_${userId}_${now}`;
    saveReference(reference, userId, 'bluepill');

    const paystackLink = `https://paystack.com/buy/blue-pill-aiuyyd`;

    await interaction.reply({
      content: `💊 Click below to buy the **Blue Pill** and enjoy **double XP** for 24 hours:\n${paystackLink}`,
      ephemeral: true
    });
  }
};
