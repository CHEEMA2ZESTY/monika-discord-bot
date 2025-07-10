const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgradesellervip')
    .setDescription('Upgrade to a Seller VIP tier and unlock exclusive merchant perks'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💼 Seller VIP Tiers')
      .setColor('#2ecc71')
      .setDescription(
        '**💎 Seller VIP Perks**\n\n' +
        '**VIP 1 – ₦10,000/month**\n' +
        '• 🧲 5,000 Seller Credits (Orbs)\n' +
        '• 🥉 Bronze Seller Badge\n' +
        '• 🔥 1x XP Boost\n' +
        '• 🪧 1 Free Banner Ad\n' +
        '• 📢 3 Priority Listings\n' +
        '• 💰 12% Middleman Fee (6% each)\n\n' +

        '**VIP 2 – ₦20,000/month**\n' +
        '• 💎 10,000 Seller Credits (Orbs)\n' +
        '• 🥈 Silver Seller Badge\n' +
        '• 🚀 1.5x XP Boost\n' +
        '• 🪧 2 Free Banner Ads\n' +
        '• 📢 5 Priority Listings\n' +
        '• 💰 10% Middleman Fee (5% each)\n\n' +

        '**VIP 3 – ₦30,000/month**\n' +
        '• 💎 15,000 Seller Credits (Orbs)\n' +
        '• 🥇 Gold Seller Badge\n' +
        '• ⚡ 2x XP Boost\n' +
        '• 🪧 4 Free Banner Ads\n' +
        '• 📢 Unlimited Priority Listings\n' +
        '• 💰 7% Middleman Fee (3.5% each)\n\n' +
        '*Perks activate automatically after payment.*'
      )
      .setFooter({ text: '🚨 Seller VIPs gain more visibility, lower fees, and monthly credits!' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🟥 Seller VIP 1 – ₦10,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/m77oze48u4'),

      new ButtonBuilder()
        .setLabel('🟦 Seller VIP 2 – ₦20,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/8uxlrn76kf'),

      new ButtonBuilder()
        .setLabel('🟪 Seller VIP 3 – ₦30,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/8hkm0n71dr')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
};
