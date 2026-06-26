const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfiere monedas a otro usuario.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario al que quieres pagar.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad de monedas a transferir.')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario', true);
    const amount = interaction.options.getInteger('cantidad', true);

    if (target.id === interaction.user.id) {
      return await interaction.reply(createEphemeralReply('❌ No puedes pagarte a ti mismo.'));
    }

    if (target.bot) {
      return await interaction.reply(createEphemeralReply('❌ No puedes pagarle a un bot.'));
    }

    const data = load();
    const sender = getUser(data, interaction.user.id);

    if (sender.balance < amount) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficientes monedas. Tu balance es ${formatCoins(sender.balance)}.`));
    }

    const receiver = getUser(data, target.id);
    sender.balance -= amount;
    receiver.balance += amount;
    save(data);

    const payload = createEconomyContainer({
      title: '💸 Transferencia realizada',
      description: `Has enviado dinero a ${target.username}.`,
      fields: [
        { name: 'Destinatario', value: `<@${target.id}>` },
        { name: 'Cantidad', value: formatCoins(amount) },
        { name: 'Tu nuevo balance', value: formatCoins(sender.balance) }
      ],
      footer: 'Las transacciones son instantáneas e irreversibles.'
    });

    await interaction.reply(payload);
  }
};
