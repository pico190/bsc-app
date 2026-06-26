const { SlashCommandBuilder } = require('discord.js');
const { load } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el top de usuarios más ricos.'),

  async execute(interaction) {
    const data = load();

    const topUsers = Object.entries(data.users)
      .map(([userId, user]) => ({
        userId,
        total: user.balance + user.bank
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    let description;
    let fields;

    if (topUsers.length === 0) {
      description = 'Aún no hay usuarios registrados en la economía.';
      fields = [];
    } else {
      description = 'Estos son los usuarios con más riqueza acumulada.';
      fields = topUsers.map((entry, index) => ({
        name: `${index + 1}. <@${entry.userId}>`,
        value: `**Total:** ${formatCoins(entry.total)}`
      }));
    }

    const payload = createEconomyContainer({
      title: '🏆 Tabla de clasificación',
      description,
      fields,
      footer: 'Se calcula sumando dinero en mano y banco.'
    });

    await interaction.reply(payload);
  }
};
