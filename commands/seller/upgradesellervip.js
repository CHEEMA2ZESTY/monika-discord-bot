const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} = require('discord.js');
const generatePaystackLink = require('../../utils/generatePaystackLink');
const { saveReference } = require('../../utils/paymentReferences');

const VIP_PRICES = {
  1: 1000000, // ₦10,000
  2: 2000000, // ₦20,000
  3: 3000000  // ₦30,000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgradesellervip')
    .setDescription('Upgrade to a Seller VIP tier and unlock exclusive merchant perks'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const channelId = interaction.channel.id;

    await interaction.deferReply({ ephemeral: true });

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
          new StringSelectMenuOptionBuilder().setLabel('Seller VIP 1 – ₦10,000').setValue('1'),
          new StringSelectMenuOptionBuilder().setLabel('Seller VIP 2 – ₦20,000').setValue('2'),
          new StringSelectMenuOptionBuilder().setLabel('Seller VIP 3 – ₦30,000').setValue('3')
        )
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    const collector = interaction.channel.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 15000,
      max: 1,
      filter: (i) => i.user.id === userId
    });

    collector.on('collect', async (selectInteraction) => {
      const selectedTier = selectInteraction.values[0];
      const amount = VIP_PRICES[selectedTier];
      const reference = `sellervip_${userId}_${Date.now()}`;

      await saveReference(reference, userId, {
        discordUserId: userId,
        channelId, // ✅ So we can DM the user in that same channel on webhook confirm
        vipTier: selectedTier,
        category: 'sellervip'
      });

      try {
        const paystackLink = await generatePaystackLink({
          amount,
          email: 'sellervip@monika.gg',
          reference,
          metadata: {
            discordUserId: userId,
            channelId,
            vipTier: selectedTier,
            category: 'sellervip'
          }
        });

        await selectInteraction.reply({
          content: `💠 Click below to complete your **Seller VIP ${selectedTier}** upgrade:\n${paystackLink}`,
          ephemeral: true
        });
      } catch (err) {
        console.error('❌ Failed to generate Seller VIP payment link:', err);
        await selectInteraction.reply({
          content: '❌ Could not generate the payment link. Please try again later.',
          ephemeral: true
        });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: '⚠️ You did not select a VIP tier in time. Please run the command again.',
          embeds: [],
          components: []
        });
      }
    });
  }
};
