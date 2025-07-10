const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Events
} = require('discord.js');
const db = require('../../firebase');

const PRIORITY_LISTING_CHANNEL_ID = '1392136362546696412';
const VIP_ACTIVITY_LOG_CHANNEL_ID = '1392136622472036403';

const tierLimits = {
  0: 0,
  1: 3,
  2: 5,
  3: Infinity
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prioritylist')
    .setDescription('Submit a VIP priority listing (VIP 1+ only)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const ref = db.collection('sellers').doc(userId);
    const doc = await ref.get();
    const data = doc.exists ? doc.data() : {};
    const vipTier = data.vipTier || 0;
    const used = data.priorityListingsUsed || 0;
    const limit = tierLimits[vipTier];

    if (vipTier === 0) {
      return interaction.reply({
        content: '❌ Only VIP sellers can use this command. Use `/upgradevip` to unlock it!',
        ephemeral: true
      });
    }

    if (used >= limit) {
      return interaction.reply({
        content: `⚠️ You’ve used all your priority listings for this month.\n**Limit:** ${limit} | **Used:** ${used}`,
        ephemeral: true
      });
    }

    // 📝 Show Modal
    const modal = new ModalBuilder()
      .setCustomId('priorityListModal')
      .setTitle('Submit Priority Listing');

    const title = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Listing Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const price = new TextInputBuilder()
      .setCustomId('price')
      .setLabel('Price (₦)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const description = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Brief Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(price),
      new ActionRowBuilder().addComponents(description)
    );

    await interaction.showModal(modal);
  },

  async handleModalSubmit(interaction) {
    if (interaction.customId !== 'priorityListModal') return;

    const userId = interaction.user.id;
    const sellerRef = db.collection('sellers').doc(userId);
    const doc = await sellerRef.get();
    const data = doc.exists ? doc.data() : {};
    const vipTier = data.vipTier || 0;
    const used = data.priorityListingsUsed || 0;
    const limit = tierLimits[vipTier];

    if (used >= limit) {
      return interaction.reply({
        content: `⚠️ You’ve used all your priority listings for this month.`,
        ephemeral: true
      });
    }

    const title = interaction.fields.getTextInputValue('title');
    const price = interaction.fields.getTextInputValue('price');
    const description = interaction.fields.getTextInputValue('description');

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle(`🌟 Priority Listing`)
      .setDescription(`**Title:** ${title}\n**Price:** ₦${price}\n\n${description}`)
      .setFooter({ text: `Submitted by ${interaction.user.username}` })
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    const guild = interaction.client.guilds.cache.get(process.env.GUILD_ID);
    const listingChannel = guild?.channels.cache.get(PRIORITY_LISTING_CHANNEL_ID);
    const logChannel = guild?.channels.cache.get(VIP_ACTIVITY_LOG_CHANNEL_ID);

    // 🎯 Post the embed
    listingChannel?.send({ embeds: [embed] });
    logChannel?.send(`📬 <@${userId}> submitted a **priority listing**.`);

    // 🔁 Increment used listings
    await sellerRef.set({
      priorityListingsUsed: used + 1
    }, { merge: true });

    return interaction.reply({
      content: `✅ Your listing has been submitted to <#${PRIORITY_LISTING_CHANNEL_ID}>.`,
      ephemeral: true
    });
  }
};
