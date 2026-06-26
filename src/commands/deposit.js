const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposita monedas en el banco.')
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad a depositar.')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.balance < amount) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficiente dinero en mano. Tienes ${formatCoins(user.balance)}.`));
    }

    user.balance -= amount;
    user.bank += amount;
    save(data);

    const payload = createEconomyContainer({
      title: '🏦 Depósito',
      description: 'Has depositado dinero en tu cuenta bancaria.',
      fields: [
        { name: 'Depositado', value: formatCoins(amount) },
        { name: 'En mano', value: formatCoins(user.balance) },
        { name: 'En banco', value: formatCoins(user.bank) }
      ],
      footer: 'El dinero en el banco está a salvo.'
    });

    await interaction.reply(payload);
  }
};
