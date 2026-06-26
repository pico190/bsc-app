const { SlashCommandBuilder } = require('discord.js');
const { load } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer } = require('../utils/components');

const CATEGORY_LABELS = {
  refresco: '🥤 Refrescos',
  cocktail: '🍸 Cócteles',
  supervivencia: '🛟 Supervivencia básica',
  gastronomia: '🍽️ Comida y bebida',
  entretenimiento: '🎰 Entretenimiento',
  merchandising: '👕 Merchandising y estilo',
  lujo: '🧖 Lujo y bienestar',
  exclusivo: '🏆 Experiencias exclusivas'
};

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

    const categoryOrder = ['refresco', 'cocktail', 'supervivencia', 'gastronomia', 'entretenimiento', 'merchandising', 'lujo', 'exclusivo'];

    const fields = [];
    for (const cat of categoryOrder) {
      const list = byCategory[cat];
      if (!list || list.length === 0) continue;

      const value = list.map(item => {
        const inStock = item.stock > 0;
        const stockText = inStock ? `Stock: ${item.stock}/${item.maxStock}` : '**AGOTADO**';
        const sellText = item.sellable ? ` · Reventa: ${formatCoins(item.sellPrice)}` : '';
        return `${item.emoji} **${item.name}** \`(${item.id})\`\n${item.description}\nPrecio: ${formatCoins(item.price)}${sellText} · ${stockText}`;
      }).join('\n\n');

      fields.push({
        name: CATEGORY_LABELS[cat] || cat,
        value
      });
    }

    const payload = createEconomyContainer({
      title: '🛒 Duty Free del BSC Bilel',
      description: 'Bienvenido a bordo. Refrescos, cócteles, merchandising y experiencias exclusivas. Los artículos con stock limitado se agotan rápido.',
      fields,
      footer: 'Usa /buy <item> [cantidad] para comprar, /item info <item> para detalles, /item sell <item> <cantidad> para reventar.'
    });

    await interaction.reply(payload);
  }
};
