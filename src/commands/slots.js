const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const slots = ['🍒', '🍋', '🔔', '💎', '🍀', '⭐', '🏆'];
const GAMBLING_CHANNEL = '1520034653564571779';

function spinReel() {
  return slots[randomInt(0, slots.length - 1)];
}

function buildSpinFrame(reel1, reel2, reel3, title, status) {
  const display = reel2 === null
    ? `${reel1}  ❓  ❓`
    : reel3 === null
      ? `${reel1}  ${reel2}  ❓`
      : `${reel1}  ${reel2}  ${reel3}`;

  return createEconomyContainer({
    title: '🎰 Tragaperras del BSC Bilel',
    description: `# ${display}\n\n${status}`,
    fields: title ? [{ name: title, value: '\u200b' }] : [],
    footer: 'Juega con responsabilidad. O no. Aquí no juzgamos.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Juega a la tragaperras del BSC Bilel.')
    .addIntegerOption(option =>
      option
        .setName('apuesta')
        .setDescription('Cantidad de monedas a apostar.')
        .setRequired(true)
        .setMinValue(10)
    ),

  async execute(interaction) {
    if (interaction.channelId !== GAMBLING_CHANNEL) {
      return await interaction.reply(createEphemeralReply(`❌ Las apuestas solo se pueden hacer en <#${GAMBLING_CHANNEL}>.`));
    }

    const bet = interaction.options.getInteger('apuesta', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const final1 = spinReel();
    const final2 = spinReel();
    const final3 = spinReel();

    const response = await interaction.reply({
      ...buildSpinFrame('🎰', null, null, `Apuesta: ${formatCoins(bet)}`, '🔄 Girando...'),
      withResponse: true
    });
    const msg = response.resource.message;

    await sleep(800);
    await msg.edit(buildSpinFrame(final1, null, null, `Apuesta: ${formatCoins(bet)}`, '🔄 Girando...'));

    await sleep(800);
    await msg.edit(buildSpinFrame(final1, final2, null, `Apuesta: ${formatCoins(bet)}`, '🔄 Girando...'));

    await sleep(800);

    let winnings = 0;
    let resultText;
    let emoji;

    if (final1 === final2 && final2 === final3) {
      winnings = bet * 4;
      resultText = '¡JACKPOT! ¡Tres iguales!';
      emoji = '🎉';
    } else if (final1 === final2 || final2 === final3 || final1 === final3) {
      winnings = bet * 2;
      resultText = 'Dos iguales. Ganancia modesta.';
      emoji = '✨';
    } else {
      winnings = 0;
      resultText = 'Nada que ver. La casa gana.';
      emoji = '💀';
    }

    const net = winnings - bet;
    user.balance += winnings;
    save(data);

    const finalPayload = createEconomyContainer({
      title: '🎰 Tragaperras del BSC Bilel',
      description: `# ${final1}  ${final2}  ${final3}\n\n${emoji} ${resultText}`,
      fields: [
        { name: 'Apuesta', value: formatCoins(bet) },
        { name: 'Ganancia', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'Juega con responsabilidad. O no. Aquí no juzgamos.'
    });

    await msg.edit(finalPayload);
  }
};
