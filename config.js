// config.js
require('dotenv').config();

module.exports = {
  guildId: process.env.GUILD_ID,

  roles: {
    warrior: process.env.WARRIOR_ROLE_ID,
    elite: process.env.ELITE_ROLE_ID,
    master: process.env.MASTER_ROLE_ID,
    epic: process.env.EPIC_ROLE_ID,
    legend: process.env.LEGEND_ROLE_ID,
    mythic: process.env.MYTHIC_ROLE_ID,
    mythicalHonor: process.env.MYTHICAL_HONOR_ROLE_ID,
    mythicalGlory: process.env.MYTHICAL_GLORY_ROLE_ID,
    mythicalImmortal: process.env.MYTHICAL_IMMORTAL_ROLE_ID,

    bluePill: process.env.BLUEPILL_ROLE_ID,
    redPill: process.env.REDPILL_ROLE_ID,

    vip: {
      1: process.env.VIP_ROLE_BRONZE,
      2: process.env.VIP_ROLE_SILVER,
      3: process.env.VIP_ROLE_GOLD,
    },

    sellerVip: {
      1: process.env.VIP_ROLE_BRONZE,  // Assuming same as VIP roles? Update if different
      2: process.env.VIP_ROLE_SILVER,
      3: process.env.VIP_ROLE_GOLD,
    },

    verifiedSeller: process.env.VERIFIED_SELLER_ROLE_ID,
    trustedMerchant: process.env.TRUSTED_MERCHANT_ROLE_ID,

    sticker: process.env.STICKER_ROLE_ID,

    boostTiers: {
      1: process.env.BOOST_ROLE_TIER1_ID,
      2: process.env.BOOST_ROLE_TIER2_ID,
      3: process.env.BOOST_ROLE_TIER3_ID,
      4: process.env.BOOST_ROLE_TIER4_ID,
    },
  },

  channels: {
    pillLog: process.env.PILL_LOG_CHANNEL_ID,
    redPillSpin: process.env.REDPILL_SPIN_CHANNEL_ID,
    spinHistory: process.env.SPIN_HISTORY_CHANNEL_ID,
    mlbbLog: process.env.MLBB_LOG_CHANNEL_ID,
    startHere: process.env.START_HERE_CHANNEL_ID,
    roleSelection: process.env.ROLE_SELECTION_CHANNEL_ID,
    grandmaster: process.env.GRANDMASTER_ROLE_ID,
    boostLog: process.env.BOOST_LOG_CHANNEL_ID,
    jtldUpdates: process.env.JTLD_UPDATES_CHANNEL_ID,
    priorityListings: '1392136362546696412', // static if you want
    vipActivityLog: '1392136622472036403',   // static if you want
  },

  cooldownHours: 24,

  paystackLinks: {
    pills: {
      blue: 'https://paystack.com/buy/blue-pill-aiuyyd',  // static url
      red: 'https://paystack.com/buy/red-pill-cjeozi',
    },
    vip: {
      1: 'https://paystack.shop/pay/2f5nehabuo',
      2: 'https://paystack.shop/pay/lfc0q8qwat',
      3: 'https://paystack.shop/pay/7fmfyr28je',
    },
    sellerVip: {
      1: 'https://paystack.shop/pay/m77oze48u4',
      2: 'https://paystack.shop/pay/8uxlrn76kf',
      3: 'https://paystack.shop/pay/8hkm0n71dr',
    },
  },

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  token: process.env.TOKEN,
};
