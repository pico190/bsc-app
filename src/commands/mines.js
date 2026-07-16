const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';
const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function generateMines(numMines) {
  const mines = new Set();
  while (mines.size < numMines) {
    mines.add(randomInt(0, TOTAL_CELLS - 1));
  }
  return mines;
}

function calculateMultiplier(opened, numMines) {
  if (opened === 0) return 1;
  const safe = TOTAL_CELLS - numMines;
  let mult = 1;
  for (let i = 0; i < opened; i++) {
    mult *= (TOTAL_CELLS - i) / (safe - i);
  }
  return parseFloat((mult * 0.97).toFixed(2));
}

function buildGrid(revealed, mines, gameOver, showAll) {
  const rows = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    let row = '';
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      if (revealed.has(idx)) {
        row += mines.has(idx) ? '💣' : '💎';
      } else if (showAll && mines.has(idx)) {
        row += '💣';
      } else {
        row += '⬛';
      }
      row += ' ';
    }
    rows.push(row.trim());
  }
  return rows.join('\n');
}

function buildPayload(revealed, mines, bet, numMines, gameOver, userId, hitMine, cashedOut, currentMult) {
  const opened = revealed.size;
  const mult = calculateMultiplier(opened, numMines);
  const grid = buildGrid(revealed, mines, gameOver, gameOver);

  const status = hitMine
    ? '💥 ¡BOOM! Pisaste una mina.'
    : cashedOut
      ? `✅ ¡Retirado en x${currentMult}!`
      : `${opened > 0 ? `💎 ${opened} casilla(s) abierta(s). Multiplicador: x${mult}` : 'Elige una casilla.'}`;

  const fields = [
    { name: 'Tablero', value: grid },
    { name: 'Minas', value: `${numMines}`, inline: true },
    { name: 'Apuesta', value: formatCoins(bet), inline: true }
  ];

  if (opened > 0 && !gameOver) {
    fields.push({ name: 'Retirarse ahora', value: formatCoins(Math.floor(bet * mult)), inline: true });
  }

  if (cashedOut) {
    fields.push({ name: 'Ganancia', value: formatCoins(Math.floor(bet * currentMult)) });
  }

  let buttons = [];
  if (!gameOver) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const idx = r * GRID_SIZE + c;
        row.push({
          customId: `mine_${idx}_${userId}`,
          label: revealed.has(idx) ? (mines.has(idx) ? '💣' : '💎') : `${idx + 1}`,
          style: revealed.has(idx)
            ? (mines.has(idx) ? ButtonStyle.Danger : ButtonStyle.Success)
            : ButtonStyle.Secondary,
          disabled: revealed.has(idx)
        });
      }
      buttons.push(row);
    }
    if (opened > 0) {
      buttons.push([{
        customId: `mine_cashout_${userId}`,
        label: `💰 Retirar (${formatCoins(Math.floor(bet * mult))})`,
        style: ButtonStyle.Primary,
        disabled: false
      }]);
    }
  }

  return { fields, grid, buttons, status, mult };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Abre casillas sin pisar una mina. Retírate cuando quieras.')
    .addIntegerOption(option =>
      option
        .setName('apuesta')
        .setDescription('Cantidad de monedas a apostar.')
        .setRequired(true)
        .setMinValue(10)
    )
    .addIntegerOption(option =>
      option
        .setName('minas')
        .setDescription('Número de minas (1-5). Más minas = más riesgo = más ganancia.')
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    if (interaction.channelId !== GAMBLING_CHANNEL) {
      return await interaction.reply(createEphemeralReply(`❌ Las apuestas solo se pueden hacer en <#${GAMBLING_CHANNEL}>.`));
    }

    const bet = interaction.options.getInteger('apuesta', true);
    const numMines = interaction.options.getInteger('minas') || 3;
    const data = load();
    const user = getUser(data, interaction.user.id);
    const userId = interaction.user.id;

    if (user.balance < bet) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero. Tu balance es ${formatCoins(user.balance)}.`));
    }

    user.balance -= bet;
    save(data);

    const mines = generateMines(numMines);
    const revealed = new Set();
    let gameOver = false;
    let hitMine = false;
    let cashedOut = false;
    let cashoutMult = 0;

    const { fields, buttons, status, mult } = buildPayload(revealed, mines, bet, numMines, false, userId, false, false, 0);

    const payload = createEconomyContainer({
      title: '💣 Mines del BSC Bilel',
      description: status,
      fields,
      buttons,
      footer: 'Encuentra 💎 para ganar. Evita las 💣.'
    });

    const response = await interaction.reply({ ...payload, withResponse: true });
    const msg = response.resource.message;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId && i.customId.startsWith('mine_'),
      time: 120000
    });

    collector.on('collect', async i => {
      if (gameOver) return;

      if (i.customId === `mine_cashout_${userId}`) {
        cashedOut = true;
        cashoutMult = calculateMultiplier(revealed.size, numMines);
        gameOver = true;
        collector.stop();

        const winnings = Math.floor(bet * cashoutMult);
        user.balance += winnings;
        save(data);

        const { fields: f, buttons: b, status: s } = buildPayload(revealed, mines, bet, numMines, true, userId, false, true, cashoutMult);

        const finalPayload = createEconomyContainer({
          title: '💣 Mines del BSC Bilel',
          description: `✅ ¡Retirado en **x${cashoutMult}**!`,
          fields: [
            ...f,
            { name: 'Ganancia', value: formatCoins(winnings) },
            { name: 'Balance neto', value: `+${formatCoins(winnings - bet)}` },
            { name: 'Nuevo balance', value: formatCoins(user.balance) }
          ],
          buttons: [],
          footer: 'Encuentra 💎 para ganar. Evita las 💣.'
        });

        return await i.update(finalPayload);
      }

      const idx = parseInt(i.customId.split('_')[1]);
      if (revealed.has(idx)) return;

      revealed.add(idx);

      if (mines.has(idx)) {
        hitMine = true;
        gameOver = true;
        collector.stop();

        const { fields: f } = buildPayload(revealed, mines, bet, numMines, true, userId, true, false, 0);

        const losePayload = createEconomyContainer({
          title: '💣 Mines del BSC Bilel',
          description: '💥 **¡BOOM!** Pisaste una mina.',
          fields: [
            ...f,
            { name: 'Resultado', value: `Perdiste ${formatCoins(bet)}` },
            { name: 'Nuevo balance', value: formatCoins(user.balance) }
          ],
          buttons: [],
          footer: 'Encuentra 💎 para ganar. Evita las 💣.'
        });

        return await i.update(losePayload);
      }

      const { fields: nf, buttons: nb, status: ns, mult: nm } = buildPayload(revealed, mines, bet, numMines, false, userId, false, false, 0);

      const updatePayload = createEconomyContainer({
        title: '💣 Mines del BSC Bilel',
        description: ns,
        fields: nf,
        buttons: nb,
        footer: 'Encuentra 💎 para ganar. Evita las 💣.'
      });

      return await i.update(updatePayload);
    });

    collector.on('end', async () => {
      if (!gameOver) {
        try {
          const mult = calculateMultiplier(revealed.size, numMines);
          const winnings = Math.floor(bet * mult);
          user.balance += winnings;
          save(data);

          const { fields: f } = buildPayload(revealed, mines, bet, numMines, true, userId, false, true, mult);

          await interaction.editReply(createEconomyContainer({
            title: '💣 Mines del BSC Bilel',
            description: `⏰ Tiempo agotado. Retirado automáticamente en **x${mult}**.`,
            fields: [
              ...f,
              { name: 'Ganancia', value: formatCoins(winnings) },
              { name: 'Nuevo balance', value: formatCoins(user.balance) }
            ],
            buttons: [],
            footer: 'Encuentra 💎 para ganar. Evita las 💣.'
          }));
        } catch (e) { }
      }
    });
  }
};
