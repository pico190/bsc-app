const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Retira monedas del banco.')
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad a retirar.')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const data = load();
    const user = getUser(data, interaction.user.id);

    if (user.bank < amount) {
      save(data);
      return await interaction.reply({
        content: `❌ No tienes suficiente dinero en el banco. Tienes ${formatCoins(user.bank)}.`,
        ephemeral: true
      });
    }

    user.bank -= amount;
    user.balance += amount;
    save(data);

    const payload = createEconomyContainer({
      title: '🏧 Retiro',
      description: 'Has retirado dinero de tu cuenta bancaria.',
      fields: [
        { name: 'Retirado', value: formatCoins(amount) },
        { name: 'En mano', value: formatCoins(user.balance) },
        { name: 'En banco', value: formatCoins(user.bank) }
      ],
      footer: 'Gasta sabiamente.'
    });

    await interaction.reply(payload);
  }
};
