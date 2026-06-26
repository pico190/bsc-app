const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { createEconomyContainer } = require('../utils/components');

const CATEGORY_ORDER = ['refresco', 'cocktail', 'supervivencia', 'gastronomia', 'entretenimiento', 'merchandising', 'lujo', 'exclusivo'];
const CATEGORY_LABELS = {
  refresco: '🥤 Refrescos',
  cocktail: '🍸 Cócteles',
  supervivencia: '🛟 Supervivencia',
  gastronomia: '🍽️ Gastronomía',
  entretenimiento: '🎰 Entretenimiento',
  merchandising: '👕 Merchandising',
  lujo: '🧖 Lujo',
  exclusivo: '🏆 Exclusivo'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Muestra tu inventario o el de otro usuario.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario del que quieres ver el inventario.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const data = load();
    const user = getUser(data, target.id);
    save(data);

    const inventoryEntries = Object.entries(user.inventory).filter(([, quantity]) => quantity > 0);
    const isSelf = target.id === interaction.user.id;

    let fields;
    if (inventoryEntries.length === 0) {
      fields = [
        { name: 'Inventario vacío', value: isSelf ? 'Ve a `/shop` para comprar algo.' : 'Este usuario no tiene artículos.' }
      ];
    } else {
      const byCategory = {};
      for (const [itemId, quantity] of inventoryEntries) {
        const item = data.items[itemId];
        const cat = item?.category || 'otros';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({ item, quantity, itemId });
      }

      fields = [];
      for (const cat of CATEGORY_ORDER) {
        const list = byCategory[cat];
        if (!list || list.length === 0) continue;

        const value = list.map(({ item, quantity }) => {
          const name = item ? `${item.emoji} ${item.name}` : `❓ ${itemId}`;
          return `${name} — x${quantity}`;
        }).join('\n');

        fields.push({
          name: CATEGORY_LABELS[cat] || cat,
          value
        });
      }
    }

    const payload = createEconomyContainer({
      title: '🎒 Inventario',
      description: isSelf
        ? 'Estos son tus artículos actuales.'
        : `Artículos de ${target.username}.`,
      fields,
      footer: 'Usa /item use para consumir o /item sell para reventar.'
    });

    await interaction.reply(payload);
  }
};
