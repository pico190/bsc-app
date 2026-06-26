const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');

const BARTENDER_ROLE_ID = '1515466137414930506';

function isBartender(member) {
  return member.roles.cache.has(BARTENDER_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bartender')
    .setDescription('Comandos exclusivos del personal de bar del BSC Bilel.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('serve')
        .setDescription('Sirve una bebida gratis a un pasajero.')
        .addUserOption(option =>
          option.setName('usuario').setDescription('Pasajero al que servir.').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('bebida').setDescription('Bebida a servir.').setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option.setName('cantidad').setDescription('Cantidad a servir.').setRequired(false).setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('restock')
        .setDescription('Reponer stock de una bebida.')
        .addStringOption(option =>
          option.setName('bebida').setDescription('Bebida a reponer.').setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option.setName('cantidad').setDescription('Cantidad a añadir.').setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stock')
        .setDescription('Consulta el stock actual del bar.')
    ),

  async autocomplete(interaction) {
    const data = load();
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = Object.values(data.items)
      .filter(item => {
        const searchable = `${item.id} ${item.name}`.toLowerCase();
        return searchable.includes(focused);
      })
      .slice(0, 25)
      .map(item => ({
        name: `${item.menuEmoji || item.emoji} ${item.name} — Stock: ${item.stock}/${item.maxStock}`,
        value: item.id
      }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    if (!isBartender(interaction.member)) {
      return await interaction.reply(createEphemeralReply('❌ Solo el personal de bar puede usar este comando.'));
    }

    const data = load();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'stock') {
      const items = Object.values(data.items);
      const refrescos = items.filter(i => i.category === 'refresco');
      const cocktails = items.filter(i => i.category === 'cocktail');

      const formatList = list => list.map(item => `${item.emoji} **${item.name}**: ${item.stock}/${item.maxStock}`).join('\n');

      save(data);
      const payload = createEconomyContainer({
        title: '📦 Stock del bar',
        description: 'Inventario actual de bebidas del BSC Bilel.',
        fields: [
          { name: '🥤 Refrescos', value: formatList(refrescos) },
          { name: '🍸 Cócteles', value: formatList(cocktails) }
        ],
        footer: 'Usa /bartender restock para reponer lo que falte.'
      });
      return await interaction.reply(payload);
    }

    if (subcommand === 'restock') {
      const itemId = interaction.options.getString('bebida', true).toLowerCase();
      const quantity = interaction.options.getInteger('cantidad', true);
      const item = data.items[itemId];

      if (!item) {
        save(data);
        return await interaction.reply(createEphemeralReply('❌ Esa bebida no existe en la carta.'));
      }

      const previousStock = item.stock;
      item.stock = Math.min(item.stock + quantity, item.maxStock);
      const added = item.stock - previousStock;
      save(data);

      const payload = createEconomyContainer({
        title: '📦 Reposición completada',
        description: `Has reabastecido el almacén del BSC Bilel.`,
        fields: [
          { name: 'Bebida', value: `${item.emoji} ${item.name}` },
          { name: 'Añadido', value: `${added} unidades` },
          { name: 'Stock anterior', value: `${previousStock}/${item.maxStock}` },
          { name: 'Stock actual', value: `${item.stock}/${item.maxStock}` }
        ],
        footer: added < quantity ? 'No se pudo añadir todo porque se alcanzó el stock máximo.' : 'Bar listo para servir.'
      });
      return await interaction.reply(payload);
    }

    if (subcommand === 'serve') {
      const target = interaction.options.getUser('usuario', true);
      const itemId = interaction.options.getString('bebida', true).toLowerCase();
      const quantity = interaction.options.getInteger('cantidad') || 1;
      const item = data.items[itemId];

      if (target.bot) {
        save(data);
        return await interaction.reply(createEphemeralReply('❌ Los bots no beben. Aún.'));
      }

      if (!item) {
        save(data);
        return await interaction.reply(createEphemeralReply('❌ Esa bebida no existe en la carta.'));
      }

      if (item.stock < quantity) {
        save(data);
        return await interaction.reply(createEphemeralReply(`❌ No hay suficiente stock de **${item.name}**. Disponible: ${item.stock}.`));
      }

      const user = getUser(data, target.id);
      item.stock -= quantity;
      user.inventory[itemId] = (user.inventory[itemId] || 0) + quantity;
      save(data);

      const payload = createEconomyContainer({
        title: '🍹 Servicio de bar',
        description: `El bartender ha servido una ronda gratis a <@${target.id}>.`,
        fields: [
          { name: 'Bebida', value: `${item.emoji} ${item.name}` },
          { name: 'Cantidad', value: `${quantity}` },
          { name: 'Stock restante', value: `${item.stock}/${item.maxStock}` }
        ],
        footer: 'Cortesía de la casa del BSC Bilel.'
      });
      return await interaction.reply(payload);
    }
  }
};
