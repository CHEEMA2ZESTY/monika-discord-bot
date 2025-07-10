// events/paystackWebhook.js

const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');
const config = require('../config');
const client = require('../index').client;

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
      await new Promise(res => setTimeout(res, 500)); // wait 0.5s before retry
    }
  }
  console.error(`❌ Giving up adding role ${roleId} to ${member.id} after ${maxRetries} attempts.`);
  return false;
}

module.exports = async (event) => {
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
      return;
    }

    // 💎 Buyer VIP Tier Purchase (vipTier in metadata)
    if (metadata.vipTier) {
      const vipTier = parseInt(metadata.vipTier);
      const vipRoles = {
        1: process.env.VIP_ROLE_BRONZE,
        2: process.env.VIP_ROLE_SILVER,
        3: process.env.VIP_ROLE_GOLD
      };

      await db.collection('sellers').doc(userId).set({ vipTier }, { merge: true });

      if (vipRoles[vipTier]) {
        await safeAddRole(member, vipRoles[vipTier]);
        console.log(`🎖 ${userId} upgraded to VIP ${vipTier}`);
      }
      return;
    }

    // 💊 Pill Purchases
    const pillType = metadata.pillType;
    const category = metadata.category || 'other';

    const cooldownRef = db.collection('pillCooldowns').doc(userId);

    if (pillType === 'blue') {
      await safeAddRole(member, process.env.BLUEPILL_ROLE_ID);

      await db.collection('users').doc(userId).set({
        bluePillExpiresAt: Timestamp.fromMillis(Date.now() + 86400000)
      }, { merge: true });

      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      const logChannel = client.channels.cache.get(config.pillLogChannelId);
      if (logChannel) {
        logChannel.send(`💙 <@${userId}> paid successfully and got the **Blue Pill** role!`).catch(console.error);
      }
    }

    if (pillType === 'red') {
      await safeAddRole(member, process.env.REDPILL_ROLE_ID);
      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      const spinChannel = client.channels.cache.get(config.redPillSpinChannelId);
      if (spinChannel) {
        spinChannel.send(`❤️ <@${userId}> paid for a **Red Pill**! Time to spin the **Wheel of Fate** 🎡`).catch(console.error);
      }
    }

    // 📊 XP + Spend Update
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

  } catch (err) {
    console.error('🔥 Webhook processing error:', err);
  }
};
