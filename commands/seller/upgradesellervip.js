const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js');
const generatePaystackLink = require('../../utils/generatePaystackLink');
const { saveReference } = require('../../utils/paymentReferences');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgradesellervip')
    .setDescription('Upgrade to a Seller VIP tier and unlock exclusive merchant perks'),

  async execute(interaction) {
    const userId = interaction.user.id;

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
      new StringSelectMenuBuilder()
        .setCustomId('seller-vip-tier-select')
        .setPlaceholder('Select a Seller VIP Tier')
        .addOptions(
          {
            label: 'Seller VIP 1 – ₦10,000',
            value: '1',
          },
          {
            label: 'Seller VIP 2 – ₦20,000',
            value: '2',
          },
          {
            label: 'Seller VIP 3 – ₦30,000',
            value: '3',
          }
        )
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (selectInteraction) => {
      const selectedTier = selectInteraction.values[0];
      const amount = selectedTier === '1' ? 1000000 : selectedTier === '2' ? 2000000 : 3000000;
      const reference = `sellervip_${userId}_${Date.now()}`;

      await saveReference(reference, userId, {
        discordUserId: userId,
        vipTier: selectedTier,
        category: 'sellervip',
      });

      const paystackLink = await generatePaystackLink({
        amount,
        email: interaction.user.email ?? 'sellervip@monika.gg',
        reference,
        metadata: {
          discordUserId: userId,
          vipTier: selectedTier,
          category: 'sellervip',
        },
      });

      await selectInteraction.reply({
        content: `💠 Click below to complete your **Seller VIP ${selectedTier}** upgrade:\n${paystackLink}`,
        ephemeral: true,
      });
    });
  },
};
