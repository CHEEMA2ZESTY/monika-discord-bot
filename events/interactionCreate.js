const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { FieldValue } = require('firebase-admin/firestore');
const db = require('../firebase');
const chapters = require('../utils/jtldChapters');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    const client = interaction.client;

    // ✅ Slash Command Handler
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('❌ Command execution error:', error);
        const errorMsg = { content: '❌ Something went wrong.', ephemeral: true };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg).catch(() => {});
        } else {
          await interaction.reply(errorMsg).catch(() => {});
        }
      }
    }

    // ✨ Modal Submit Handler (delegated to command files)
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;
      const command = client.commands.get('prioritylist'); // Only /prioritylist uses modal for now
      if (command?.handleModalSubmit && customId === 'priorityListModal') {
        return command.handleModalSubmit(interaction);
      }
    }

    // 🎮 JTLD Button Flow
    if (interaction.isButton() && interaction.customId.startsWith('jtld_choice_')) {
      const userId = interaction.user.id;
      const jtldRef = db.collection('jtld').doc(userId);
      const userRef = db.collection('users').doc(userId);

      const [jtldSnap, userSnap] = await Promise.all([jtldRef.get(), userRef.get()]);
      const jtldData = jtldSnap.exists
        ? jtldSnap.data()
        : { chapter: 1, step: 0, choices: [], xpEarned: 0, completed: false, unlockRoles: [] };

      const userData = userSnap.exists ? userSnap.data() : {};
      const currentChapter = jtldData.chapter || 1;
      const chapter = chapters[currentChapter];
      if (!chapter) return interaction.reply({ content: '⚠️ This chapter isn’t available yet.', ephemeral: true });
      if (jtldData.completed) return interaction.reply({ content: '✅ You’ve already completed this chapter.', ephemeral: true });

      const step = jtldData.step || 0;
      const stepData = chapter.steps[step];
      if (!stepData) return interaction.reply({ content: '⚠️ This step isn’t available.', ephemeral: true });

      const choiceKey = parseInt(interaction.customId.split('_')[2]);
      const selected = stepData.choices[choiceKey];
      if (!selected) return interaction.reply({ content: '❌ Invalid choice.', ephemeral: true });

      jtldData.choices.push(selected.text);
      jtldData.xpEarned += selected.xp;
      jtldData.step++;

      await userRef.set({ xp: (userData.xp || 0) + selected.xp }, { merge: true });

      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      const member = await guild?.members.fetch(userId).catch(() => null);
      const unlockRoles = [];

      const isFinalStep = jtldData.step >= chapter.steps.length;
      if (isFinalStep) {
        jtldData.completed = true;
        jtldData.chapter++;
        jtldData.step = 0;

        if (member) {
          const darkCount = jtldData.choices.filter(c => c.toLowerCase().includes('dark') || c.toLowerCase().includes('shadow')).length;
          if (darkCount >= 3 && !jtldData.unlockRoles.includes('DARK_DESCENDANT')) {
            const role = guild.roles.cache.get(process.env.DARK_DESCENDANT_ROLE_ID);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role).catch(() => {});
              jtldData.unlockRoles.push('DARK_DESCENDANT');
              unlockRoles.push('🩸 Dark Descendant');
            }
          }

          const lightCount = jtldData.choices.filter(c => c.toLowerCase().includes('light')).length;
          if (lightCount >= 3 && !jtldData.unlockRoles.includes('CHOSEN_ONE')) {
            const role = guild.roles.cache.get(process.env.CHOSEN_ONE_ROLE_ID);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role).catch(() => {});
              jtldData.unlockRoles.push('CHOSEN_ONE');
              unlockRoles.push('✨ Chosen One');
            }
          }

          if (
            currentChapter === 2 &&
            jtldData.choices.some(c => c.toLowerCase().includes('oracle')) &&
            !jtldData.unlockRoles.includes('ORACLE_TOUCHED')
          ) {
            const role = guild.roles.cache.get(process.env.ORACLE_TOUCHED_ROLE_ID);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role).catch(() => {});
              jtldData.unlockRoles.push('ORACLE_TOUCHED');
              unlockRoles.push('🧠 Oracle-Touched');
            }
          }
        }

        await jtldRef.set(jtldData, { merge: true });

        const logChannel = client.channels.cache.get(process.env.JTLD_UPDATES_CHANNEL_ID);
        logChannel?.send(
          `📘 <@${userId}> completed Chapter ${currentChapter} — *${chapter.title}*\n🏆 Earned: **${jtldData.xpEarned} XP**` +
          (unlockRoles.length ? `\n🎖️ Unlocked: ${unlockRoles.join(', ')}` : '')
        ).catch(() => {});

        return interaction.reply({
          content: `✅ Chapter ${currentChapter} complete!\n🏆 You earned **${jtldData.xpEarned} XP**.\n` +
            (unlockRoles.length ? `🎖️ You unlocked: ${unlockRoles.join(', ')}` : '') +
            `\nCome back next week for the next chapter.`,
          ephemeral: true
        });
      }

      await jtldRef.set(jtldData, { merge: true });

      const nextStep = chapter.steps[jtldData.step];
      const row = new ActionRowBuilder();
      nextStep.choices.forEach((choice, index) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`jtld_choice_${index}`)
            .setLabel(choice.text)
            .setStyle(index % 2 === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
      });

      return interaction.reply({
        content: `📖 **Step ${jtldData.step + 1}**\n${nextStep.prompt}\n\n🎉 You chose: **${selected.text}**\n${selected.reply}`,
        components: [row],
        ephemeral: true
      });
    }
  }
};
