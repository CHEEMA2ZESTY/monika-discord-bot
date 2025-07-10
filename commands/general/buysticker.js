const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buysticker')
    .setDescription('Support the server and unlock our exclusive sticker pack!'),

  async execute(interaction) {
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
        .setURL('https://paystack.com/buy/gameschill-sticker-pack-kcqhcs')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
};
