const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all Monika bot commands'),

  async execute(interaction) {
    await interaction.reply({
      content: `📜 **Monika Bot Commands**:
      
💊 **Pill Commands**
- \`/buybluepill\` → Buy the Blue Pill (2x XP boost)
- \`/buyredpill\` → Buy the Red Pill (Spin the Wheel of Fate)

🎁 **Daily & Spin**
- \`/daily\` → Claim daily XP and credits
- \`/spin\` → Spin the Wheel of Fate (requires Red Pill)

📊 **Profile**
- \`/profile\` → View your XP, credits, spin count & rank

🚀 **Admin**
- \`/boostsync\` → [Admin] Sync server boost rewards

🆘 **General**
- \`/help\` → Show this help menu

✨ More commands and features coming soon!
`,
      ephemeral: true,
    });
  },
};
