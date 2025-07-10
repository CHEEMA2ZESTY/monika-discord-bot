const cron = require('node-cron');
const db = require('../firebase');

function scheduleSellerMonthlyReset(client) {
  // 🗓️ Run at 12:00 AM on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    console.log('🔄 Starting monthly seller listing reset...');

    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.get();

      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, { priorityListingsUsed: 0 });
      });

      await batch.commit();

      const logChannel = client.channels.cache.get(process.env.VIP_ACTIVITY_LOG_CHANNEL_ID);
      logChannel?.send('♻️ Monthly reset: `priorityListingsUsed` has been reset for all sellers.');

      console.log('✅ Seller listing reset complete.');
    } catch (err) {
      console.error('❌ Error resetting seller listings:', err);
    }
  });
}

module.exports = { scheduleSellerMonthlyReset };
