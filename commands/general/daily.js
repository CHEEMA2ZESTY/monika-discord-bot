const { SlashCommandBuilder } = require('discord.js');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const db = require('../../firebase');
const { checkRankUp } = require('../../utils/rankSystem');
const grantXp = require('../../utils/grantXp');

const COOLDOWN_HOURS = 24;
const BASE_XP = 100;
const DAILY_CREDITS = 200;
const XP_CAP = 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Collect your daily XP and credits.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const userRef = db.collection('users').doc(userId);

    try {
      const docSnap = await userRef.get();
      const data = docSnap.exists ? docSnap.data() : {};

      const lastDaily = data.lastDaily?.toDate?.() || null;
      const hoursSinceLast = lastDaily ? (now - lastDaily) / (1000 * 60 * 60) : Infinity;
      if (hoursSinceLast < COOLDOWN_HOURS) {
        return interaction.editReply({
          content: '⏳ You’ve already claimed your daily rewards. Try again later!',
        });
      }

      const isNewDay = data.dailyXPDate !== today;
      const dailyXPTotal = isNewDay ? 0 : (data.dailyXPTotal || 0);
      const xpRemaining = XP_CAP - dailyXPTotal;

      if (xpRemaining <= 0) {
        await userRef.set({
          lastDaily: Timestamp.fromDate(now),
          dailyXPDate: today,
          dailyXPTotal: XP_CAP
        }, { merge: true });

        return interaction.editReply({
          content: '⚠️ You’ve already hit your daily XP cap. Try again tomorrow.'
        });
      }

      // Grant XP using centralized logic
      const baseToGrant = Math.min(BASE_XP, xpRemaining);
      const { xpGained, isDouble } = await grantXp(userId, baseToGrant);

      await userRef.set({
        credits: FieldValue.increment(DAILY_CREDITS),
        lastDaily: Timestamp.fromDate(now),
        dailyXPDate: today,
        dailyXPTotal: dailyXPTotal + xpGained
      }, { merge: true });

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) await checkRankUp(userId, member);

      return interaction.editReply({
        content:
          `✅ You received **${xpGained} XP** and **₵${DAILY_CREDITS} credits**!\n` +
          (isDouble ? '💊 Blue Pill bonus active (2x XP)!\n' : '') +
          (xpGained === 0 ? '⚠️ You’ve hit your daily XP cap.\n' : '')
      });

    } catch (err) {
      console.error('❌ /daily command error:', err);
      return interaction.editReply({
        content: '❌ Something went wrong while claiming your daily rewards. Try again later!'
      });
    }
  }
};
