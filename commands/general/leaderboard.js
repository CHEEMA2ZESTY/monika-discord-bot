const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top XP or Credit holders')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Choose XP or credits leaderboard')
        .setRequired(true)
        .addChoices(
          { name: 'XP', value: 'xp' },
          { name: 'Credits', value: 'credits' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); // ✅ Make response visible only to user

    const type = interaction.options.getString('type');

    try {
      const snapshot = await db.collection('users').get();

      if (snapshot.empty) {
        return interaction.editReply({ content: `No data yet!` });
      }

      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u[type] !== undefined)
        .sort((a, b) => b[type] - a[type])
        .slice(0, 10);

      const description = await Promise.all(
        sorted.map(async (user, index) => {
          try {
            const fetchedUser = await interaction.client.users.fetch(user.id);
            return `**${index + 1}.** ${fetchedUser.username} — ${user[type]} ${type === 'xp' ? 'XP' : '₡'}`;
          } catch {
            return `**${index + 1}.** Unknown User — ${user[type]} ${type === 'xp' ? 'XP' : '₡'}`;
          }
        })
      );

      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${type.toUpperCase()} Leaderboard`)
        .setDescription(description.join('\n'))
        .setColor('#f1c40f')
        .setFooter({
          text: `Games & Chill • ${type.toUpperCase()} Leaderboard`,
          iconURL: interaction.guild.iconURL()
        });

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('❌ Leaderboard error:', error);
      return interaction.editReply({ content: '❌ Failed to fetch leaderboard. Please try again later.' });
    }
  }
};
