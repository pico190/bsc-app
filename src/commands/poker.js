const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_RANKS = {
  'Escalera de Color': 100,
  'Poker': 50,
  'Full House': 25,
  'Color': 15,
  'Escalera': 10,
  'Trío': 5,
  'Doble Par': 3,
  'Par (J+)': 2,
  'Nada': 0
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ value, suit });
    }
  }
  return shuffle(deck);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function valueIndex(val) {
  return VALUES.indexOf(val);
}

function formatCard(card) {
  return `${card.suit}${card.value}`;
}

function evaluateHand(hand) {
  const vals = hand.map(c => valueIndex(c.value)).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (vals[4] - vals[0] === 4 && new Set(vals).size === 5) ||
    (vals.join(',') === '0,1,2,3,12');

  const counts = {};
  for (const c of hand) {
    counts[c.value] = (counts[c.value] || 0) + 1;
  }
  const countVals = Object.values(counts).sort((a, b) => b - a);

  if (isFlush && isStraight) return { name: 'Escalera de Color', multiplier: 100 };
  if (countVals[0] === 4) return { name: 'Poker', multiplier: 50 };
  if (countVals[0] === 3 && countVals[1] === 2) return { name: 'Full House', multiplier: 25 };
  if (isFlush) return { name: 'Color', multiplier: 15 };
  if (isStraight) return { name: 'Escalera', multiplier: 10 };
  if (countVals[0] === 3) return { name: 'Trío', multiplier: 5 };
  if (countVals[0] === 2 && countVals[1] === 2) return { name: 'Doble Par', multiplier: 3 };

  const highPairVals = Object.entries(counts).filter(([v, c]) => c === 2 && ['J', 'Q', 'K', 'A'].includes(v));
  if (highPairVals.length > 0) return { name: 'Par (J+)', multiplier: 2 };

  return { name: 'Nada', multiplier: 0 };
}

function buildPayload(hand, held, bet, phase, userId, result) {
  const cardDisplay = hand.map((c, i) => {
    const marker = held[i] ? '✅' : '  ';
    return `${marker} ${formatCard(c)}`;
  }).join('\n');

  const fields = [
    { name: '🃏 Tus cartas', value: cardDisplay },
    { name: 'Apuesta', value: formatCoins(bet) }
  ];

  if (result) {
    fields.push({ name: 'Mano', value: result.name });
    fields.push({ name: 'Multiplicador', value: `x${result.multiplier}` });
  }

  let buttons = [];
  if (phase === 'hold') {
    buttons = hand.map((c, i) => ({
      customId: `poker_hold_${i}_${userId}`,
      label: `${formatCard(c)}`,
      style: held[i] ? ButtonStyle.Success : ButtonStyle.Secondary,
      disabled: false
    }));
    buttons.push({
      customId: `poker_draw_${userId}`,
      label: '🔄 Cambiar no mantenidas',
      style: ButtonStyle.Primary,
      disabled: false
    });
  }

  return createEconomyContainer({
    title: '🃏 Video Poker del BSC Bilel',
    description: phase === 'hold'
      ? 'Selecciona las cartas que quieres **mantener**. Las demás se reemplazarán.'
      : 'Resultado final.',
    fields,
    buttons,
    footer: 'Par de J o mejor paga. Escalera de Color paga x100.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poker')
    .setDescription('Juega al Video Poker. Par de J o mejor para ganar.')
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

    const deck = createDeck();
    const hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const held = [false, false, false, false, false];

    const payload = buildPayload(hand, held, bet, 'hold', userId, null);
    const response = await interaction.reply({ ...payload, withResponse: true });
    const msg = response.resource.message;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId && i.customId.startsWith('poker_'),
      time: 60000
    });

    let done = false;

    collector.on('collect', async i => {
      if (i.customId.startsWith('poker_hold_')) {
        const idx = parseInt(i.customId.split('_')[2]);
        held[idx] = !held[idx];
        const holdPayload = buildPayload(hand, held, bet, 'hold', userId, null);
        return await i.update(holdPayload);
      }

      if (i.customId === `poker_draw_${userId}`) {
        collector.stop();
        done = true;

        for (let j = 0; j < 5; j++) {
          if (!held[j]) {
            hand[j] = deck.pop();
          }
        }

        await sleep(500);

        const result = evaluateHand(hand);
        const winnings = bet * result.multiplier;
        const net = winnings - bet;
        user.balance += winnings;
        save(data);

        const resultMsg = result.multiplier > 0
          ? `🎉 ¡${result.name}! Ganas ${formatCoins(winnings)}.`
          : `💀 ${result.name}. No ganas nada.`;

        const finalPayload = createEconomyContainer({
          title: '🃏 Video Poker del BSC Bilel',
          description: `${resultMsg}`,
          fields: [
            { name: '🃏 Tus cartas', value: hand.map(c => formatCard(c)).join(' | ') },
            { name: 'Mano', value: result.name },
            { name: 'Apuesta', value: formatCoins(bet) },
            { name: 'Multiplicador', value: `x${result.multiplier}` },
            { name: 'Ganancia', value: formatCoins(winnings) },
            { name: 'Balance neto', value: `${net >= 0 ? '+' : ''}${formatCoins(net)}` },
            { name: 'Nuevo balance', value: formatCoins(user.balance) }
          ],
          buttons: [],
          footer: 'Par de J o mejor paga. Escalera de Color paga x100.'
        });

        return await i.update(finalPayload);
      }
    });

    collector.on('end', async () => {
      if (!done) {
        try {
          const result = evaluateHand(hand);
          const winnings = bet * result.multiplier;
          user.balance += winnings;
          save(data);

          const resultMsg = result.multiplier > 0
            ? `⏰ Tiempo agotado. ¡${result.name}! Ganas ${formatCoins(winnings)}.`
            : `⏰ Tiempo agotado. ${result.name}. No ganas nada.`;

          await interaction.editReply(createEconomyContainer({
            title: '🃏 Video Poker del BSC Bilel',
            description: resultMsg,
            fields: [
              { name: '🃏 Tus cartas', value: hand.map(c => formatCard(c)).join(' | ') },
              { name: 'Mano', value: result.name },
              { name: 'Ganancia', value: formatCoins(winnings) },
              { name: 'Nuevo balance', value: formatCoins(user.balance) }
            ],
            buttons: [],
            footer: 'Par de J o mejor paga. Escalera de Color paga x100.'
          }));
        } catch (e) { }
      }
    });
  }
};
