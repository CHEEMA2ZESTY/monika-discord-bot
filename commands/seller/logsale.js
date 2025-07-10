const { SlashCommandBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logsale')
    .setDescription('Log a sale and gain Seller XP')
    .addIntegerOption(opt =>
      opt.setName('xp')
        .setDescription('How much Seller XP this sale gives')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;

    // 🔒 Role validation
    const verifiedSellerRoles = [
      process.env.VERIFIED_SELLER_ROLE_ID, // <- set this in .env
      process.env.TRUSTED_MERCHANT_ROLE_ID // <- optional extra tier
    ];

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member || !member.roles.cache.some(role => verifiedSellerRoles.includes(role.id))) {
      return interaction.reply({
        content: '🚫 Only **Verified Sellers** can use this command.',
        ephemeral: true
      });
    }

    const saleXP = interaction.options.getInteger('xp');
    const sellerRef = db.collection('sellers').doc(userId);
    const doc = await sellerRef.get();

    let sellerData = doc.exists ? doc.data() : {
      sellerXP: 0,
      sellerCredits: 0,
      vipTier: 0,
      sellerRank: 'Bronze Dealer'
    };

    const vipBoost = [1, 1, 1.5, 2][sellerData.vipTier || 0];
    const boostedXP = Math.floor(saleXP * vipBoost);
    sellerData.sellerXP += boostedXP;

    const ranks = [
      { name: 'Bronze Dealer', xp: 0 },
      { name: 'Silver Broker', xp: 10000, bonusXP: 1000 },
      { name: 'Gold Trader', xp: 25000, bonusXP: 2000, credit: 1000 },
      { name: 'Diamond Kingpin', xp: 50000, bonusXP: 5000, credit: 2000 }
    ];

    let newRank = sellerData.sellerRank;
    let rankUp = false;
    let rewardsText = '';

    for (let i = ranks.length - 1; i >= 0; i--) {
      if (sellerData.sellerXP >= ranks[i].xp && sellerData.sellerRank !== ranks[i].name) {
        sellerData.sellerRank = ranks[i].name;
        sellerData.sellerXP += ranks[i].bonusXP || 0;
        sellerData.sellerCredits += ranks[i].credit || 0;

        rankUp = true;
        newRank = ranks[i].name;
        rewardsText = `🎉 You ranked up to **${newRank}**!\n` +
                      (ranks[i].bonusXP ? `+${ranks[i].bonusXP} Bonus XP\n` : '') +
                      (ranks[i].credit ? `+${ranks[i].credit} Orbs\n` : '');
        break;
      }
    }

    await sellerRef.set(sellerData);

    return interaction.reply({
      content: rankUp
        ? `✅ Sale logged! You earned **${boostedXP} XP** (boosted).\n${rewardsText}`
        : `✅ Sale logged! You earned **${boostedXP} XP** (boosted).`,
      ephemeral: true
    });
  }
};
