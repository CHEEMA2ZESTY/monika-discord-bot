const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jtldprogress')
    .setDescription('View your JTLD story progress, choices, and unlocks.'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Fetch JTLD progress from Firestore
    const jtldDoc = await db.collection('jtld').doc(userId).get();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!jtldDoc.exists) {
      return interaction.reply({ content: `❌ You haven’t started the story yet. Use \`/jtld\` to begin!`, ephemeral: true });
    }

    const jtldData = jtldDoc.data();
    const userData = userDoc.exists ? userDoc.data() : {};

    const chapter = jtldData.chapter || 1;
    const choices = jtldData.choices || [];
    const earnedXP = userData.xp || 0;

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const roles = member?.roles.cache || [];

    const unlocked = [];
    if (roles.has(process.env.DARK_DESCENDANT_ROLE_ID)) unlocked.push('🩸 Dark Descendant');
    if (roles.has(process.env.CHOSEN_ONE_ROLE_ID)) unlocked.push('✨ Chosen One');
    if (roles.has(process.env.ORACLE_TOUCHED_ROLE_ID)) unlocked.push('🧠 Oracle-Touched');

    const embed = new EmbedBuilder()
      .setTitle(`📖 JTLD Progress for ${interaction.user.username}`)
      .setColor('#9b59b6')
      .addFields(
        { name: '📘 Current Chapter', value: `Chapter ${chapter}`, inline: true },
        { name: '🏆 JTLD XP Earned', value: `${earnedXP} XP`, inline: true },
        { name: '🧠 Choices Made', value: choices.length ? choices.map((c, i) => `Chapter ${i + 1}: ${c}`).join('\n') : 'None yet', inline: false },
        { name: '✨ Secret Roles', value: unlocked.length ? unlocked.join(', ') : 'None unlocked yet.' }
      )
      .setFooter({ text: 'Choices shape your destiny...' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
