// utils/roleAutomation.js
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');

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

module.exports = {
  async grantStickerRole(member, userId, client) {
    await safeAddRole(member, process.env.STICKER_ROLE_ID);
    await db.collection('users').doc(userId).set({
      stickerPurchased: true,
      stickerPurchasedAt: Timestamp.fromDate(new Date())
    }, { merge: true });

    const logChannel = client.channels.cache.get(process.env.PILL_LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`🧷 <@${userId}> just purchased the **Sticker Pack** and received access!`).catch(console.error);
    }
  },

  async grantVIPRole(member, userId, tier, category = 'users') {
    const vipRoles = {
      1: process.env.VIP_ROLE_BRONZE,
      2: process.env.VIP_ROLE_SILVER,
      3: process.env.VIP_ROLE_GOLD
    };

    const roleId = vipRoles[tier];
    if (roleId) await safeAddRole(member, roleId);

    await db.collection(category).doc(userId).set({ vipTier: tier }, { merge: true });
    console.log(`🎖 ${userId} upgraded to VIP Tier ${tier} (${category})`);
  },

  async grantBluePill(member, userId, client) {
    await safeAddRole(member, process.env.BLUEPILL_ROLE_ID);
    await db.collection('users').doc(userId).set({
      bluePillExpiresAt: Timestamp.fromMillis(Date.now() + 86400000)
    }, { merge: true });

    await db.collection('pillCooldowns').doc(userId).set({
      lastUsed: Date.now()
    }, { merge: true });

    const logChannel = client.channels.cache.get(process.env.PILL_LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`💙 <@${userId}> paid successfully and got the **Blue Pill** role!`).catch(console.error);
    }
  },

  async grantRedPill(member, userId, client) {
    await safeAddRole(member, process.env.REDPILL_ROLE_ID);

    await db.collection('pillCooldowns').doc(userId).set({
      lastUsed: Date.now()
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      spinCount: FieldValue.increment(1)
    }, { merge: true });

    const spinChannel = client.channels.cache.get(process.env.RED_PILL_SPIN_CHANNEL_ID);
    if (spinChannel) {
      spinChannel.send(`❤️ <@${userId}> paid for a **Red Pill**! Time to spin the **Wheel of Fate** 🎡`).catch(console.error);
    }
  }
};
