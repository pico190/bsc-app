const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.33) return 1.00;
  if (r < 0.55) return parseFloat((1 + Math.random() * 1.5).toFixed(2));
  if (r < 0.75) return parseFloat((2.5 + Math.random() * 2.5).toFixed(2));
  if (r < 0.90) return parseFloat((5 + Math.random() * 5).toFixed(2));
  if (r < 0.97) return parseFloat((10 + Math.random() * 15).toFixed(2));
  return parseFloat((25 + Math.random() * 75).toFixed(2));
}

function buildPayload(multiplier, bet, crashed, cashedOut, userId) {
  const bar = '█'.repeat(Math.min(Math.floor(multiplier * 3), 30));
  const rocket = crashed ? '💥' : '🚀';
  const status = crashed
    ? `💥 **CRASH** en **x${multiplier.toFixed(2)}**`
    : cashedOut
      ? `✅ ¡Retirado en **x${multiplier.toFixed(2)}**!`
      : `${rocket} **x${multiplier.toFixed(2)}** ${bar}`;

  const fields = [
    { name: 'Multiplicador', value: `**x${multiplier.toFixed(2)}**` },
    { name: 'Apuesta', value: formatCoins(bet) }
  ];

  if (cashedOut) {
    const winnings = Math.floor(bet * multiplier);
    fields.push({ name: 'Ganancia', value: formatCoins(winnings) });
  }

  const buttons = (crashed || cashedOut) ? [] : [
    {
      customId: `crash_cashout_${userId}`,
      label: '💰 Retirar',
      style: ButtonStyle.Success,
      disabled: false
    }
  ];

  return createEconomyContainer({
    title: '🚀 Crash del BSC Bilel',
    description: crashed
      ? `El cohete se estrelló.`
      : cashedOut
        ? `¡Te retiraste a tiempo!`
        : `El multiplicador sube... ¿cuándo te retiras?`,
    fields,
    buttons,
    footer: 'Cuanto más esperas, más ganas... o pierdes todo.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('Retírate antes de que el multiplicador explote.')
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
    const userId = interaction.user.id;

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const crashPoint = generateCrashPoint();
    let currentMultiplier = 1.00;
    let crashed = false;
    let cashedOut = false;
    let cashoutMultiplier = 0;

    const response = await interaction.reply({
      ...buildPayload(currentMultiplier, bet, false, false, userId),
      withResponse: true
    });
    const msg = response.resource.message;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId && i.customId === `crash_cashout_${userId}`,
      time: 120000
    });

    collector.on('collect', async i => {
      if (!crashed && !cashedOut) {
        cashedOut = true;
        cashoutMultiplier = currentMultiplier;
        collector.stop();

        const winnings = Math.floor(bet * cashoutMultiplier);
        user.balance += winnings;
        save(data);

        const payload = buildPayload(currentMultiplier, bet, false, true, userId);
        payload.components[0].components = [];
        const fields = payload.components[0].components;

        await i.update({
          ...createEconomyContainer({
            title: '🚀 Crash del BSC Bilel',
            description: `¡Te retiraste en **x${cashoutMultiplier.toFixed(2)}**!`,
            fields: [
              { name: 'Multiplicador', value: `**x${cashoutMultiplier.toFixed(2)}**` },
              { name: 'Apuesta', value: formatCoins(bet) },
              { name: 'Ganancia', value: formatCoins(winnings) },
              { name: 'Balance neto', value: `+${formatCoins(winnings - bet)}` },
              { name: 'Nuevo balance', value: formatCoins(user.balance) }
            ],
            buttons: [],
            footer: 'Cuanto más esperas, más ganas... o pierdes todo.'
          })
        });
      }
    });

    const incrementBase = 0.05;
    while (currentMultiplier < crashPoint && !cashedOut) {
      const delay = Math.max(200, 800 - Math.floor(currentMultiplier * 30));
      await sleep(delay);
      currentMultiplier = parseFloat((currentMultiplier + incrementBase + currentMultiplier * 0.02).toFixed(2));

      if (currentMultiplier >= crashPoint) {
        currentMultiplier = crashPoint;
        crashed = true;
      }

      if (!cashedOut) {
        try {
          await msg.edit(buildPayload(currentMultiplier, bet, crashed, false, userId));
        } catch (e) { }
      }
    }

    collector.stop();

    if (!cashedOut && crashed) {
      const finalPayload = createEconomyContainer({
        title: '🚀 Crash del BSC Bilel',
        description: `💥 **CRASH** en **x${crashPoint.toFixed(2)}**. El cohete se estrelló.`,
        fields: [
          { name: 'Multiplicador', value: `**x${crashPoint.toFixed(2)}**` },
          { name: 'Apuesta', value: formatCoins(bet) },
          { name: 'Resultado', value: `Perdiste ${formatCoins(bet)}` },
          { name: 'Nuevo balance', value: formatCoins(user.balance) }
        ],
        buttons: [],
        footer: 'Cuanto más esperas, más ganas... o pierdes todo.'
      });

      try {
        await msg.edit(finalPayload);
      } catch (e) { }
    }
  }
};
