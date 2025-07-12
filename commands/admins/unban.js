const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their username#tag')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Enter the username#tag of the banned user')
        .setRequired(true)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('username');

    try {
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.find(ban => {
        const tag = `${ban.user.username}#${ban.user.discriminator}`;
        return tag.toLowerCase() === input.toLowerCase();
      });

      if (!bannedUser) {
        return interaction.reply({
          content: `❌ Could not find a banned user with tag \`${input}\``,
          ephemeral: true,
        });
      }

      await interaction.guild.members.unban(bannedUser.user.id);
      return interaction.reply({
        content: `✅ Successfully unbanned \`${input}\``,
        ephemeral: true,
      });

    } catch (err) {
      console.error('Unban error:', err);
      return interaction.reply({
        content: '❌ Something went wrong while trying to unban the user.',
        ephemeral: true,
      });
    }
  },
};
