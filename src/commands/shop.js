const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
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

function buildPage(data, pageIndex) {
  const items = Object.values(data.items);
  const byCategory = {};

  for (const item of items) {
    const cat = item.category || 'otros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  const availableCategories = CATEGORY_ORDER.filter(cat => byCategory[cat] && byCategory[cat].length > 0);
  const category = availableCategories[pageIndex];
  const list = byCategory[category] || [];

  const fields = list.map(item => {
    const inStock = item.stock > 0;
    const stockText = inStock ? `Stock: ${item.stock}/${item.maxStock}` : '**AGOTADO**';
    const sellText = item.sellable ? ` · Reventa: ${formatCoins(item.sellPrice)}` : '';
    return {
      name: `${item.emoji} **${item.name}** \`(${item.id})\``,
      value: `${item.description}\nPrecio: ${formatCoins(item.price)}${sellText} · ${stockText}`
    };
  });

  const totalPages = availableCategories.length;

  return {
    title: '🛒 Duty Free del BSC Bilel',
    description: `Página **${pageIndex + 1}** de **${totalPages}** — ${CATEGORY_LABELS[category] || category}`,
    fields,
    footer: 'Usa /buy <item> [cantidad] para pedir, /item info <item> para detalles, /item sell <item> <cantidad> para reventar.',
    totalPages
  };
}

function buildButtons(pageIndex, totalPages, userId) {
  return [
    {
      customId: `shop_prev_${userId}`,
      label: '◀ Anterior',
      style: ButtonStyle.Secondary,
      disabled: pageIndex === 0
    },
    {
      customId: `shop_next_${userId}`,
      label: 'Siguiente ▶',
      style: ButtonStyle.Secondary,
      disabled: pageIndex === totalPages - 1
    }
  ];
}

function buildPayload(data, pageIndex, userId) {
  const page = buildPage(data, pageIndex);
  const buttons = buildButtons(pageIndex, page.totalPages, userId);
  return createEconomyContainer({
    title: page.title,
    description: page.description,
    fields: page.fields,
    footer: page.footer,
    buttons
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Muestra la tienda del BSC Bilel.'),

  async execute(interaction) {
    const data = load();
    const userId = interaction.user.id;
    let page = 0;

    const initialPage = buildPage(data, page);
    const totalPages = initialPage.totalPages;

    const message = await interaction.reply({
      ...buildPayload(data, page, userId),
      fetchReply: true
    });

    if (totalPages <= 1) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId &&
        (i.customId === `shop_prev_${userId}` || i.customId === `shop_next_${userId}`),
      time: 300000
    });

    collector.on('collect', async i => {
      if (i.customId === `shop_prev_${userId}`) page--;
      if (i.customId === `shop_next_${userId}`) page++;

      await i.update(buildPayload(data, page, userId));
    });

    collector.on('end', async () => {
      try {
        const currentPage = buildPage(data, page);
        const disabledButtons = buildButtons(page, currentPage.totalPages, userId).map(btn => ({ ...btn, disabled: true }));
        await interaction.editReply(createEconomyContainer({
          title: currentPage.title,
          description: currentPage.description,
          fields: currentPage.fields,
          footer: currentPage.footer,
          buttons: disabledButtons
        }));
      } catch (error) {
        // Ignorar
      }
    });
  }
};
