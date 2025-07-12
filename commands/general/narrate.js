const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('narrate')
    .setDescription('Monika fills you in on what you missed since your last message 🫣'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const { member, user, guild, channel } = interaction;
    const userId = user.id;
    const key = `${guild.id}_${userId}`;
    const usageRef = db.collection('narrateUsage').doc(key);

    // 🧩 Role IDs
    const ADMIN = process.env.ADMIN_ROLE_ID;
    const MOD = process.env.MOD_ROLE_ID;
    const STAFF = process.env.STAFF_ROLE_ID;

    // 🎖️ Determine user tier
    const roles = member.roles.cache;
    const isAdmin = roles.has(ADMIN);
    const isModOrStaff = roles.has(MOD) || roles.has(STAFF);

    // 💡 Set daily limit
    let dailyLimit = 5;
    if (isModOrStaff) dailyLimit = 10;
    if (isAdmin) dailyLimit = Infinity;

    // 🔢 Usage Check
    const usageDoc = await usageRef.get();
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // midnight

    let usageCount = 0;

    if (usageDoc.exists) {
      const data = usageDoc.data();
      const lastUsed = data.lastUsed || 0;

      // Reset if it's a new day
      if (lastUsed < today.getTime()) {
        await usageRef.set({ count: 1, lastUsed: now });
        usageCount = 1;
      } else {
        usageCount = data.count || 0;
        if (usageCount >= dailyLimit) {
          return interaction.editReply({
            content: `🚫 Woah! You've hit your daily narrate limit (${dailyLimit}x). Come back tomorrow 💅`,
          });
        } else {
          await usageRef.update({
            count: usageCount + 1,
            lastUsed: now
          });
        }
      }
    } else {
      await usageRef.set({ count: 1, lastUsed: now });
      usageCount = 1;
    }

    // 🕵️ Fetch last message timestamp
    const tsRef = db.collection('narrateTimestamps').doc(`${guild.id}_${channel.id}_${userId}`);
    const tsSnap = await tsRef.get();
    const lastSeen = tsSnap.exists ? tsSnap.data().timestamp : null;

    if (!lastSeen) {
      return interaction.editReply({
        content: `👀 I couldn't find your last message in this channel. Try chatting first so I can track you, darling.`,
      });
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    const afterLast = messages.filter(msg => msg.createdTimestamp > lastSeen && !msg.author.bot);

    if (afterLast.size === 0) {
      return interaction.editReply({
        content: `Nothing juicy happened since your last drama. Everyone’s asleep or boring 😴.`,
      });
    }

    const summary = afterLast.map(msg => `• **${msg.author.username}**: ${msg.content}`)
                             .slice(0, 10)
                             .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📚 Monika’s Gist Report')
      .setDescription(`Here’s what happened while you vanished:`)
      .addFields({ name: 'Tea ☕', value: summary || 'Honestly... it was dry.' })
      .setColor('Fuchsia')
      .setFooter({ text: `Narrate use: ${usageCount}/${dailyLimit}` });

    return interaction.editReply({ embeds: [embed] });
  }
};
