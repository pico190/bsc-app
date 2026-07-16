const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const SEGMENTS = [
  { multiplier: 0, label: 'x0', emoji: '💀', color: '⚫' },
  { multiplier: 0.5, label: 'x0.5', emoji: '😢', color: '🔴' },
  { multiplier: 1, label: 'x1', emoji: '😐', color: '🟡' },
  { multiplier: 1.5, label: 'x1.5', emoji: '🙂', color: '🟢' },
  { multiplier: 2, label: 'x2', emoji: '😊', color: '🔵' },
  { multiplier: 3, label: 'x3', emoji: '😄', color: '🟣' },
  { multiplier: 5, label: 'x5', emoji: '🤑', color: '🟠' },
  { multiplier: 10, label: 'x10', emoji: '🎉', color: '💎' }
];

function buildFrame(currentIdx, spinning, bet, finalResult) {
  const seg = SEGMENTS[currentIdx];
  const pointer = spinning ? '⬇️' : '✅';

  const wheelDisplay = SEGMENTS.map((s, i) => {
    const marker = i === currentIdx ? `${pointer}` : '  ';
    return `${marker} ${s.color} ${s.emoji} ${s.label}`;
  }).join('\n');

  const status = spinning
    ? '🔄 La rueda gira...'
    : finalResult
      ? `Cayó en **${finalResult.label}** ${finalResult.emoji}`
      : '';

  return createEconomyContainer({
    title: '🎡 Rueda de la Fortuna del BSC Bilel',
    description: `\n${wheelDisplay}\n\n${status}`,
    fields: [
      { name: 'Apuesta', value: formatCoins(bet) }
    ],
    footer: 'La suerte decide. ¿Te tocará x10?'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wheel')
    .setDescription('Gira la rueda de la fortuna.')
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

    const msg = await interaction.reply({
      ...buildFrame(0, true, bet),
      fetchReply: true
    });

    const totalFrames = 15;
    const finalIdx = randomInt(0, SEGMENTS.length - 1);
    const result = SEGMENTS[finalIdx];

    for (let i = 0; i < totalFrames; i++) {
      const delay = 200 + i * 40;
      await sleep(delay);
      const idx = (i % SEGMENTS.length);
      await msg.edit(buildFrame(idx, true, bet));
    }

    await sleep(600);
    await msg.edit(buildFrame(finalIdx, true, bet));
    await sleep(400);

    const winnings = Math.floor(bet * result.multiplier);
    const net = winnings - bet;
    user.balance += winnings;
    save(data);

    const resultMsg = result.multiplier === 0
      ? `💀 x0. Perdiste ${formatCoins(bet)}.`
      : result.multiplier >= 5
        ? `🎉 ¡${result.emoji} x${result.multiplier}! ¡Ganas ${formatCoins(winnings)}!`
        : `${result.emoji} x${result.multiplier}. Ganas ${formatCoins(winnings)}.`;

    const finalPayload = createEconomyContainer({
      title: '🎡 Rueda de la Fortuna del BSC Bilel',
      description: `\n${'⬇️'} ${result.color} ${result.emoji} **${result.label}**\n\n${resultMsg}`,
      fields: [
        { name: 'Apuesta', value: formatCoins(bet) },
        { name: 'Multiplicador', value: `x${result.multiplier}` },
        { name: 'Ganancia', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'La suerte decide. ¿Te tocará x10?'
    });

    await msg.edit(finalPayload);
  }
};
