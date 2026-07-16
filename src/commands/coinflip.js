const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const FLIP_FRAMES = ['🟡', '🟠', '🟡', '🟠', '🟡'];

function buildFrame(side, spinning, betType, betAmount, status) {
  const coin = spinning ? side : (side === 'cara' ? '👑' : '⚓');

  return createEconomyContainer({
    title: '🪙 Cara o Cruz del BSC Bilel',
    description: `\n${'─'.repeat(20)}\n\n# ${coin}\n\n${'─'.repeat(20)}\n\n${status}`,
    fields: [
      { name: 'Tu apuesta', value: `${betType} — ${formatCoins(betAmount)}` }
    ],
    footer: '50/50. O ganas o pierdes. Así de simple.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lanza una moneda: cara o cruz.')
    .addIntegerOption(option =>
      option
        .setName('apuesta')
        .setDescription('Cantidad de monedas a apostar.')
        .setRequired(true)
        .setMinValue(10)
    )
    .addStringOption(option =>
      option
        .setName('lado')
        .setDescription('¿A qué apuestas?')
        .setRequired(true)
        .addChoices(
          { name: '👑 Cara', value: 'cara' },
          { name: '⚓ Cruz', value: 'cruz' }
        )
    ),

  async execute(interaction) {
    if (interaction.channelId !== GAMBLING_CHANNEL) {
      return await interaction.reply(createEphemeralReply(`❌ Las apuestas solo se pueden hacer en <#${GAMBLING_CHANNEL}>.`));
    }

    const bet = interaction.options.getInteger('apuesta', true);
    const lado = interaction.options.getString('lado', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const ladoLabel = lado === 'cara' ? '👑 Cara' : '⚓ Cruz';

    const msg = await interaction.reply({
      ...buildFrame('🟡', true, ladoLabel, bet, '🔄 La moneda gira...'),
      fetchReply: true
    });

    for (let i = 0; i < 5; i++) {
      await sleep(350);
      await msg.edit(buildFrame(FLIP_FRAMES[i], true, ladoLabel, bet, '🔄 La moneda gira...'));
    }

    await sleep(500);

    const result = randomInt(0, 1) === 0 ? 'cara' : 'cruz';
    const resultEmoji = result === 'cara' ? '👑' : '⚓';
    const won = lado === result;

    const winnings = won ? bet * 2 : 0;
    const net = winnings - bet;
    user.balance += winnings;
    save(data);

    const resultMsg = won
      ? `🎉 ¡Salió ${result} ${resultEmoji}! ¡Ganas ${formatCoins(winnings)}!`
      : `💀 Salió ${result} ${resultEmoji}. Apostaste a ${lado}. Pierdes ${formatCoins(bet)}.`;

    const finalPayload = createEconomyContainer({
      title: '🪙 Cara o Cruz del BSC Bilel',
      description: `\n${'─'.repeat(20)}\n\n# ${resultEmoji}\n\n${'─'.repeat(20)}\n\n${resultMsg}`,
      fields: [
        { name: 'Apuesta', value: `${ladoLabel} — ${formatCoins(bet)}` },
        { name: 'Ganancia', value: formatCoins(winnings) },
        { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: '50/50. O ganas o pierdes. Así de simple.'
    });

    await msg.edit(finalPayload);
  }
};
