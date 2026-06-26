const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Muestra tu balance o el de otro usuario.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario del que quieres ver el balance.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const data = load();
    const user = getUser(data, target.id);
    save(data);

    const isSelf = target.id === interaction.user.id;

    const payload = createEconomyContainer({
      title: '💰 Balance económico',
      description: isSelf
        ? `Este es tu resumen financiero, ${interaction.user.username}.`
        : `Resumen financiero de ${target.username}.`,
      fields: [
        { name: 'Usuario', value: `<@${target.id}>` },
        { name: 'Dinero en mano', value: formatCoins(user.balance) },
        { name: 'Banco', value: formatCoins(user.bank) },
        { name: 'Total', value: formatCoins(user.balance + user.bank) }
      ],
      footer: 'Usa /daily para reclamar tu recompensa diaria.'
    });

    await interaction.reply(payload);
  }
};
