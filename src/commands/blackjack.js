const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt, sleep } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const GAMBLING_CHANNEL = '1520034653564571779';

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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

function cardPoints(card) {
  if (card.value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.value)) return 10;
  return parseInt(card.value);
}

function handTotal(hand) {
  let total = hand.reduce((sum, c) => sum + cardPoints(c), 0);
  let aces = hand.filter(c => c.value === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatCard(card) {
  return `${card.suit}${card.value}`;
}

function formatHand(hand) {
  return hand.map(formatCard).join(' ');
}

function buildPayload(playerHand, dealerHand, bet, hideSecond, status, userId, gameOver) {
  const playerTotal = handTotal(playerHand);
  const dealerDisplay = hideSecond
    ? `${formatCard(dealerHand[0])} ❓`
    : formatHand(dealerHand);
  const dealerTotal = hideSecond ? '?' : handTotal(dealerHand);

  const fields = [
    { name: `🃏 Tus cartas (${playerTotal})`, value: formatHand(playerHand) },
    { name: `🏦 Dealer (${dealerTotal})`, value: dealerDisplay },
    { name: 'Apuesta', value: formatCoins(bet) }
  ];

  if (status) {
    fields.push({ name: 'Estado', value: status });
  }

  const buttons = gameOver ? [] : [
    {
      customId: `bj_hit_${userId}`,
      label: '🃏 Pedir carta',
      style: ButtonStyle.Success,
      disabled: false
    },
    {
      customId: `bj_stand_${userId}`,
      label: '✋ Plantarse',
      style: ButtonStyle.Danger,
      disabled: false
    }
  ];

  return createEconomyContainer({
    title: '🃏 Blackjack del BSC Bilel',
    description: '¡Intenta llegar a 21 sin pasarte!',
    fields,
    buttons,
    footer: 'El dealer se planta en 17. Blackjack paga x2.5.'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Juega al Blackjack contra el dealer.')
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
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const playerTotal = handTotal(playerHand);

    if (playerTotal === 21) {
      const winnings = Math.floor(bet * 2.5);
      user.balance += winnings;
      save(data);

      const payload = buildPayload(playerHand, dealerHand, bet, false,
        `🎉 ¡BLACKJACK! Ganaste ${formatCoins(winnings)}.`, userId, true);
      return await interaction.reply(payload);
    }

    const payload = buildPayload(playerHand, dealerHand, bet, true, 'Tu turno. ¿Qué haces?', userId, false);
    const response = await interaction.reply({ ...payload, withResponse: true });
    const msg = response.resource.message;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId &&
        (i.customId === `bj_hit_${userId}` || i.customId === `bj_stand_${userId}`),
      time: 60000
    });

    let busted = false;

    collector.on('collect', async i => {
      if (i.customId === `bj_hit_${userId}`) {
        playerHand.push(deck.pop());
        const total = handTotal(playerHand);

        if (total > 21) {
          busted = true;
          save(data);
          collector.stop();
          const losePayload = buildPayload(playerHand, dealerHand, bet, false,
            `💀 Te pasaste con ${total}. Pierdes ${formatCoins(bet)}.`, userId, true);
          return await i.update(losePayload);
        }

        const hitPayload = buildPayload(playerHand, dealerHand, bet, true,
          `Tienes ${total}. ¿Qué haces?`, userId, false);
        return await i.update(hitPayload);
      }

      if (i.customId === `bj_stand_${userId}`) {
        collector.stop();

        let dealerTotal = handTotal(dealerHand);
        while (dealerTotal < 17) {
          dealerHand.push(deck.pop());
          dealerTotal = handTotal(dealerHand);
        }

        const playerFinal = handTotal(playerHand);
        let resultMsg;
        let winnings = 0;

        if (dealerTotal > 21) {
          winnings = bet * 2;
          resultMsg = `🏦 El dealer se pasó con ${dealerTotal}. ¡Ganas ${formatCoins(winnings)}!`;
        } else if (playerFinal > dealerTotal) {
          winnings = bet * 2;
          resultMsg = `🎉 Tienes ${playerFinal} vs ${dealerTotal}. ¡Ganas ${formatCoins(winnings)}!`;
        } else if (playerFinal === dealerTotal) {
          winnings = bet;
          resultMsg = `🤝 Empate a ${playerFinal}. Recuperas tu apuesta.`;
        } else {
          resultMsg = `💀 Tienes ${playerFinal} vs ${dealerTotal}. Pierdes ${formatCoins(bet)}.`;
        }

        user.balance += winnings;
        save(data);

        const standPayload = buildPayload(playerHand, dealerHand, bet, false, resultMsg, userId, true);
        return await i.update(standPayload);
      }
    });

    collector.on('end', async () => {
      if (!busted) {
        try {
          const disabledPayload = buildPayload(playerHand, dealerHand, bet, false,
            '⏰ Tiempo agotado. La mano se resuelve automáticamente.', userId, true);

          if (handTotal(playerHand) <= 21 && handTotal(dealerHand) < 17) {
            while (handTotal(dealerHand) < 17) {
              dealerHand.push(deck.pop());
            }
          }

          const playerFinal = handTotal(playerHand);
          const dealerFinal = handTotal(dealerHand);
          let winnings = 0;
          let resultMsg;

          if (dealerFinal > 21) {
            winnings = bet * 2;
            resultMsg = `🏦 Dealer se pasó. ¡Ganas ${formatCoins(winnings)}!`;
          } else if (playerFinal > dealerFinal) {
            winnings = bet * 2;
            resultMsg = `🎉 Ganas ${formatCoins(winnings)}!`;
          } else if (playerFinal === dealerFinal) {
            winnings = bet;
            resultMsg = `🤝 Empate. Recuperas tu apuesta.`;
          } else {
            resultMsg = `💀 Pierdes ${formatCoins(bet)}.`;
          }

          user.balance += winnings;
          save(data);

          await interaction.editReply(buildPayload(playerHand, dealerHand, bet, false, resultMsg, userId, true));
        } catch (e) { }
      }
    });
  }
};
