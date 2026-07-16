const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function diceFace(num) {
  return DICE_FACES[num - 1] || '🎲';
}

function buildFrame(d1, d2, spinning, betType, betAmount, status) {
  const face1 = spinning ? '🎲' : diceFace(d1);
  const face2 = spinning ? '🎲' : diceFace(d2);
  const total = spinning ? '?' : d1 + d2;

  return createEconomyContainer({
    title: '🎲 Dados del BSC Bilel',
    description: `\n${face1}  +  ${face2}  =  **${total}**\n\n${status}`,
    fields: [
      { name: 'Tu apuesta', value: `${betType} — ${formatCoins(betAmount)}` }
    ],
    footer: 'Dados cargados no incluidos. Creemos.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dados')
    .setDescription('Tira los dados y apuesta al resultado.')
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
          { name: '📉 Bajo (2-6)', value: 'bajo' },
          { name: '🕖 Siete (7)', value: 'siete' },
          { name: '📈 Alto (8-12)', value: 'alto' }
        )
    ),

  async execute(interaction) {
    if (interaction.channelId !== GAMBLING_CHANNEL) {
      return await interaction.reply(createEphemeralReply(`❌ Las apuestas solo se pueden hacer en <#${GAMBLING_CHANNEL}>.`));
    }

    const bet = interaction.options.getInteger('apuesta', true);
    const tipo = interaction.options.getString('tipo', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const tipoLabel = tipo === 'bajo' ? '📉 Bajo (2-6)' : tipo === 'siete' ? '🕖 Siete (7)' : '📈 Alto (8-12)';

    const msg = await interaction.reply({
      ...buildFrame(0, 0, true, tipoLabel, bet, '🔄 Tirando los dados...'),
      fetchReply: true
    });

    for (let i = 0; i < 5; i++) {
      await sleep(400);
      await msg.edit(buildFrame(randomInt(1, 6), randomInt(1, 6), true, tipoLabel, bet, '🔄 Tirando los dados...'));
    }

    await sleep(500);

    const d1 = randomInt(1, 6);
    const d2 = randomInt(1, 6);
    const total = d1 + d2;

    let won = false;
    let multiplier = 0;

    if (tipo === 'bajo' && total >= 2 && total <= 6) {
      won = true;
      multiplier = 2;
    } else if (tipo === 'siete' && total === 7) {
      won = true;
      multiplier = 4;
    } else if (tipo === 'alto' && total >= 8 && total <= 12) {
      won = true;
      multiplier = 2;
    }

    const winnings = won ? bet * multiplier : 0;
    const net = winnings - bet;
    user.balance += winnings;
    save(data);

    const resultMsg = won
      ? `🎉 ¡Ganaste! ${d1}+d2 = ${total}.`
      : `💀 Perdiste. ${d1}+d2 = ${total}. Necesitabas ${tipo === 'bajo' ? '2-6' : tipo === 'siete' ? '7' : '8-12'}.`;

    const finalPayload = createEconomyContainer({
      title: '🎲 Dados del BSC Bilel',
      description: `\n${diceFace(d1)}  +  ${diceFace(d2)}  =  **${total}**\n\n${resultMsg}`,
      fields: [
        { name: 'Apuesta', value: `${tipoLabel} — ${formatCoins(bet)}` },
        { name: 'Multiplicador', value: won ? `x${multiplier}` : 'x0' },
        { name: 'Ganancia', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'Dados cargados no incluidos. Creemos.'
    });

    await msg.edit(finalPayload);
  }
};
