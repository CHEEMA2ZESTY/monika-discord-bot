const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');
const config = require('../config');
const {
  grantStickerRole,
  grantVIPRole,
  grantBluePill,
  grantRedPill
} = require('../utils/roleAutomation');

module.exports = async (event, client) => {
  try {
    if (!event || typeof event !== 'object') {
      console.warn('⚠️ Invalid webhook event:', event);
      return;
    }

    if (event.event !== 'charge.success') return;

    const data = event.data;
    if (!data || typeof data !== 'object') {
      console.warn('🚫 Missing or invalid event.data:', data);
      return;
    }

    const metadata = data.metadata || {};
    const reference = data.reference || '';
    const amount = data.amount ? data.amount / 100 : 0;
    const now = Timestamp.fromDate(new Date());

    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(err => {
      console.error('❌ Failed to fetch guild:', err);
      return null;
    });
    if (!guild) return;

    const userId = metadata.discordUserId;
    if (!userId) {
      console.warn('⚠️ Missing discordUserId in metadata:', metadata);
      return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      console.warn(`⚠️ User ${userId} not found in guild`);
      return;
    }

    // ✅ Validate and clear the reference
    const refDoc = await db.collection('paymentReferences').doc(reference).get();
    if (!refDoc.exists) {
      console.warn(`🚫 Ignored unknown or reused reference: ${reference}`);
      return;
    }
    const refData = refDoc.data();
    await db.collection('paymentReferences').doc(reference).delete();

    const category = metadata.category || 'other';
    const pillType = metadata.pillType;

    // 🧷 Sticker Pack
    if (metadata.type === 'sticker') {
      await grantStickerRole(member, userId, client);
    }

    // 🎖 VIP Tier (Buyer or Seller)
    if (metadata.vipTier) {
      const vipTier = parseInt(metadata.vipTier);
      const vipCategory = category === 'sellervip' ? 'sellers' : 'users';
      await grantVIPRole(member, userId, vipTier, vipCategory);
    }

    // 💊 Pills
    if (pillType === 'blue') {
      await grantBluePill(member, userId, client);
    }

    if (pillType === 'red') {
      await grantRedPill(member, userId, client);
    }

    // 🛎️ Send private message to user after successful pill purchase
    if (pillType && refData?.channelId) {
      const channel = await guild.channels.fetch(refData.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        channel.send({
          content: `✅ <@${userId}> your **${pillType === 'blue' ? 'Blue Pill 💊' : 'Red Pill ❤️'}** purchase has been confirmed!\n` +
                   `Your designated role will be awarded shortly. Thank you for your support!`,
        }).catch(() => {});
      }
    }

    // 📊 XP + Spend Tracking (Exclude pills, stickers, VIPs)
    const excludedCategories = ['vip', 'sellervip', 'sticker'];
    if (!excludedCategories.includes(category)) {
      const xpRates = {
        account: 300,
        merch: 200,
        wdp: 50,
        other: 50,
        boost: 150
      };
      const xpGain = Math.floor(amount * (xpRates[category] || 50));

      await db.collection('users').doc(userId).set({
        xp: FieldValue.increment(xpGain),
        buyerXP: FieldValue.increment(xpGain),
        buyerSpend: FieldValue.increment(amount)
      }, { merge: true });

      await db.collection('buyerStats').doc(userId).set({
        monthXP: FieldValue.increment(xpGain),
        monthSpend: FieldValue.increment(amount),
        lastPurchase: now,
        [`categorySpend.${category}`]: FieldValue.increment(amount)
      }, { merge: true });

      console.log(`🧮 ${userId} earned ${xpGain} XP and spent ₦${amount} [${category}]`);
    } else {
      console.log(`📦 ${userId} made a purchase: ₦${amount} [${category}]`);
    }

    // 🛑 Fallback warning
    if (!pillType && !metadata.type && !metadata.vipTier) {
      console.warn(`⚠️ Unhandled Paystack metadata:`, metadata);
    }

  } catch (err) {
    console.error('🔥 Webhook processing error:', err);
  }
};
