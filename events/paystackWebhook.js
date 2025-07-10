// events/paystackWebhook.js

const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');
const config = require('../config');

async function safeAddRole(member, roleId, maxRetries = 3) {
  if (!roleId) return false;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
      }
      return true;
    } catch (err) {
      attempt++;
      console.warn(`⚠️ Failed to add role ${roleId} to ${member.id} (attempt ${attempt}):`, err);
      await new Promise(res => setTimeout(res, 500));
    }
  }
  console.error(`❌ Giving up adding role ${roleId} to ${member.id} after ${maxRetries} attempts.`);
  return false;
}

module.exports = async (event, client) => {
  try {
    if (event.event !== 'charge.success') return;

    const metadata = event.data.metadata || {};
    const reference = event.data.reference || '';
    const amount = event.data.amount / 100;
    const now = Timestamp.fromDate(new Date());

    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(err => {
      console.error('❌ Failed to fetch guild:', err);
      return null;
    });
    if (!guild) return;

    const userId = metadata.discordUserId;
    if (!userId) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    // ✅ Validate reference
    const refDoc = await db.collection('paymentReferences').doc(reference).get();
    if (!refDoc.exists) {
      console.warn(`🚫 Ignored unknown or reused reference: ${reference}`);
      return;
    }
    await db.collection('paymentReferences').doc(reference).delete();

    const category = metadata.category || 'other';
    const pillType = metadata.pillType;
    const cooldownRef = db.collection('pillCooldowns').doc(userId);

    // 🌟 Sticker Purchase
    if (metadata.type === 'sticker') {
      await safeAddRole(member, process.env.STICKER_ROLE_ID);
      await db.collection('users').doc(userId).set({
        stickerPurchased: true,
        stickerPurchasedAt: now
      }, { merge: true });

      const logChannel = client.channels.cache.get(config.pillLogChannelId);
      if (logChannel) {
        logChannel.send(`🧷 <@${userId}> just purchased the **Sticker Pack** and received access!`).catch(console.error);
      }
    }

    // 💎 VIP Tier (Buyer or Seller)
    if (metadata.vipTier) {
      const vipTier = parseInt(metadata.vipTier);
      const vipRoles = {
        1: process.env.VIP_ROLE_BRONZE,
        2: process.env.VIP_ROLE_SILVER,
        3: process.env.VIP_ROLE_GOLD
      };
      const collection = category === 'sellervip' ? 'sellers' : 'users';
      await db.collection(collection).doc(userId).set({ vipTier }, { merge: true });

      if (vipRoles[vipTier]) {
        await safeAddRole(member, vipRoles[vipTier]);
        console.log(`🎖 ${userId} upgraded to VIP ${vipTier} (${collection})`);
      }
    }

    // 💊 Blue Pill
    if (pillType === 'blue') {
      await safeAddRole(member, process.env.BLUEPILL_ROLE_ID);
      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      await db.collection('users').doc(userId).set({
        bluePillExpiresAt: Timestamp.fromMillis(Date.now() + 86400000)
      }, { merge: true });

      const logChannel = client.channels.cache.get(config.pillLogChannelId);
      if (logChannel) {
        logChannel.send(`💙 <@${userId}> paid successfully and got the **Blue Pill** role!`).catch(console.error);
      }
    }

    // ❤️ Red Pill
    if (pillType === 'red') {
      await safeAddRole(member, process.env.REDPILL_ROLE_ID);
      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      await db.collection('buyerStats').doc(userId).set({
        redSpinsAvailable: FieldValue.increment(1)
      }, { merge: true });

      const spinChannel = client.channels.cache.get(config.redPillSpinChannelId);
      if (spinChannel) {
        spinChannel.send(`❤️ <@${userId}> paid for a **Red Pill**! Time to spin the **Wheel of Fate** 🎡`).catch(console.error);
      }
    }

    // 📊 XP + Spend Tracking (applies to all)
    const xpRates = {
      account: 300,
      merch: 200,
      wdp: 50,
      other: 50,
      boost: 150,
      sellervip: 0,
      vip: 0,
      sticker: 0
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

    // 🛑 Fallback warning if metadata is missing expected keys
    if (!pillType && !metadata.type && !metadata.vipTier) {
      console.warn(`⚠️ Unhandled Paystack metadata:`, metadata);
    }

  } catch (err) {
    console.error('🔥 Webhook processing error:', err);
  }
};
