const { Collection } = require('discord.js');
const db = require('../firebase');

const cooldowns = new Collection();
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MIN_XP = 5;
const MAX_XP = 15;

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // ⏱️ Cooldown check
    const lastUsed = cooldowns.get(userId);
    if (lastUsed && (Date.now() - lastUsed < COOLDOWN_MS)) return;
    cooldowns.set(userId, Date.now());

    // 🎯 XP gain
    const xpGain = Math.floor(Math.random() * (MAX_XP - MIN_XP + 1)) + MIN_XP;

    try {
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const userData = doc.exists ? doc.data() : {};

      const currentXP = userData.xp || 0;
      await userRef.set({ xp: currentXP + xpGain }, { merge: true });

      console.log(`${message.author.username} gained ${xpGain} XP from chatting.`);
    } catch (err) {
      console.error(`❌ Failed to update XP for ${message.author.username}:`, err);
    }
  }
};
