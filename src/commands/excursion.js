const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos
const MIN_REWARD = 60;
const MAX_REWARD = 180;

const excursions = [
  'Fuiste a una excursión de snorkel y encontraste unas monedas brillantes bajo el agua. Ganaste {amount}.',
  'Visitaste un pueblo costero y vendiste postales del BSC Bilel a turistas despistados. Ingresaste {amount}.',
  'Participaste en un tour de cuevas y encontraste un cofre olvidado. Dentro había {amount}.',
  'Alquilaste una moto de agua y le ganaste una carrera al capitán. El premio fueron {amount}.',
  'Ayudaste a un anciano local a cargar cocos. Te pagó {amount} y unos cuantos cocos de regalo.',
  'Te perdiste en el mercado local pero conseguiste regatear un recuerdo caro. Lo revendiste por {amount}.',
  'Fuiste a una clase de surf y un instructor te pagó {amount} por no hundir la tabla.',
  'Hiciste de guía turístico improvisado para un grupo de pasajeros. Te dieron {amount} en propinas.',
  'Encontraste una concha rara en la playa y un coleccionista te pagó {amount} por ella.',
  'Te apuntaste a una excursión de pesca y pescaste el pez más grande. Te llevaste {amount} del bote.'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('excursion')
    .setDescription('Participa en una excursión del crucero y gana monedas.'),

  async execute(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const now = Date.now();

    let description;
    let fields = [];

    if (user.lastExcursion && now - user.lastExcursion < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastExcursion);
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      description = '🛳️ Las excursiones salen en horario fijo. Espera al próximo grupo.';
      fields = [
        { name: 'Próxima excursión', value: `${minutes}m ${seconds}s` }
      ];
    } else {
      const reward = randomInt(MIN_REWARD, MAX_REWARD);
      const messageTemplate = excursions[randomInt(0, excursions.length - 1)];

      user.balance += reward;
      user.lastExcursion = now;

      description = messageTemplate.replace('{amount}', formatCoins(reward));
      fields = [
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ];
    }

    save(data);

    const payload = createEconomyContainer({
      title: '🌴 Excursión en tierra',
      description,
      fields,
      footer: 'Nueva excursión disponible cada 30 minutos.'
    });

    await interaction.reply(payload);
  }
};
