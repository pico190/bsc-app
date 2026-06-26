const { startPresenceRotation } = require('../utils/presence');
const { startPassScheduler } = require('../utils/passManager');

module.exports = {
  name: 'clientReady',
  once: true,

  execute(client) {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`📦 Discord.js v${require('discord.js').version}`);
    console.log(`🌐 Conectado a ${client.guilds.cache.size} servidor(es)`);

    startPresenceRotation(client);
    console.log('🎭 Estados personalizados rotativos iniciados.');

    startPassScheduler(client);
    console.log('🎫 Scheduler de BSC Pass iniciado.');
  }
};
