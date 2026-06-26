const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos
const MIN_REWARD = 80;
const MAX_REWARD = 250;
const SUCCESS_CHANCE = 55;

const successMessages = [
  'Has hackeado la máquina de propinas del bar y durante diez minutos cada cerveza pagaba el doble. Recaudaste {amount} antes de que sonara la alarma.',
  'Te hiciste pasar por inspector de sanidad y cerraste el buffet durante una hora. Los pasajeros te sobornaron con {amount} para que reabrieras.',
  'Robaste el maletín del capitán Biel mientras dormía la siesta. Dentro había {amount} y una foto comprometedora.',
  'Organizaste una timba de póker en el almacén de chalecos salvavidas. Ganas {amount} porque todos los demás estaban borrachos.',
  'Vendiste entradas falsas para la cena de gala. Nadie se enteró hasta el postre. Te embolsaste {amount}.',
  'Desviaste el carrito de bebidas premium hacia tu camarote y lo revendiste a los adolescentes del crucero. Beneficio: {amount}.',
  'Amenazaste al fotógrafo oficial con publicar sus fotos de borrachera. Te pagó {amount} por tu silencio profesional.',
  'Hackeaste el sistema de cabinas y vendiste upgrades inexistentes a turistas ingenuos. Ganancia: {amount}.',
  'Robaste la recaudación del bingo nocturno mientras la abuela ganadora bailaba. Te llevaste {amount} y cero remordimientos.',
  'Secuestraste el loro de cubierta y pediste rescate en snacks. Los niños reunieron {amount} para recuperarlo.'
];

const failMessages = [
  'Intentaste robar la caja fuerte del casino pero estaba vacía. El seguridad te pilló y te multaron con {amount}.',
  'Trataste de falsificar tarjetas de embarque y usaste como plantilla la tuya propia. Te descubrieron al instante y pagas {amount}.',
  'Quisiste desviar el barco ligeramente para "cobrar el seguro". No sabías que el seguro no cubre torpeza. Pierdes {amount}.',
  'Intentaste vender droga en el baño de mujeres. Era el baño de hombres. Te requisaron {amount} y tu orgullo.',
  'Robaste un collar del casino pero resultó ser de plástico del duty free. Te descontaron {amount} por daños y ridículo.',
  'Hiciste un chantaje al chef con fotos de él bebiendo. Él te mostró fotos tuyas peores. Perdiste {amount} en el trueque.',
  'Intentaste colarte en el camarote del capitán pero era la suite de seguridad. Te arrestaron y te cobraron {amount} de fianza.',
  'Montaste una estafa piramidal con las excursiones. El único que compró fue Biel. Tuviste que devolverle {amount}.',
  'Trataste de hackear el sistema de apuestas pero reiniciaste el wifi del barco entero. Los pasajeros te linchan y pagas {amount} en compensaciones.',
  'Intentaste robarle a un anciano en el ascensor. Era exboxeador. Te dejó {amount} más liviano de bolsillo y con la nariz torcida 💀'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crime')
    .setDescription('Comete un crimen del BSC Bilel. A veces sale bien, a veces acaba mal.'),

  async execute(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const now = Date.now();

    let description;
    let fields = [];
    let title = '🦹 Crimen';

    if (user.lastCrime && now - user.lastCrime < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastCrime);
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      description = '⏳ La policía de cubierta aún te vigila. Espera antes de volver a delinquir.';
      fields = [
        { name: 'Tiempo restante', value: `${minutes}m ${seconds}s` }
      ];
    } else {
      user.lastCrime = now;
      const success = randomInt(1, 100) <= SUCCESS_CHANCE;

      if (success) {
        const reward = randomInt(MIN_REWARD, MAX_REWARD);
        user.balance += reward;
        const messageTemplate = successMessages[randomInt(0, successMessages.length - 1)];
        description = messageTemplate.replace('{amount}', formatCoins(reward));
        title = '🦹 Crimen exitoso';
      } else {
        const fine = randomInt(MIN_REWARD, MAX_REWARD);
        const messageTemplate = failMessages[randomInt(0, failMessages.length - 1)];

        if (user.balance < fine) {
          const available = user.balance;
          user.balance = 0;
          description = messageTemplate.replace('{amount}', formatCoins(available));
        } else {
          user.balance -= fine;
          description = messageTemplate.replace('{amount}', formatCoins(fine));
        }
        title = '🚨 Crimen fallido';
      }

      fields = [
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ];
    }

    save(data);

    const payload = createEconomyContainer({
      title,
      description,
      fields,
      footer: 'A robar como Dios manda, bro.'
    });

    await interaction.reply(payload);
  }
};
