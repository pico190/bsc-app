const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos
const MIN_REWARD = 30;
const MAX_REWARD = 120;

const workMessages = [
  'Has vendido tu "compañía exclusiva" en la subasta benéfica del capitán. Alguien pagó {amount} por una cena incómoda.',
  'Has posado para el calendario oficial "Tripulación Sexy del BSC". Las ventas te dejan {amount}.',
  'Un turista borracho te confundió con la animadora principal y te dio {amount} por bailar un vals.',
  'Has flirtado con el jefe de recepción hasta conseguir upgrade de camarote gratis. Ahorraste y ganaste {amount}.',
  'Te has puesto un tutú y has animado la fiesta de la piscina. El director de entretenimiento te paga {amount} en negro.',
  'Has convencido a un pasajero de que el jacuzzi privado cuesta extra. Te llevas {amount} de comisión.',
  'Has ganado el concurso de "mejor sonrisa forzada del buffet". El premio son {amount}.',
  'Te han contratado para dar masajes en cubierta. Solo fueron de pies, pero cobraste {amount} igual.',
  'Has vendido fotos firmadas tuyas con uniforme de marinero. Alguien pagó {amount} por cinco prints.',
  'Has participado en el espectáculo nocturno "Cabaret del Bilel" y recaudaste {amount} en propinas.',
  'Una señora rica te pagó {amount} por que la llevaras a su camarote... y le abrieras el frigo porque no sabía.',
  'Has hecho de cupido improvisado entre dos pasajeros solitarios. Te pagaron {amount} por no juzgarlos.',
  'Te disfrazaste de capitán para una despedida de soltero. El grupo te soltó {amount}.',
  'Has vendido tu silla en el casino durante dos horas. Alguien desesperado pagó {amount} por la suerte de asiento.',
  'Has grabado un mensaje de voz sensual para el concurso de radio del barco. Ganaste {amount} y el respeto de nadie.',
  'Te han contratado para ser el acompañante de mesa de un VIP incómodo. Aguantaste la cena y cobraste {amount}.',
  'Has vendido agua bendita disfrazada de "perfume afrodisíaco del capitán". Ingresaste {amount}.',
  'Has ganado una apuesta sobre quién consigue más propinas en una noche. El botín es de {amount}.',
  'Te pagaron {amount} por hacerle compañía a un señor que solo quería contarte su divorcio durante cuatro horas.',
  'Has sido la estrella invitada de "Noche de Confesiones en la Cubierta". Tu honestidad sin filtro vale {amount}.'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabaja para ganar monedas.'),

  async execute(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const now = Date.now();

    let description;
    let fields = [];

    if (user.lastWork && now - user.lastWork < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastWork);
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      description = '💤 Estás cansado. Descansa un poco antes de volver a trabajar.';
      fields = [
        { name: 'Descanso restante', value: `${minutes}m ${seconds}s` }
      ];
    } else {
      const reward = randomInt(MIN_REWARD, MAX_REWARD);
      const messageTemplate = workMessages[randomInt(0, workMessages.length - 1)];

      user.balance += reward;
      user.lastWork = now;

      description = messageTemplate.replace('{amount}', formatCoins(reward));
      fields = [
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ];
    }

    save(data);

    const payload = createEconomyContainer({
      title: '💼 Trabajo',
      description,
      fields,
      footer: 'Puedes trabajar cada 5 minutos.'
    });

    await interaction.reply(payload);
  }
};
