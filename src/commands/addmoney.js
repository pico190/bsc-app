const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const OWNER_ID = '1320040160443764777';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('[OWNER] Añade monedas a un usuario.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario al que quieres añadir monedas.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad de monedas a añadir.')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return await interaction.reply(createEphemeralReply('❌ No tienes permiso para usar este comando.'));
    }

    const target = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad', true);

    if (target.bot) {
      return await interaction.reply(createEphemeralReply('❌ No puedes añadir monedas a un bot.'));
    }

    const data = load();
    const user = getUser(data, target.id);
    user.balance += amount;
    save(data);

    const payload = createEconomyContainer({
      title: '💰 Monedas añadidas',
      description: `Se han añadido monedas a ${target.username}.`,
      fields: [
        { name: 'Usuario', value: `<@${target.id}>` },
        { name: 'Cantidad añadida', value: formatCoins(amount) },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ],
      footer: 'Comando exclusivo del propietario.'
    });

    await interaction.reply(payload);
  }
};
