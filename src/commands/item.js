const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Usa, vende o consulta información de tus artículos.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('use')
        .setDescription('Usa un item de tu inventario.')
        .addStringOption(option =>
          option.setName('item').setDescription('Item a usar.').setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option.setName('cantidad').setDescription('Cantidad a usar.').setRequired(false).setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sell')
        .setDescription('Vende items de tu inventario.')
        .addStringOption(option =>
          option.setName('item').setDescription('Item a vender.').setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option.setName('cantidad').setDescription('Cantidad a vender.').setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Muestra información de un item de la tienda.')
        .addStringOption(option =>
          option.setName('item').setDescription('Item a consultar.').setRequired(true).setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const data = load();
    const focused = interaction.options.getFocused().toLowerCase();
    const subcommand = interaction.options.getSubcommand();
    const user = getUser(data, interaction.user.id);

    let choices = [];

    if (subcommand === 'use') {
      choices = Object.entries(user.inventory)
        .filter(([itemId, quantity]) => {
          const item = data.items[itemId];
          return item && item.usable && quantity > 0 &&
            (`${item.id} ${item.name}`.toLowerCase().includes(focused));
        })
        .map(([itemId]) => {
          const item = data.items[itemId];
          return { name: `${item.emoji} ${item.name} — Tienes ${user.inventory[itemId]}`, value: item.id };
        });
    } else if (subcommand === 'sell') {
      choices = Object.entries(user.inventory)
        .filter(([itemId, quantity]) => {
          const item = data.items[itemId];
          return item && item.sellable && quantity > 0 &&
            (`${item.id} ${item.name}`.toLowerCase().includes(focused));
        })
        .map(([itemId]) => {
          const item = data.items[itemId];
          return { name: `${item.emoji} ${item.name} — ${formatCoins(item.sellPrice)} c/u · Tienes ${user.inventory[itemId]}`, value: item.id };
        });
    } else if (subcommand === 'info') {
      choices = Object.values(data.items)
        .filter(item => (`${item.id} ${item.name}`.toLowerCase().includes(focused)))
        .slice(0, 25)
        .map(item => ({ name: `${item.emoji} ${item.name}`, value: item.id }));
    }

    await interaction.respond(choices.slice(0, 25));
  },

  async execute(interaction) {
    const data = load();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'info') {
      const itemId = interaction.options.getString('item', true).toLowerCase();
      const item = data.items[itemId];

      if (!item) {
        save(data);
        return await interaction.reply(createEphemeralReply('❌ Ese artículo no existe.'));
      }

      const fields = [
        { name: 'Nombre', value: `${item.emoji} ${item.name}` },
        { name: 'Categoría', value: item.category || 'Otro' },
        { name: 'Descripción', value: item.description },
        { name: 'Precio', value: formatCoins(item.price) },
        { name: 'Stock', value: `${item.stock}/${item.maxStock}` }
      ];

      if (item.sellable) {
        fields.push(
          { name: 'Reventa', value: formatCoins(item.sellPrice) },
          { name: 'Pérdida por reventa', value: formatCoins(item.price - item.sellPrice) }
        );
      } else {
        fields.push({ name: 'Reventa', value: 'No se puede revender.' });
      }

      fields.push({ name: 'Usable', value: item.usable ? 'Sí' : 'No' });

      const payload = createEconomyContainer({
        title: 'ℹ️ Ficha del artículo',
        description: `Información detallada de **${item.name}**.`,
        fields,
        footer: item.stock === 0 ? 'Artículo agotado.' : 'Disponible en /shop.'
      });

      save(data);
      return await interaction.reply(payload);
    }

    const user = getUser(data, interaction.user.id);
    const itemId = interaction.options.getString('item', true).toLowerCase();
    const quantity = interaction.options.getInteger('cantidad') || 1;
    const item = data.items[itemId];

    if (!item) {
      save(data);
      return await interaction.reply(createEphemeralReply('❌ Ese artículo no existe.'));
    }

    const owned = user.inventory[itemId] || 0;

    if (owned < quantity) {
      save(data);
      return await interaction.reply(createEphemeralReply(`❌ No tienes suficientes unidades. Tienes **${owned}** de **${item.name}**.`));
    }

    if (subcommand === 'use') {
      if (!item.usable) {
        save(data);
        return await interaction.reply(createEphemeralReply(`❌ **${item.name}** no se puede usar.`));
      }

      user.inventory[itemId] -= quantity;
      if (user.inventory[itemId] <= 0) {
        delete user.inventory[itemId];
      }
      save(data);

      const payload = createEconomyContainer({
        title: '✨ Item usado',
        description: `Has usado **${item.name}** x${quantity}.\n\n${item.useMessage || 'No pasa nada especial, pero lo disfrutaste.'}`,
        fields: [
          { name: 'Restantes', value: `${user.inventory[itemId] || 0}` }
        ],
        footer: 'Los items usados desaparecen para siempre.'
      });

      return await interaction.reply(payload);
    }

    if (subcommand === 'sell') {
      if (!item.sellable) {
        save(data);
        return await interaction.reply(createEphemeralReply(`❌ **${item.name}** no se puede revender.`));
      }

      const total = item.sellPrice * quantity;
      user.inventory[itemId] -= quantity;
      if (user.inventory[itemId] <= 0) {
        delete user.inventory[itemId];
      }
      user.balance += total;
      item.stock += quantity;
      if (item.stock > item.maxStock) item.stock = item.maxStock;
      save(data);

      const payload = createEconomyContainer({
        title: '💰 Reventa completada',
        description: `Has vendido **${item.name}** x${quantity}.`,
        fields: [
          { name: 'Precio unitario', value: formatCoins(item.sellPrice) },
          { name: 'Total recibido', value: formatCoins(total) },
          { name: 'Nuevo balance', value: formatCoins(user.balance) },
          { name: 'Restantes', value: `${user.inventory[itemId] || 0}` }
        ],
        footer: 'La tienda recupera el stock que le devuelves.'
      });

      return await interaction.reply(payload);
    }
  }
};
