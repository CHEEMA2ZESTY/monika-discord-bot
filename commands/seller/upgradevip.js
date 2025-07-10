const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgradevip')
    .setDescription('Upgrade to a VIP tier and unlock powerful perks'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💎 VIP Upgrade Tiers')
      .setColor('#ffb700')
      .setDescription(
        'Support the server and enjoy exclusive rewards:\n\n' +
        '**VIP 1** – ₦10,000\n• XP Boost\n• VIP Bronze Role\n\n' +
        '**VIP 2** – ₦20,000\n• XP Boost\n• VIP Silver Role\n\n' +
        '**VIP 3** – ₦30,000\n• XP Boost\n• VIP Gold Role'
      )
      .setFooter({ text: 'Monika will automatically assign your role after payment is confirmed.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('💠 VIP 1 – ₦10,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/2f5nehabuo'),

      new ButtonBuilder()
        .setLabel('💠 VIP 2 – ₦20,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/lfc0q8qwat'),

      new ButtonBuilder()
        .setLabel('💠 VIP 3 – ₦30,000')
        .setStyle(ButtonStyle.Link)
        .setURL('https://paystack.shop/pay/7fmfyr28je')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
};
