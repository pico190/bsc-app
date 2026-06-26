const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const LIMITS = {
  refresco: 50,
  cocktail: 5,
  helado: 20,
  supervivencia: 10,
  gastronomia: 5,
  entretenimiento: 5,
  merchandising: 5,
  lujo: 3,
  exclusivo: 1
};

function getLimit(item) {
  return LIMITS[item.category] || 10;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Compra un artículo de la tienda del BSC Bilel.')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('ID del artículo que quieres comprar.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription('Cantidad a comprar.')
        .setRequired(false)
        .setMinValue(1)
    ),

  async autocomplete(interaction) {
    const data = load();
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = Object.values(data.items)
      .filter(item => {
        const searchable = `${item.id} ${item.name} ${item.category}`.toLowerCase();
        return searchable.includes(focused) && item.stock > 0;
      })
      .slice(0, 25)
      .map(item => ({
        name: `${item.menuEmoji || item.emoji} ${item.name} — ${item.price} BSC · Stock: ${item.stock}`,
        value: item.id
      }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const itemId = interaction.options.getString('item', true).toLowerCase();
    let quantity = interaction.options.getInteger('cantidad') || 1;

    const data = load();
    const item = data.items[itemId];

    if (!item) {
      save(data);
      return await interaction.reply(createEphemeralReply('❌ Ese artículo no está en la tienda. Usa `/shop` para ver el catálogo.'));
    }

    const limit = getLimit(item);
    if (quantity > limit) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ Límite de compra para esta categoría: máximo **${limit}** unidades por pedido. La tripulación no puede cargar más.`));
    }

    if (item.stock < quantity) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No hay suficiente stock de **${item.name}**. Disponible: ${item.stock} unidades.`));
    }

    const user = getUser(data, interaction.user.id);
    const totalPrice = item.price * quantity;

    if (user.balance < totalPrice) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficientes monedas. Necesitas ${formatCoins(totalPrice)} y tienes ${formatCoins(user.balance)}.`));
    }

    user.balance -= totalPrice;
    item.stock -= quantity;
    user.inventory[itemId] = (user.inventory[itemId] || 0) + quantity;
    save(data);

    const fields = [
      { name: 'Artículo', value: `${item.emoji} ${item.name}` },
      { name: 'Cantidad', value: `${quantity}` },
      { name: 'Total pagado', value: formatCoins(totalPrice) },
      { name: 'Stock restante', value: `${item.stock}/${item.maxStock}` },
      { name: 'Nuevo balance', value: formatCoins(user.balance) }
    ];

    if (item.sellable) {
      fields.push({ name: 'Reventa unitaria', value: formatCoins(item.sellPrice) });
    }

    const payload = createEconomyContainer({
      title: '🛒 Compra realizada',
      description: `Has comprado **${item.name}** x${quantity}.`,
      fields,
      footer: 'Usa /inventory para ver tu inventario o /item info para más detalles.'
    });

    await interaction.reply(payload);
  }
};
