const { ActivityType } = require('discord.js');

const STATUSES = [
  'Navegando por el BSC Bilel 🚢',
  'Sirviendo mojitos en cubierta 🍹',
  'Buscando el Mapa del Tesoro 🗺️',
  'Haciendo trampa en el bingo 🎰',
  'Robando propinas en el bar 💰',
  'Discutiendo con el Loro de Cubierta 🦜',
  'En el jacuzzi privado con 7 personas 🛁',
  'Perdido en la excursión en lancha 🛥️',
  'Esquivando a seguridad 🚨',
  'Contando BSCOINs en el casino 🎰',
  'Flirtando con el fotógrafo oficial 📸',
  'Cerrando el buffet con inspector de sanidad 🍽️',
  'Subido al Yate Privado BSC 🚢',
  'Huyendo del puerto de turno 🏃',
  'Repartiendo Chanclas del Buffet 🩴'
];

const ROTATION_INTERVAL_MS = 15 * 1000; // 15 segundos

function startPresenceRotation(client) {
  if (!client.user) return;

  let index = 0;

  const update = () => {
    client.user.setPresence({
      activities: [{
        type: ActivityType.Custom,
        name: 'custom',
        state: STATUSES[index]
      }],
      status: 'online'
    });

    index = (index + 1) % STATUSES.length;
  };

  update();
  return setInterval(update, ROTATION_INTERVAL_MS);
}

module.exports = { startPresenceRotation, STATUSES };
