const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');
const admin = require('firebase-admin');
const FieldValue = admin.firestore.FieldValue;

const {
  ensureUser,
  isSpinOnCooldown,
  getCooldownRemaining,
  setSpinCooldown
} = require('../../utils/spin');

const grantXp = require('../../utils/grantXp');

// Weighted rewards
const rewards = [
  { type: 'xp', amount: 100, label: '+100 XP', weight: 25 },
  { type: 'xp', amount: 300, label: '+300 XP', weight: 20 },
  { type: 'credits', amount: 200, label: '₡200', weight: 20 },
  { type: 'credits', amount: 500, label: '₡500', weight: 15 },
  { type: 'xp', amount: 500, label: '+500 XP', weight: 7 },
  { type: 'credits', amount: 1000, label: '₡1000', weight: 5 },
  { type: 'item', label: '🎟️ Weekly Diamond Pass', rewardId: 'wdp', weight: 3 },
  { type: 'item', label: '✨ Starlight Member', rewardId: 'starlight', weight: 2 },
  { type: 'item', label: '💎 Discord Nitro (1 Month)', rewardId: 'nitro', weight: 1 },
  { type: 'none', label: '😔 Try Again Later', weight: 8 }
];

// Weighted selection
function weightedRandom(rewards) {
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const reward of rewards) {
    if (rand < reward.weight) return reward;
    rand -= reward.weight;
  }
  return rewards[rewards.length - 1];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spin')
    .setDescription('Spin the Wheel of Fate using your Red Pill spin'),

  async execute(interaction) {
    const userId = interaction.user.id;
    await interaction.deferReply({ ephemeral: true });

    try {
      const user = await ensureUser(userId);
      const userRef = db.collection('users').doc(userId);

      if (!user.spinCount || user.spinCount < 1) {
        return interaction.editReply('❌ You don’t have any spins available. Buy a Red Pill to get spins!');
      }

      const onCooldown = await isSpinOnCooldown(userId);
      if (onCooldown) {
        const remaining = await getCooldownRemaining(userId);
        return interaction.editReply(`⏳ You need to wait **${remaining}** before spinning again.`);
      }

      const reward = weightedRandom(rewards);
      const updateData = {
        lastSpin: Date.now(),
        spinCount: FieldValue.increment(-1)
      };

      let replyMessage = '';

      switch (reward.type) {
        case 'xp': {
          const { xpGained, isDouble } = await grantXp(userId, reward.amount);
          replyMessage = `🎉 You won **+${xpGained} XP**! Your XP has increased.` +
                         (isDouble ? ' 💊 (Blue Pill active)' : '');
          break;
        }

        case 'credits':
          updateData.credits = FieldValue.increment(reward.amount);
          replyMessage = `💰 You won **${reward.label}**! Your credits have been added.`;
          break;

        case 'item':
          updateData.items = FieldValue.arrayUnion(reward.rewardId);
          replyMessage = `🎁 Congratulations! You received **${reward.label}**! Check your inventory.`;
          break;

        case 'none':
          replyMessage = '😔 No luck this time. Try again later!';
          break;
      }

      await userRef.update(updateData);

      const embed = new EmbedBuilder()
        .setTitle('🎡 Wheel of Fate Spin Result')
        .setDescription(replyMessage)
        .setColor('#00ff99')
        .setFooter({ text: `Spins left: ${user.spinCount - 1}` });

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('❌ Failed to process spin command:', err);
      await interaction.editReply('❌ Something went wrong while processing your spin. Please try again later.');
    }
  }
};
