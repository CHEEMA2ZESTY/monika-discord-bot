const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { FieldValue } = require('firebase-admin/firestore');
const db = require('../../firebase');
const { checkRankUp } = require('../../utils/rankSystem');

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

function weightedRandom(list) {
  const totalWeight = list.reduce((acc, r) => acc + r.weight, 0);
  if (totalWeight === 0) return { type: 'none', label: 'No rewards available', weight: 0 };
  let rand = Math.random() * totalWeight;
  for (const reward of list) {
    if (rand < reward.weight) return reward;
    rand -= reward.weight;
  }
  return { type: 'none', label: 'No rewards available', weight: 0 };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spin')
    .setDescription('Spin the Wheel of Fate'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return interaction.editReply({
        content: '❌ You have no spins available. Buy the **Red Pill** to gain a spin!'
      });
    }

    const userData = doc.data();
    const spins = userData.spinCount || 0;  // Ensure this matches your webhook field name!

    if (spins <= 0) {
      return interaction.editReply({
        content: '❌ You don’t have any spins available. Buy the **Red Pill** to gain a spin!'
      });
    }

    const reward = weightedRandom(rewards);
    let rewardText = '';
    let bonusDescription = '';

    try {
      // Update spins and rewards atomically
      if (reward.type === 'xp') {
        await userRef.update({
          spinCount: spins - 1,
          xp: FieldValue.increment(reward.amount)
        });
        rewardText = `${reward.label} added to your XP!`;
      } else if (reward.type === 'credits') {
        await userRef.update({
          spinCount: spins - 1,
          credits: FieldValue.increment(reward.amount)
        });
        rewardText = `${reward.label} added to your Community Credits!`;
      } else {
        // For items and none, just decrement spins
        await userRef.update({
          spinCount: spins - 1
        });
        if (reward.type === 'item') {
          rewardText = `🎁 You won a **${reward.label}**! Please DM <@${process.env.OWNER_ID}> to claim it.`;
          bonusDescription = '*This reward is rare! You lucky beast.*';
        } else {
          rewardText = '😞 Nothing this time. Better luck next time, legend.';
          bonusDescription = '*The wheel wasn’t in your favor...*';
        }
      }
    } catch (err) {
      console.error('❌ Failed to update user spins/rewards:', err);
      return interaction.editReply({
        content: '❌ An error occurred while processing your spin. Please try again later.'
      });
    }

    if (reward.type !== 'none' && reward.type !== 'item') {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) await checkRankUp(userId, member);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎡 Wheel of Fate Result')
      .setColor(reward.type === 'none' ? '#95a5a6' : '#f39c12')
      .setDescription(`🧬 <@${userId}> spun the wheel...\n\n**${reward.label}**\n${rewardText}`)
      .setFooter({ text: bonusDescription || 'Spin again by buying another Red Pill.' });

    const logChannel = interaction.guild.channels.cache.get(process.env.SPIN_HISTORY_CHANNEL_ID);
    if (logChannel) await logChannel.send({ embeds: [embed] });

    return interaction.editReply({
      content: `✅ Your spin is complete. Check the results in <#${process.env.SPIN_HISTORY_CHANNEL_ID}>.`
    });
  }
};
