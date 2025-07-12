const { Collection } = require('discord.js');
const db = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

const cooldowns = new Collection();
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MIN_XP = 5;
const MAX_XP = 15;
const MAX_DAILY_MESSAGE_XP = 20;

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // ⏱️ Cooldown check
    const lastUsed = cooldowns.get(userId);
    if (lastUsed && (Date.now() - lastUsed < COOLDOWN_MS)) return;
    cooldowns.set(userId, Date.now());

    // 🌱 XP logic
    const xpGainRaw = Math.floor(Math.random() * (MAX_XP - MIN_XP + 1)) + MIN_XP;

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastXPDate = userData.messageXPDate || '';
    let messageCount = userData.dailyMessageCount || 0;

    // 🔁 Reset daily count if it's a new day
    if (lastXPDate !== today) {
      messageCount = 0;
    }

    if (messageCount >= MAX_DAILY_MESSAGE_XP) {
      return; // 🛑 Cap reached
    }

    // 💊 Check for Blue Pill bonus
    const bluePillExpiry = userData.bluePillExpiresAt?.toDate?.() || null;
    const bluePillActive = bluePillExpiry && bluePillExpiry > now;
    const xpGain = bluePillActive ? xpGainRaw * 2 : xpGainRaw;

    try {
      await userRef.set({
        xp: FieldValue.increment(xpGain),
        messageXPDate: today,
        dailyMessageCount: messageCount + 1
      }, { merge: true });

      console.log(
        `${message.author.username} gained ${xpGain} XP from chatting.` +
        (bluePillActive ? ' 💊 Blue Pill 2x XP!' : '')
      );
    } catch (err) {
      console.error(`❌ Failed to update XP for ${message.author.username}:`, err);
    }

    // 🧠 Narrate timestamp tracker
    try {
      const narrateRef = db.collection('narrateTimestamps')
        .doc(`${message.guildId}_${message.channelId}_${userId}`);

      await narrateRef.set({
        timestamp: message.createdTimestamp
      }, { merge: true });
    } catch (err) {
      console.error('❌ Failed to update narrate timestamp:', err);
    }
  }
};
