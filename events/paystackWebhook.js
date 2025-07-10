const { verifyPaystackSignature } = require('../utils/verifyPaystack');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');

module.exports = async (req, res, config, client) => {
  try {
    if (!verifyPaystackSignature(req, process.env.PAYSTACK_SECRET_KEY)) {
      console.warn('❌ Invalid Paystack signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    if (event.event !== 'charge.success') return res.sendStatus(200);

    const metadata = event.data.metadata || {};
    const reference = event.data.reference || '';
    const amount = event.data.amount / 100;
    const now = Timestamp.fromDate(new Date());

    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(err => {
      console.error('❌ Failed to fetch guild:', err);
      return null;
    });
    if (!guild) return res.status(500).send('Guild fetch failed');

    // 🟣 STICKER PACK PURCHASE LOGIC
    if (reference === 'gameschill-sticker-pack-kcqhcs') {
      const customerEmail = event.data.customer?.email;
      if (!customerEmail) {
        console.warn('⚠️ Sticker purchase missing customer email');
        return res.sendStatus(200);
      }

      const snapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.warn(`⚠️ No user found for email: ${customerEmail}`);
        return res.sendStatus(200);
      }

      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      const member = await guild.members.fetch(userId).catch(err => {
        console.error(`❌ Failed to fetch member ${userId}:`, err);
        return null;
      });

      if (member) {
        await member.roles.add(process.env.STICKER_ROLE_ID).catch(err => {
          console.error(`❌ Failed to assign sticker role to ${userId}:`, err);
        });

        await db.collection('users').doc(userId).set({
          stickerPurchased: true,
          stickerPurchasedAt: now
        }, { merge: true });

        client.channels.cache.get(config.pillLogChannelId)?.send(
          `🧷 <@${userId}> just purchased the **Sticker Pack** and received access!`
        );

        console.log(`✅ Sticker Pack role granted to ${userId}`);
      }

      return res.sendStatus(200);
    }

    // 🧠 VIP UPGRADE LOGIC
    if (reference.startsWith('vip')) {
      const [tierPart, userId] = reference.split('-');
      const vipTier = parseInt(tierPart.replace('vip', ''));

      if (!userId || isNaN(vipTier)) return res.sendStatus(200);

      const sellerRef = db.collection('sellers').doc(userId);
      const sellerSnap = await sellerRef.get();
      const sellerData = sellerSnap.exists ? sellerSnap.data() : {};

      await sellerRef.set({ ...sellerData, vipTier }, { merge: true });

      const member = await guild.members.fetch(userId).catch(err => {
        console.error(`❌ Failed to fetch member for VIP upgrade (${userId}):`, err);
        return null;
      });

      const tierRoles = {
        1: process.env.VIP_ROLE_BRONZE,
        2: process.env.VIP_ROLE_SILVER,
        3: process.env.VIP_ROLE_GOLD
      };

      if (member && tierRoles[vipTier]) {
        await member.roles.add(tierRoles[vipTier]).catch(err => {
          console.error(`❌ Failed to assign VIP role to ${userId}:`, err);
        });

        console.log(`🎖 ${userId} upgraded to VIP ${vipTier}`);
      }

      return res.sendStatus(200);
    }

    // 💊 PILL PURCHASE LOGIC
    const userId = metadata.discordUserId;
    const pillType = metadata.pillType;
    const category = metadata.category || 'other';

    if (!userId || !pillType) {
      console.warn('⚠️ Pill webhook missing userId or pillType');
      return res.sendStatus(200);
    }

    const member = await guild.members.fetch(userId).catch(err => {
      console.error(`❌ Could not fetch member ${userId}:`, err);
      return null;
    });

    const cooldownRef = db.collection('pillCooldowns').doc(userId);

    if (!member) {
      console.warn(`⚠️ User ${userId} not found in guild`);
      return res.status(404).send('User not found');
    }

    if (pillType === 'blue') {
      await member.roles.add(process.env.BLUEPILL_ROLE_ID).catch(err => {
        console.error(`❌ Could not assign Blue Pill role to ${userId}:`, err);
      });

      await db.collection('users').doc(userId).set({
        bluePillExpiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
      }, { merge: true });

      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      client.channels.cache.get(config.pillLogChannelId)?.send(
        `💙 <@${userId}> paid successfully and got the **Blue Pill** role!`
      );

      console.log(`✅ Blue Pill granted to ${userId}`);
    }

    if (pillType === 'red') {
      await member.roles.add(process.env.REDPILL_ROLE_ID).catch(err => {
        console.error(`❌ Could not assign Red Pill role to ${userId}:`, err);
      });

      await cooldownRef.set({ lastUsed: Date.now() }, { merge: true });

      client.channels.cache.get(config.redPillSpinChannelId)?.send(
        `❤️ <@${userId}> paid for a **Red Pill**! Time to spin the **Wheel of Fate** 🎡`
      );

      console.log(`✅ Red Pill granted to ${userId}`);
    }

    const buyerRef = db.collection('users').doc(userId);
    const statsRef = db.collection('buyerStats').doc(userId);

    const xpRates = {
      account: 300,
      merch: 200,
      wdp: 50,
      other: 50
    };

    const xpGain = Math.floor(amount * (xpRates[category] || 50));

    await buyerRef.set({
      xp: FieldValue.increment(xpGain),
      buyerXP: FieldValue.increment(xpGain),
      buyerSpend: FieldValue.increment(amount)
    }, { merge: true });

    await statsRef.set({
      monthXP: FieldValue.increment(xpGain),
      monthSpend: FieldValue.increment(amount),
      lastPurchase: now,
      [`categorySpend.${category}`]: FieldValue.increment(amount)
    }, { merge: true });

    console.log(`🧮 ${userId} earned ${xpGain} XP and spent ₦${amount} [${category}]`);

    return res.sendStatus(200);
  } catch (err) {
    console.error('🔥 Webhook processing error:', err);
    return res.sendStatus(500);
  }
};
