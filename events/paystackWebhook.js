// paystackwebhook.js

const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');
const config = require('../config');
const client = require('../index').client;

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

    // 🔖 Handle Sticker Pack Purchase
    if (reference === 'gameschill-sticker-pack-kcqhcs') {
      const email = event.data.customer?.email;
      if (!email) return;

      const snapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) return;

      const userId = snapshot.docs[0].id;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.roles.add(process.env.STICKER_ROLE_ID).catch(() => {});
        await db.collection('users').doc(userId).set({
          stickerPurchased: true,
          stickerPurchasedAt: now
        }, { merge: true });

        client.channels.cache.get(config.pillLogChannelId)?.send(
          `🧷 <@${userId}> just purchased the **Sticker Pack** and received access!`
        );
      }

      return;
    }

    // 💎 Handle VIP Tier Purchase
    if (reference.startsWith('vip')) {
      const [tierPart, userId] = reference.split('-');
      const vipTier = parseInt(tierPart.replace('vip', ''));

      if (!userId || isNaN(vipTier)) return;

      const member = await guild.members.fetch(userId).catch(() => null);
      const vipRoles = {
        1: process.env.VIP_ROLE_BRONZE,
        2: process.env.VIP_ROLE_SILVER,
        3: process.env.VIP_ROLE_GOLD
      };

      await db.collection('sellers').doc(userId).set({ vipTier }, { merge: true });

      if (member && vipRoles[vipTier]) {
        await member.roles.add(vipRoles[vipTier]).catch(() => {});
        console.log(`🎖 ${userId} upgraded to VIP ${vipTier}`);
      }

      return;
    }

    // 💊 Handle Pill Purchases
    const userId = metadata.discordUserId;
    const pillType = metadata.pillType;
    const category = metadata.category || 'other';

    if (!userId || !pillType) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const cooldownRef = db.collection('pillCooldowns').doc(userId);

    if (pillType === 'blue') {
      await member.roles.add(process.env.BLUEPILL_ROLE_ID).catch(() => {});
      await db.collection('users').doc(userId).set({
        bluePillExpiresAt: Timestamp.fromMillis(Date.now() + 86400000)
      }, { merge: true });
      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      client.channels.cache.get(config.pillLogChannelId)?.send(
        `💙 <@${userId}> paid successfully and got the **Blue Pill** role!`
      );
    }

    if (pillType === 'red') {
      await member.roles.add(process.env.REDPILL_ROLE_ID).catch(() => {});
      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      client.channels.cache.get(config.redPillSpinChannelId)?.send(
        `❤️ <@${userId}> paid for a **Red Pill**! Time to spin the **Wheel of Fate** 🎡`
      );
    }

    // 📊 Update XP and Spend in Firestore
    const xpRates = {
      account: 300,
      merch: 200,
      wdp: 50,
      other: 50
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
