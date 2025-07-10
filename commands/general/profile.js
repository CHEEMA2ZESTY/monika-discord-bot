const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRankRole } = require('../../utils/rankSystem');
const db = require('../../firebase');

const sellerVipLimits = [0, 3, 5, Infinity]; // VIP 0 → 0 listings, VIP 1 → 3, etc.

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your full Monika profile and stats'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const userRef = db.collection('users').doc(userId);
    const jtldRef = db.collection('jtld').doc(userId);
    const sellerRef = db.collection('sellers').doc(userId);

    try {
      const [userSnap, jtldSnap, sellerSnap] = await Promise.all([
        userRef.get(),
        jtldRef.get(),
        sellerRef.get()
      ]);

      const userData = userSnap.exists ? userSnap.data() : {};
      const jtldData = jtldSnap.exists ? jtldSnap.data() : {};
      const sellerData = sellerSnap.exists ? sellerSnap.data() : {};

      const xp = userData.xp || 0;
      const credits = userData.credits || 0;
      const spins = userData.spinCount || 0;
      const boostCredits = userData.boostCredits || 0;
      const rank = getRankRole(xp);
      const jtldChapter = jtldData.chapter || 1;

      const sellerXP = sellerData.sellerXP || 0;
      const sellerRank = sellerData.sellerRank || 'Bronze Dealer';
      const sellerCredits = sellerData.sellerCredits || 0;
      const vipTier = sellerData.vipTier || 0;
      const usedListings = sellerData.priorityListingsUsed || 0;
      const vipLimit = sellerVipLimits[vipTier];

      const vipNames = ['Regular', 'VIP 1', 'VIP 2', 'VIP 3'];
      const vipIcons = ['🟫', '🥉', '🥈', '🥇'];

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      const roles = member?.roles.cache;
      const secretRoles = [];
      if (roles?.has(process.env.DARK_DESCENDANT_ROLE_ID)) secretRoles.push('🩸 Dark Descendant');
      if (roles?.has(process.env.CHOSEN_ONE_ROLE_ID)) secretRoles.push('✨ Chosen One');
      if (roles?.has(process.env.ORACLE_TOUCHED_ROLE_ID)) secretRoles.push('🧠 Oracle-Touched');

      const embed = new EmbedBuilder()
        .setTitle(`🧬 ${interaction.user.username}'s Profile`)
        .setColor('#00bcd4')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Monika — G&C Paybot 💰' })
        .addFields(
          { name: '📊 XP', value: `${xp} XP`, inline: true },
          { name: '🏅 Rank', value: `<@&${rank.roleId}>`, inline: true },
          { name: '₡ Credits', value: `${credits}`, inline: true },
          { name: '🎡 Spins Left', value: `${spins}`, inline: true },
          { name: '🚀 Boost Credits', value: `${boostCredits}`, inline: true },
          { name: '📖 JTLD Chapter', value: `Chapter ${jtldChapter}`, inline: true },
          { name: '✨ Secret Roles', value: secretRoles.length ? secretRoles.join(', ') : 'None yet', inline: false },
          { name: '💼 Seller XP', value: `${sellerXP} XP`, inline: true },
          { name: '🏆 Seller Rank', value: `${sellerRank}`, inline: true },
          { name: '💳 Seller Credits (Orbs)', value: `${sellerCredits}`, inline: true },
          { name: '🎖️ Seller VIP', value: `${vipIcons[vipTier]} ${vipNames[vipTier]}`, inline: true },
          {
            name: '📦 Priority Listings',
            value: `${usedListings} used / ${vipLimit === Infinity ? '∞' : vipLimit} allowed`,
            inline: true
          }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('❌ /profile error:', error);
      return interaction.reply({
        content: '❌ Could not fetch your profile. Please try again later.',
        ephemeral: true
      });
    }
  }
};
