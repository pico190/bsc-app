const { SlashCommandBuilder } = require('discord.js');
const { load } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const CATEGORY_LABELS = {
  refresco: '🥤 Refrescos',
  cocktail: '🍸 Cócteles',
  helado: '🍦 Helados',
  supervivencia: '🛟 Supervivencia básica',
  gastronomia: '🍽️ Comida y bebida',
  entretenimiento: '🎰 Entretenimiento',
  merchandising: '👕 Merchandising y estilo',
  lujo: '🧖 Lujo y bienestar',
  exclusivo: '🏆 Experiencias exclusivas'
};

const CATEGORY_ORDER = ['refresco', 'cocktail', 'helado', 'supervivencia', 'gastronomia', 'entretenimiento', 'merchandising', 'lujo', 'exclusivo'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Muestra la tienda del BSC Bilel.'),

  async execute(interaction) {
    const data = load();
    const items = Object.values(data.items);

    const byCategory = {};
    for (const item of items) {
      const cat = item.category || 'otros';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    const fields = [];
    for (const cat of CATEGORY_ORDER) {
      const list = byCategory[cat];
      if (!list || list.length === 0) continue;

      const value = list.map(item => {
        const inStock = item.stock > 0;
        const stockText = inStock ? `${item.stock}/${item.maxStock}` : '**AGOTADO**';
        const sellText = item.sellable ? ` · ↻${formatCoins(item.sellPrice)}` : '';
        return `${item.emoji} **${item.name}** — ${formatCoins(item.price)}${sellText} · ${stockText}`;
      }).join('\n');

      fields.push({
        name: CATEGORY_LABELS[cat] || cat,
        value
      });
    }

    const payload = createEconomyContainer({
      title: '🛒 Duty Free del BSC Bilel',
      description: 'Bienvenido a bordo. Refrescos, cócteles, helados, merchandising y experiencias exclusivas. Los artículos con stock limitado se agotan rápido.',
      fields,
      footer: 'Usa /buy <item> [cantidad] para pedir, /item info <item> para detalles, /item sell <item> <cantidad> para reventar.'
    });

    await interaction.reply(payload);
  }
};
