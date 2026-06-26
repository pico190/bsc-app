const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Deja una propina a otro pasajero o tripulante.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('A quién quieres dar la propina.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad de la propina.')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad', true);

    if (target.id === interaction.user.id) {
      return await interaction.reply({
        content: '❌ No puedes darte una propina a ti mismo, avaro.',
        ephemeral: true
      });
    }

    if (target.bot) {
      return await interaction.reply({
        content: '❌ Los bots no aceptan propinas.',
        ephemeral: true
      });
    }

    const data = load();
    const tipper = getUser(data, interaction.user.id);

    if (tipper.balance < amount) {
      save(data);
      return await interaction.reply({
        content: `❌ No tienes suficiente dinero. Tienes ${formatCoins(tipper.balance)}.`,
        ephemeral: true
      });
    }

    const receiver = getUser(data, target.id);
    tipper.balance -= amount;
    receiver.balance += amount;
    save(data);

    const payload = createEconomyContainer({
      title: '💁 Propina entregada',
      description: `Has dejado una propina generosa a <@${target.id}>. El servicio fue impecable.`,
      fields: [
        { name: 'Destinatario', value: `<@${target.id}>` },
        { name: 'Propina', value: formatCoins(amount) },
        { name: 'Tu nuevo balance', value: formatCoins(tipper.balance) }
      ],
      footer: 'Las propinas no se devuelven, ni siquiera si el camarero te ignoró después.'
    });

    await interaction.reply(payload);
  }
};
