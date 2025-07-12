const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const db = require('../../firebase');

const DAILY_LIMITS = {
  regular: 5,
  staff: 10,
  admin: Infinity
};

const SYSTEM_PROMPTS = {
  regular: "Summarize this chat as concisely as possible. Focus on key events. Keep it short, about 3-4 bullet points. Skip fluff.",
  staff: "Summarize this conversation with moderate detail. Include notable moments and key takeaways in a paragraph or bullet list. Use a mildly sassy tone.",
  admin: "Summarize this entire conversation in a sassy tone like Monika from Doki Doki. Include juicy or funny moments. Highlight drama, jokes, and useful info. Be expressive, creative, and concise but rich."
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('narrate')
    .setDescription('Summarize the conversation in this channel since your last message.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const channel = interaction.channel;
    const member = await interaction.guild.members.fetch(userId);
    const roles = member.roles.cache;

    const isAdmin = roles.has(process.env.ADMIN_ROLE_ID);
    const isMod = roles.has(process.env.MOD_ROLE_ID);
    const isStaff = roles.has(process.env.STAFF_ROLE_ID);

    let level = 'regular';
    if (isMod || isStaff) level = 'staff';
    if (isAdmin) level = 'admin';

    const usageRef = db.collection('narrate_usage').doc(userId);
    const usageSnap = await usageRef.get();
    const data = usageSnap.exists ? usageSnap.data() : {};
    const today = new Date().toISOString().split('T')[0];

    if (!isAdmin) {
      if (data.date === today && data.count >= DAILY_LIMITS[level]) {
        return interaction.reply({
          content: `🛑 You’ve reached your daily narrate limit of **${DAILY_LIMITS[level]}**.`,
          ephemeral: true
        });
      }
    }

    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const lastMessage = sorted.filter(msg => msg.author.id === userId).last();
    const afterTime = lastMessage?.createdTimestamp || 0;

    const messagesToSummarize = sorted
      .filter(msg => msg.createdTimestamp > afterTime && !msg.author.bot)
      .map(msg => `${msg.author.username}: ${msg.content}`)
      .slice(-150); // token-safe

    if (messagesToSummarize.length === 0) {
      return interaction.reply({
        content: '❌ There’s nothing to narrate since your last message.',
        ephemeral: true
      });
    }

    // 🧠 OpenRouter GPT Call (corrected model)
    try {
      const systemPrompt = SYSTEM_PROMPTS[level];
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'mistralai/mixtral-8x7b-instruct',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messagesToSummarize.join('\n') }
        ],
        temperature: 0.7,
        max_tokens: level === 'admin' ? 1024 : level === 'staff' ? 700 : 400
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://discord.gg/mlbbgc',
          'X-Title': 'Monika-DiscordBot'
        }
      });

      const summary = response.data.choices[0].message.content;

      if (!isAdmin) {
        await usageRef.set({
          date: today,
          count: data.date === today ? (data.count || 0) + 1 : 1
        }, { merge: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Monika's Sassy Recap`)
        .setDescription(summary)
        .setColor('#ff69b4')
        .setFooter({ text: `Narration level: ${level.toUpperCase()}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error('❌ OpenRouter narrate error:', err.response?.data || err);
      return interaction.reply({
        content: '❌ Monika got a headache trying to read all that. Try again later.',
        ephemeral: true
      });
    }
  }
};
