const { SlashCommandBuilder } = require('discord.js');
const db = require('../../firebase');
const { Timestamp } = require('firebase-admin/firestore');
const grantXp = require('../../utils/grantXp');

const wheelRewards = [
  { type: 'xp', amount: 1000, label: 'Super XP Boost (+1,000 XP)' },
  { type: 'discount', amount: 20, label: '20% Discount Token' },
  { type: 'airtime', amount: 1000, label: '₦1,000 Airtime' },
  { type: 'airtime', amount: 2000, label: '₦2,000 Airtime 💎', rare: true },
  { type: 'merch', label: '🎁 Free Basic Merch (e.g. sticker)' },
  { type: 'discount', amount: 50, label: '🔥 50% Off Next Order', rare: true },
  { type: 'coupon', amount: 5000, label: '₦5,000 Coupon for Accounts 🧨', ultraRare: true },
  { type: 'wdp', label: '🎫 Free Weekly Diamond Pass' },
  { type: 'badge', label: 'GGS Premium Badge 🥇' },
  { type: 'extraSpin', label: '🔁 1 Extra Spin!' }
];

function spinWheel() {
  const weights = wheelRewards.map(r => r.ultraRare ? 0.2 : r.rare ? 0.5 : 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (rand <= sum) return wheelRewards[i];
  }

  return wheelRewards[0]; // fallback
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spinlegends')
    .setDescription('Spin the Wheel of Legends if you have available spins.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const userRef = db.collection('users').doc(userId);
    const statsRef = db.collection('buyerStats').doc(userId);
    const logChannel = interaction.guild.channels.cache.get(process.env.WHEEL_LOG_CHANNEL_ID);

    const statsSnap = await statsRef.get();
    const stats = statsSnap.exists ? statsSnap.data() : {};

    const spins = stats.legendSpinsAvailable || 0;
    if (spins < 1) {
      return interaction.reply({
        content: '🚫 You don’t have any **Wheel of Legends** spins available this month.',
        ephemeral: true
      });
    }

    const reward = spinWheel();
    let updates = {};
    let rewardText = reward.label;

    switch (reward.type) {
      case 'xp': {
        const { xpGained, isDouble } = await grantXp(userId, reward.amount);
        updates.buyerXP = (stats.buyerXP || 0) + xpGained;
        rewardText = `+${xpGained} XP!` + (isDouble ? ' 💊 (Blue Pill active)' : '');
        break;
      }

      case 'discount':
        updates[`discountTokens.${reward.amount}%`] = (stats.discountTokens?.[`${reward.amount}%`] || 0) + 1;
        break;

      case 'airtime':
        updates.airtimeRewards = (stats.airtimeRewards || 0) + reward.amount;
        break;

      case 'merch':
        updates.pendingMerch = true;
        break;

      case 'coupon':
        updates.couponAmount = (stats.couponAmount || 0) + reward.amount;
        break;

      case 'wdp':
        updates.freeWDP = true;
        break;

      case 'badge':
        updates.badges = [...(stats.badges || []), 'GGS Premium'];
        break;

      case 'extraSpin':
        updates.legendSpinsAvailable = spins; // no reduction
        break;
    }

    // Deduct a spin if it wasn't extraSpin
    if (reward.type !== 'extraSpin') {
      updates.legendSpinsAvailable = (updates.legendSpinsAvailable ?? spins) - 1;
    }

    await statsRef.set(updates, { merge: true });

    await interaction.reply({
      content: `🎰 You spun the **Wheel of Legends** and won: **${rewardText}**`,
      ephemeral: true
    });

    if (logChannel) {
      logChannel.send(`🎉 <@${userId}> spun the Wheel of Legends and got: **${reward.label}**`);
    }
  }
};
