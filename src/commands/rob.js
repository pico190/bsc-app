const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins, randomInt } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutos
const SUCCESS_CHANCE = 45;
const MIN_ROB_PERCENT = 20;
const MAX_ROB_PERCENT = 40;
const MIN_FINE = 50;
const MAX_FINE = 150;
const MIN_VICTIM_BALANCE = 100;

const successMessages = [
  'Le vaciaste los bolsillos a {victim} mientras contemplaba el atardecer en la popa. Te llevaste {amount}.',
  'Distraíste a {victim} con un cóctel sin alcohol y le mangaste la cartera. Ganancia: {amount}.',
  'Cambiaste la tarjeta de su camarote por la tuya. {victim} no se enteró y tú ganaste {amount}.',
  'Le robaste la propina al camarero justo antes de que {victim} la recogiera. Son {amount} limpios.',
  'Hiciste que {victim} se creyera que había ganado el bingo y le cobraste "impuestos" de {amount}.',
  'Engañaste a {victim} para que comprara un mapa del tesoro falso. Te embolsaste {amount}.',
  'Le desvalijaste la nevera del camarote a {victim} y vendiste los snacks. Beneficio: {amount}.',
  'Falsificaste la firma de {victim} en un recibo de bar. Te ahorraste {amount}.',
  'Le cambiaste el dinero de {victim} por monedas de arcade sin valor. Tuyas: {amount}.',
  'Convenciste a {victim} de que pagara por un tour fantasma. Te quedaste con {amount}.'
];

const failMessages = [
  'Intentaste robar a {victim} pero era agente de seguridad encubierto. Multa: {amount}.',
  '{victim} te pilló metiendo la mano en su bolso y llamó a capitanía. Pagas {amount}.',
  'Tropezaste con {victim} mientras huías. Te hizo caer y perdiste {amount} por el suelo.',
  'Intentaste asaltar a {victim}, pero llevaba cámara corporal. Te multan con {amount}.',
  '{victim} resultó ser exluchador. Te dejó {amount} más pobre y una lección aprendida.',
  'Te confundiste de camarote y robaste a un maniquí. El verdadero {victim} te denunció. Pagas {amount}.',
  'La alarma del camarote de {victim} sonó antes de que cogieras nada. Multa: {amount}.',
  '{victim} te grabó en vídeo y lo subió al chat del barco. Te costó {amount} en sobornos.',
  'Intentaste drogar el cóctel de {victim}, pero era agua del grifo. Te descubrieron y pagas {amount}.',
  'Huiste del lugar del crimen pero te atascaste en el salvavidas. {victim} te denunció por {amount}.'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Roba a otro pasajero del BSC Bilel.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('A quién quieres atracar.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const victimUser = interaction.options.getUser('usuario', true);

    if (victimUser.id === interaction.user.id) {
      return await interaction.reply({
        content: '❌ No puedes robarte a ti mismo, kamikaze.',
        ephemeral: true
      });
    }

    if (victimUser.bot) {
      return await interaction.reply({
        content: '❌ Los bots no llevan dinero encima.',
        ephemeral: true
      });
    }

    const data = load();
    const thief = getUser(data, interaction.user.id);
    const now = Date.now();

    let description;
    let fields = [];
    let title = '🥷 Atraco';

    if (thief.lastRob && now - thief.lastRob < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - thief.lastRob);
      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      save(data);
      description = '👮 Los de seguridad aún te buscan. Espera antes de volver a atracar.';
      fields = [
        { name: 'Tiempo restante', value: `${minutes}m ${seconds}s` }
      ];
    } else {
      const victim = getUser(data, victimUser.id);

      if (victim.balance < MIN_VICTIM_BALANCE) {
        save(data);
        return await interaction.reply({
          content: `❌ ${victimUser.username} está más seco que la cubierta en agosto. No tiene nada que robar.`,
          ephemeral: true
        });
      }

      thief.lastRob = now;
      const success = randomInt(1, 100) <= SUCCESS_CHANCE;

      if (success) {
        const percent = randomInt(MIN_ROB_PERCENT, MAX_ROB_PERCENT);
        const amount = Math.floor(victim.balance * percent / 100);

        victim.balance -= amount;
        thief.balance += amount;

        const messageTemplate = successMessages[randomInt(0, successMessages.length - 1)];
        description = messageTemplate
          .replace('{victim}', `<@${victimUser.id}>`)
          .replace('{amount}', formatCoins(amount));
        title = '🥷 Atraco exitoso';
      } else {
        const fine = randomInt(MIN_FINE, MAX_FINE);
        const compensation = Math.floor(fine / 2);

        if (thief.balance < fine) {
          const available = thief.balance;
          victim.balance += available;
          thief.balance = 0;

          description = failMessages[randomInt(0, failMessages.length - 1)]
            .replace('{victim}', `<@${victimUser.id}>`)
            .replace('{amount}', formatCoins(available));
        } else {
          thief.balance -= fine;
          victim.balance += compensation;

          description = failMessages[randomInt(0, failMessages.length - 1)]
            .replace('{victim}', `<@${victimUser.id}>`)
            .replace('{amount}', formatCoins(fine));
        }
        title = '🚔 Atraco fallido';
      }

      fields = [
        { name: 'Tu nuevo balance', value: formatCoins(thief.balance) }
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
