const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRankRole } = require('../../utils/rankSystem');
const db = require('../../firebase');

const sellerVipLimits = [0, 3, 5, Infinity]; // VIP 0 → 0 listings, VIP 1 → 3, etc.

function getRemainingTimeFromDate(date) {
  const remaining = date ? date.getTime() - Date.now() : 0;
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

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

      // 💊 Pills
      const bluePillExpiry = userData.bluePillExpiresAt?.toDate?.() || null;
      const redPillExpiry = userData.redPillExpiresAt?.toDate?.() || null;

      const blueActive = getRemainingTimeFromDate(bluePillExpiry);
      const redActive = getRemainingTimeFromDate(redPillExpiry);

      const bluePillStatus = blueActive
        ? `🟦 Active • Expires in ${blueActive}`
        : '❌ Not Active';

      const redPillStatus = redActive
        ? `🔴 Eligible • Spin before ${redActive}`
        : '❌ Not Active';

      // 🧠 Secret Roles
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      const roles = member?.roles.cache;
      const secretRoles = [];
      if (roles?.has(process.env.DARK_DESCENDANT_ROLE_ID)) secretRoles.push('🩸 Dark Descendant');
      if (roles?.has(process.env.CHOSEN_ONE_ROLE_ID)) secretRoles.push('✨ Chosen One');
      if (roles?.has(process.env.ORACLE_TOUCHED_ROLE_ID)) secretRoles.push('🧠 Oracle-Touched');

      // 📦 Embed Output
      const embed = new EmbedBuilder()
        .setTitle(`🧬 ${interaction.user.username}'s Profile`)
        .setColor('#00bcd4')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Monika — G&C Paybot 💰' })
        .addFields(
          { name: '👤 Basic Info', value: [
            `• **XP:** ${xp}`,
            `• **Rank:** <@&${rank.roleId}>`,
            `• **Credits:** ₡${credits}`,
            `• **Boost Credits:** ${boostCredits}`,
            `• **Spins Left:** ${spins}`,
            `• **JTLD Chapter:** ${jtldChapter}`
          ].join('\n'), inline: false },

          { name: '💊 Pill Status', value: [
            `• Blue Pill: ${bluePillStatus}`,
            `• Red Pill: ${redPillStatus}`
          ].join('\n'), inline: false },

          { name: '💼 Seller Stats', value: [
            `• XP: ${sellerXP}`,
            `• Rank: ${sellerRank}`,
            `• Credits: ${sellerCredits}`,
            `• VIP: ${vipIcons[vipTier]} ${vipNames[vipTier]}`,
            `• Listings: ${usedListings} / ${vipLimit === Infinity ? '∞' : vipLimit}`
          ].join('\n'), inline: false },

          { name: '✨ Secret Roles', value: secretRoles.length ? secretRoles.join(', ') : 'None yet', inline: false }
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
