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

const VIP_PRICES = {
  1: 1000000, // ₦10,000
  2: 2000000, // ₦20,000
  3: 3000000  // ₦30,000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgradevip')
    .setDescription('Upgrade to a VIP tier and unlock powerful perks'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Defer initial reply to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('💎 VIP Upgrade Tiers')
      .setColor('#ffb700')
      .setDescription(
        'Support the server and enjoy exclusive rewards:\n\n' +
        '**VIP 1** – ₦10,000\n• XP Boost\n• VIP Bronze Role\n\n' +
        '**VIP 2** – ₦20,000\n• XP Boost\n• VIP Silver Role\n\n' +
        '**VIP 3** – ₦30,000\n• XP Boost\n• VIP Gold Role'
      )
      .setFooter({ text: 'Select a VIP tier to receive your payment link.' });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('vip-tier-select')
        .setPlaceholder('Select a VIP Tier')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('VIP 1 – ₦10,000').setValue('1'),
          new StringSelectMenuOptionBuilder().setLabel('VIP 2 – ₦20,000').setValue('2'),
          new StringSelectMenuOptionBuilder().setLabel('VIP 3 – ₦30,000').setValue('3')
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
      filter: (i) => i.user.id === userId,
    });

    collector.on('collect', async (selectInteraction) => {
      const selectedTier = selectInteraction.values[0];
      const amount = VIP_PRICES[selectedTier];
      const reference = `vip_${userId}_${Date.now()}`;

      await selectInteraction.deferReply({ ephemeral: true });

      try {
        await saveReference(reference, userId, {
          discordUserId: userId,
          vipTier: selectedTier,
          category: 'vip'
        });

        const paystackLink = await generatePaystackLink({
          amount,
          email: interaction.user.email ?? 'vip@monika.gg',
          reference,
          metadata: {
            discordUserId: userId,
            vipTier: selectedTier,
            category: 'vip'
          }
        });

        await selectInteraction.editReply({
          content: `💠 Click below to complete your **VIP ${selectedTier}** upgrade:\n${paystackLink}`
        });
      } catch (err) {
        console.error('🔥 Failed to generate VIP Paystack link:', err);
        await selectInteraction.editReply({
          content: '❌ Failed to generate payment link. Please try again shortly.'
        });
      }
    });
  }
};
