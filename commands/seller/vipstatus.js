const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vipstatus')
    .setDescription('View your current Seller VIP tier and exclusive perks'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const sellerRef = db.collection('sellers').doc(userId);
    const doc = await sellerRef.get();

    const vipTier = doc.exists ? doc.data().vipTier || 0 : 0;

    const tiers = {
      0: {
        name: 'None',
        color: '#999999',
        badge: '❌ No VIP',
        perks: 'You are not a VIP Seller yet.\nUse `/upgradevip` to unlock exclusive benefits!',
      },
      1: {
        name: 'VIP 1',
        color: '#cd7f32',
        badge: '🥉 Bronze',
        perks: [
          '**XP Boost:** 1x',
          '**Credits (Orbs):** 5,000/month',
          '**Listings:** 3 Priority Listings/month',
          '**Banner Ads:** 1/month',
        ].join('\n'),
      },
      2: {
        name: 'VIP 2',
        color: '#c0c0c0',
        badge: '🥈 Silver',
        perks: [
          '**XP Boost:** 1.5x',
          '**Credits (Orbs):** 10,000/month',
          '**Listings:** 5 Priority Listings/month',
          '**Banner Ads:** 2/month',
        ].join('\n'),
      },
      3: {
        name: 'VIP 3',
        color: '#ffd700',
        badge: '🥇 Gold',
        perks: [
          '**XP Boost:** 2x',
          '**Credits (Orbs):** 15,000/month',
          '**Listings:** Unlimited Priority Listings',
          '**Banner Ads:** 4/month',
        ].join('\n'),
      }
    };

    const tierInfo = tiers[vipTier] || tiers[0];

    const embed = new EmbedBuilder()
      .setTitle(`💼 ${interaction.user.username}'s VIP Seller Status`)
      .setColor(tierInfo.color)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎖 Tier', value: `${tierInfo.name} ${tierInfo.badge}`, inline: true },
        { name: '🛠 Perks', value: tierInfo.perks, inline: false },
        { name: '\u200B', value: 'Use `/upgradevip` to upgrade your status or unlock new rewards!' }
      )
      .setFooter({ text: 'Monika — MLBB Seller System' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
