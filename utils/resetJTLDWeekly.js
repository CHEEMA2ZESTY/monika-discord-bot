const cron = require('node-cron');
const db = require('../firebase');

function scheduleJTLDReset(client) {
  // Runs every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log('♻️ Weekly JTLD reset running...');

    try {
      const jtldSnapshot = await db.collection('jtld').get();
      const batch = db.batch();

      jtldSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          step: 0,
          completed: false,
          xpEarned: 0
        });
      });

      await batch.commit();

      const logChannel = client.channels.cache.get(process.env.JTLD_UPDATES_CHANNEL_ID);
      logChannel?.send('♻️ Weekly JTLD progress has been reset for all users.');
    } catch (error) {
      console.error('❌ JTLD reset failed:', error);
    }
  });
}

module.exports = {
  scheduleJTLDReset
};
