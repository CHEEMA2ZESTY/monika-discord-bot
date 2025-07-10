module.exports = {
  1: {
    title: 'The Forked Trial',
    steps: [
      {
        prompt: 'You awaken in a strange forest with glowing mushrooms. What do you do?',
        choices: [
          { text: 'Follow the light 🌟', reply: 'You walk toward the warm glow.', xp: 150 },
          { text: 'Enter the misty path 🌫️', reply: 'The mist whispers secrets as you step in.', xp: 150 }
        ]
      },
      {
        prompt: 'You hear a scream from a distant ruin.',
        choices: [
          { text: 'Run toward it 🏃‍♂️', reply: 'Your heart races as you dash through the trees.', xp: 200 },
          { text: 'Hide and observe 👀', reply: 'You crouch behind a rock, watching closely.', xp: 200 }
        ]
      },
      {
        prompt: 'A cloaked figure offers you a crystal.',
        choices: [
          { text: 'Accept it 🔮', reply: 'The crystal glows warmly in your hand.', xp: 150 },
          { text: 'Refuse it ❌', reply: 'The figure disappears without a word.', xp: 150 }
        ]
      },
      {
        prompt: 'You encounter a talking wolf.',
        choices: [
          { text: 'Speak with it 🐺', reply: 'It shares cryptic wisdom about your path.', xp: 200 },
          { text: 'Back away slowly 😨', reply: 'The wolf watches you vanish into the trees.', xp: 150 }
        ]
      },
      {
        prompt: 'A portal appears. Do you enter?',
        choices: [
          { text: 'Yes, leap in! ✨', reply: 'You’re sucked into a new dimension.', xp: 200 },
          { text: 'No, stay grounded 🌍', reply: 'You choose the known over the unknown.', xp: 150 }
        ]
      },
      {
        prompt: 'You’re offered two weapons: a sword and a staff.',
        choices: [
          { text: 'Take the sword ⚔️', reply: 'It hums with power.', xp: 150 },
          { text: 'Take the staff 🪄', reply: 'It pulses with arcane energy.', xp: 150 }
        ]
      },
      {
        prompt: 'You find an old journal.',
        choices: [
          { text: 'Read it 📖', reply: 'It contains warnings and maps.', xp: 150 },
          { text: 'Ignore it 🚫', reply: 'You toss it aside and move on.', xp: 150 }
        ]
      },
      {
        prompt: 'A stranger asks for help.',
        choices: [
          { text: 'Help them 🙌', reply: 'They gift you a charm in gratitude.', xp: 150 },
          { text: 'Decline 🚶', reply: 'You move forward, alone but focused.', xp: 150 }
        ]
      },
      {
        prompt: 'You find a hidden shrine.',
        choices: [
          { text: 'Pray at the shrine 🙏', reply: 'You feel a strange energy wash over you.', xp: 200 },
          { text: 'Break the shrine 💥', reply: 'The forest shakes as you destroy it.', xp: 150 }
        ]
      },
      {
        prompt: 'You stand before two doors.',
        choices: [
          { text: 'Choose the golden door 🟡', reply: 'You walk into a radiant chamber.', xp: 200 },
          { text: 'Choose the shadow door ⚫', reply: 'The darkness swallows you whole.', xp: 200 }
        ]
      }
    ]
  },

  // Future expansion
  // 2: {
  //   title: 'The Oracle’s Chamber',
  //   steps: [ ... ]
  // }
};
