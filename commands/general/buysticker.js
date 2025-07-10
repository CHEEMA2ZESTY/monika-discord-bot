const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { saveReference } = require('../../utils/paymentReferences');
const generatePaystackLink = require('../../utils/generatePaystackLink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buysticker')
    .setDescription('Support the server and unlock our exclusive sticker pack!'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // ⏳ Defer early to avoid timeout
    await interaction.deferReply({ ephemeral: true });

    const reference = `sticker_${userId}_${Date.now()}`;
    await saveReference(reference, userId, {
      discordUserId: userId,
      type: 'sticker'
    });

    try {
      const paystackLink = await generatePaystackLink({
        amount: 100000, // ₦1,000 in kobo
        email: 'supporter@monika.gg',
        reference,
        metadata: {
          discordUserId: userId,
          type: 'sticker'
        }
      });

      const embed = new EmbedBuilder()
        .setTitle('🌟 GGS Sticker Pack')
        .setColor('#e67e22')
        .setDescription(
          '**Support the Community. Show your vibe.**\n\n' +
          'Buy our exclusive WhatsApp sticker pack and get the `Sticker Supporter` role in the server!\n\n' +
          'You’ll also unlock:\n' +
          '• Server-wide recognition 🏆\n' +
          '• Access to future limited sticker drops 💬\n\n' +
          '> ₦1,000 only – permanent support badge!'
        )
        .setFooter({ text: 'Sticker role is granted automatically after purchase confirmation 💠' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🛒 Buy Sticker Pack – ₦1,000')
          .setStyle(ButtonStyle.Link)
          .setURL(paystackLink)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    } catch (err) {
      console.error('❌ Failed to generate sticker payment link:', err);
      await interaction.editReply({
        content: '❌ Failed to generate payment link. Please try again later.'
      });
    }
  }
};
