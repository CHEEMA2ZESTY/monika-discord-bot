// cron/pillEffectCleaner.js
const db = require('../firebase');
const { Timestamp } = require('firebase-admin/firestore');

module.exports = async (client) => {
  const now = Date.now();
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const usersSnapshot = await db.collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const user = doc.data();
    const userId = doc.id;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;

    // 🔵 Blue Pill Expiration
    if (user.bluePillExpiresAt?.toMillis?.() < now) {
      if (member.roles.cache.has(process.env.BLUEPILL_ROLE_ID)) {
        await member.roles.remove(process.env.BLUEPILL_ROLE_ID).catch(console.error);
        console.log(`🔵 Removed Blue Pill role from ${userId}`);
      }
      await db.collection('users').doc(userId).update({ bluePillExpiresAt: null });
    }

    // 🔴 Red Pill Cleanup – remove role after 24h from last usage
    const redSpinCount = user.redPillSpins || 0;
    if (member.roles.cache.has(process.env.REDPILL_ROLE_ID) && redSpinCount <= 0) {
      await member.roles.remove(process.env.REDPILL_ROLE_ID).catch(console.error);
      console.log(`❤️ Removed Red Pill role from ${userId}`);
    }
  }
};
