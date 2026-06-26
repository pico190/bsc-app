const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const slots = ['🍒', '🍋', '🔔', '💎', '🍀', '⭐', '🏆'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Juega a la tragaperras del BSC Bilel.')
    .addIntegerOption(option =>
      option
        .setName('apuesta')
        .setDescription('Cantidad de monedas a apostar.')
        .setRequired(true)
        .setMinValue(10)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('apuesta', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    const reel1 = slots[randomInt(0, slots.length - 1)];
    const reel2 = slots[randomInt(0, slots.length - 1)];
    const reel3 = slots[randomInt(0, slots.length - 1)];

    let winnings = 0;
    let resultText;

    if (reel1 === reel2 && reel2 === reel3) {
      winnings = bet * 4;
      resultText = '¡JACKPOT! Tres iguales.';
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      winnings = bet * 2;
      resultText = 'Dos iguales. Ganancia modesta.';
    } else {
      winnings = 0;
      resultText = 'Nada que ver. La casa gana.';
    }

    const net = winnings - bet;
    user.balance += net;
    save(data);

    const payload = createEconomyContainer({
      title: '🎰 Casino del BSC Bilel',
      description: `Has tirado de la palanca y salió:\n\n# ${reel1} ${reel2} ${reel3}\n\n${resultText}`,
      fields: [
        { name: 'Apuesta', value: formatCoins(bet) },
        { name: 'Ganancia bruta', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'Juega con responsabilidad. O no. Aquí no juzgamos.'
    });

    await interaction.reply(payload);
  }
};
