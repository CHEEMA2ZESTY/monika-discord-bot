const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all Monika bot commands'),

  async execute(interaction) {
    await interaction.reply({
      content: `📜 **Monika Bot Command List**

💊 **Pill System**
- \`/buybluepill\` → Buy the Blue Pill (2x XP boost)
- \`/buyredpill\` → Buy the Red Pill (Spin the Wheel of Fate)
- \`/spin\` → Spin the Wheel of Fate (Red Pill required)

🧬 **Profile & Progress**
- \`/profile\` → View full profile (XP, credits, ranks, JTLD progress)
- \`/jtldprogress\` → View your JTLD story progress & secret roles

🎡 **Buyer Milestones**
- \`/spinlegends\` → Spin the Wheel of Legends (monthly buyer reward)
- \`/vipstatus\` → View your VIP seller tier and perks

🛒 **Seller System**
- \`/logsale\` → Log a sale and earn Seller XP
- \`/prioritylist\` → Submit a VIP priority listing (VIP 1+ only)
- \`/upgradesellervip\` → Upgrade to Seller VIP (₦10k/₦20k/₦30k)

🚀 **Boost System**
- \`/boostsync\` → [Admin] Sync Discord Boost perks (XP, roles, credits)

🧾 **Registration**
- \`/register\` → Register your MLBB in-game account

🆘 **General**
- \`/upgradevip\` → Upgrade to a general VIP tier (XP boost perks)
- \`/help\` → Show this help menu

🔮 *More interactive features, rewards, and quests are coming soon!*`,
      ephemeral: true,
    });
  },
};
