const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function getColor(num) {
  if (num === 0) return '🟢';
  return RED_NUMBERS.includes(num) ? '🔴' : '⚫';
}

function getColorName(num) {
  if (num === 0) return 'verde';
  return RED_NUMBERS.includes(num) ? 'rojo' : 'negro';
}

function buildFrame(currentNum, spinning, betType, betAmount, resultSoFar) {
  const ball = spinning ? '⚪' : `${getColor(currentNum)}`;
  const display = spinning ? `${ball} **${currentNum}**` : `${getColor(currentNum)} **${currentNum}**`;
  const status = spinning ? '🔄 La bola rebota...' : '✅ ¡Cayó!';

  return createEconomyContainer({
    title: '🎡 Ruleta del BSC Bilel',
    description: `\n${'─'.repeat(20)}\n\n${display}\n\n${'─'.repeat(20)}\n\n${status}`,
    fields: [
      { name: 'Tu apuesta', value: `${betType} — ${formatCoins(betAmount)}` }
    ],
    footer: 'El 0 siempre es verde. La casa siempre tiene ventaja.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ruleta')
    .setDescription('Apuesta en la ruleta del BSC Bilel.')
    .addIntegerOption(option =>
      option
        .setName('apuesta')
        .setDescription('Cantidad de monedas a apostar.')
        .setRequired(true)
        .setMinValue(10)
    )
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('¿A qué apuestas?')
        .setRequired(true)
        .addChoices(
          { name: '🔴 Rojo', value: 'rojo' },
          { name: '⚫ Negro', value: 'negro' },
          { name: '🟢 Verde', value: 'verde' },
          { name: '🎯 Número exacto (0-36)', value: 'numero' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('numero')
        .setDescription('Número al que apuestas (solo si elegiste número exacto).')
        .setMinValue(0)
        .setMaxValue(36)
    ),

  async execute(interaction) {
    if (interaction.channelId !== GAMBLING_CHANNEL) {
      return await interaction.reply(createEphemeralReply(`❌ Las apuestas solo se pueden hacer en <#${GAMBLING_CHANNEL}>.`));
    }

    const bet = interaction.options.getInteger('apuesta', true);
    const tipo = interaction.options.getString('tipo', true);
    const numeroElegido = interaction.options.getInteger('numero');

    if (tipo === 'numero' && (numeroElegido === null || numeroElegido === undefined)) {
      return await interaction.reply(createEphemeralReply('❌ Debes indicar un número (0-36) si apuestas a número exacto.'));
    }

    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const betLabel = tipo === 'numero' ? `Número ${numeroElegido}` : tipo.charAt(0).toUpperCase() + tipo.slice(1);

    const msg = await interaction.reply({
      ...buildFrame(randomInt(0, 36), true, betLabel, bet),
      fetchReply: true
    });

    const bounceFrames = 6;
    for (let i = 0; i < bounceFrames; i++) {
      await sleep(500);
      const fakeNum = randomInt(0, 36);
      await msg.edit(buildFrame(fakeNum, true, betLabel, bet));
    }

    await sleep(600);

    const result = randomInt(0, 36);
    const resultColor = getColorName(result);
    const resultEmoji = getColor(result);

    let won = false;
    let multiplier = 0;

    if (tipo === 'rojo' && resultColor === 'rojo') {
      won = true;
      multiplier = 2;
    } else if (tipo === 'negro' && resultColor === 'negro') {
      won = true;
      multiplier = 2;
    } else if (tipo === 'verde' && resultColor === 'verde') {
      won = true;
      multiplier = 14;
    } else if (tipo === 'numero' && result === numeroElegido) {
      won = true;
      multiplier = 14;
    }

    const winnings = won ? bet * multiplier : 0;
    const net = winnings - bet;
    user.balance += winnings;
    save(data);

    const resultMessage = won
      ? tipo === 'numero'
        ? `🎯 ¡Número exacto! El ${result} es tu número.`
        : `🎉 ¡Ganaste! Cayó en ${resultColor} ${resultEmoji}.`
      : tipo === 'numero'
        ? `💀 Cayó en ${resultColor} ${result} (${resultEmoji}). Tu número era ${numeroElegido}.`
        : `💀 Cayó en ${resultColor} ${result} (${resultEmoji}). Apostaste a ${tipo}.`;

    const finalPayload = createEconomyContainer({
      title: '🎡 Ruleta del BSC Bilel',
      description: `\n${'─'.repeat(20)}\n\n${resultEmoji} **${result}**\n\n${'─'.repeat(20)}\n\n${resultMessage}`,
      fields: [
        { name: 'Apuesta', value: `${betLabel} — ${formatCoins(bet)}` },
        { name: 'Multiplicador', value: won ? `x${multiplier}` : 'x0' },
        { name: 'Ganancia', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'El 0 siempre es verde. La casa siempre tiene ventaja.'
    });

    await msg.edit(finalPayload);
  }
};
