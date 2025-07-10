// commands/general/spin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
  let rand = Math.random() * totalWeight;
  for (const reward of list) {
    if (rand < reward.weight) return reward;
    rand -= reward.weight;
  }
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
    const userData = doc.exists ? doc.data() : {};

    const spins = userData.redPillSpins || 0;
    if (spins <= 0) {
      return interaction.editReply({
        content: '❌ You don’t have any spins available. Buy the **Red Pill** to gain a spin!'
      });
    }

    const reward = weightedRandom(rewards);
    let rewardText = '';
    let bonusDescription = '';
    const update = { redPillSpins: spins - 1 };

    switch (reward.type) {
      case 'xp':
        update.xp = (userData.xp || 0) + reward.amount;
        rewardText = `${reward.label} added to your XP!`;
        break;
      case 'credits':
        update.credits = (userData.credits || 0) + reward.amount;
        rewardText = `${reward.label} added to your Community Credits!`;
        break;
      case 'item':
        rewardText = `🎁 You won a **${reward.label}**! Please DM <@${process.env.OWNER_ID}> to claim it.`;
        bonusDescription = '*This reward is rare! You lucky beast.*';
        break;
      case 'none':
        rewardText = '😞 Nothing this time. Better luck next time, legend.';
        bonusDescription = '*The wheel wasn’t in your favor...*';
        break;
    }

    await userRef.set(update, { merge: true });

    if (reward.type !== 'none') {
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
