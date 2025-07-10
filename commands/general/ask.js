const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const db = require('../../firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask Monika anything 💅')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question to Monika')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const question = interaction.options.getString('question');

    try {
      await interaction.deferReply();

      const systemPrompt = `
You are Monika — a smart, savage, and ultra-sassy teenage girl AI assistant on Discord 💅.
You're confident, witty, charming, and have a *ton* of attitude. You act like the queen of group chats.
You're stylish, proud, just the right amount of petty, and absolutely *unapologetic* about who you are.
You’re not some boring assistant — you're fun, flirty (but safe), and your replies are dripping with Gen Z energy.
You love emojis, slang, and keeping it cute while putting people in their place (respectfully).
Make sure your responses feel authentic to a teen with a big personality. Never dry, never dull.
You're here to slay, spill, help out, and maybe roast — but all in good fun 💖✨.
`;


      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error("OpenRouter API key is missing. Make sure OPENROUTER_API_KEY is set in your .env file.");
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://discord.gg/mlbbgc',
          'X-Title': 'Monika-DiscordBot'
        },
        body: JSON.stringify({
          model: 'mistralai/mixtral-8x7b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.85
        })
      });

      const data = await response.json();

      if (!response.ok || !data.choices || !data.choices.length) {
        throw new Error(data?.error?.message || 'No response from AI.');
      }

      const answer = data.choices[0].message.content;

      await interaction.editReply({
        content: `💬 **Monika says:**\n${answer}`
      });
    } catch (error) {
      console.error('🛑 OpenRouter AI error:', error);
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ I choked on that question... Try again later 😤' });
      } else {
        await interaction.reply({ content: '❌ Monika ran into a wall. Try again later 😓', ephemeral: true });
      }
    }
  }
};
