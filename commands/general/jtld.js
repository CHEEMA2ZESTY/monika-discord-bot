const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const chapters = require('../../utils/jtldChapters');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jtld')
    .setDescription('Begin or continue your journey in JTLD story mode.'),

  async execute(interaction) {
    const allowedCategoryId = '1391171484697200711'; // 📖│jtld-story category ID

    if (!interaction.channel || interaction.channel.parentId !== allowedCategoryId) {
      return interaction.reply({
        content: '❌ You can only use this command in the JTLD story channels.',
        ephemeral: true
      });
    }

    const userId = interaction.user.id;
    const jtldRef = db.collection('jtld').doc(userId);
    const doc = await jtldRef.get();

    let storyData = {
      chapter: 1,
      step: 0,
      choices: [],
      xpEarned: 0,
      completed: false,
      unlockRoles: []
    };

    if (doc.exists) {
      storyData = { ...storyData, ...doc.data() };
    } else {
      await jtldRef.set(storyData); // Initialize on first use
    }

    const current = storyData;
    const chapter = chapters[current.chapter];

    if (!chapter) {
      return interaction.reply({
        content: `🚧 Chapter ${current.chapter} is not available yet. Check back soon!`,
        ephemeral: true
      });
    }

    if (current.completed) {
      return interaction.reply({
        content: `✅ You’ve already completed Chapter ${current.chapter}. New chapter coming soon!`,
        ephemeral: true
      });
    }

    const currentStep = current.step || 0;
    const stepData = chapter.steps[currentStep];

    if (!stepData) {
      return interaction.reply({
        content: `⚠️ This step is unavailable.`,
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder();
    stepData.choices.forEach((choice, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`jtld_choice_${index}`)
          .setLabel(choice.text)
          .setStyle(index % 2 === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
    });

    return interaction.reply({
      content: `📖 **Chapter ${current.chapter} — Step ${currentStep + 1}**\n${stepData.prompt}`,
      components: [row],
      ephemeral: true
    });
  }
};
