const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas
const BASE_REWARD = 250;
const STREAK_BONUS = 50;
const MAX_STREAK = 7;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Reclama tu recompensa diaria de monedas.'),

  async execute(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const now = Date.now();

    let description;
    let fields = [];

    if (user.lastDaily && now - user.lastDaily < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastDaily);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      description = '⏳ Ya has reclamado tu recompensa diaria. Vuelve más tarde.';
      fields = [
        { name: 'Tiempo restante', value: `${hours}h ${minutes}m` }
      ];
    } else {
      const isStreak = user.lastDaily && (now - user.lastDaily) < (COOLDOWN_MS * 2);
      if (isStreak) {
        user.dailyStreak = Math.min(user.dailyStreak + 1, MAX_STREAK);
      } else {
        user.dailyStreak = 1;
      }

      const streakBonus = (user.dailyStreak - 1) * STREAK_BONUS;
      const totalReward = BASE_REWARD + streakBonus;

      user.balance += totalReward;
      user.lastDaily = now;

      description = `🎉 Has reclamado tu recompensa diaria, ${interaction.user.username}.`;
      fields = [
        { name: 'Recompensa base', value: formatCoins(BASE_REWARD) },
        { name: 'Bono por racha', value: formatCoins(streakBonus) },
        { name: 'Racha actual', value: `${user.dailyStreak} día(s)` },
        { name: 'Total obtenido', value: formatCoins(totalReward) },
        { name: 'Nuevo balance', value: formatCoins(user.balance) }
      ];
    }

    save(data);

    const payload = createEconomyContainer({
      title: '📅 Recompensa diaria',
      description,
      fields,
      footer: 'Reclama cada 24h para mantener tu racha.'
    });

    await interaction.reply(payload);
  }
};
