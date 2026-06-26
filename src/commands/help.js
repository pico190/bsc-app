const { SlashCommandBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEconomyContainer } = require('../utils/components');

const commands = [
  { name: '/balance [usuario]', description: 'Consulta tu balance o el de otro pasajero.' },
  { name: '/daily', description: 'Reclama tu recompensa diaria con racha.' },
  { name: '/work', description: 'Trabaja en el BSC Bilel para ganar monedas.' },
  { name: '/crime', description: 'Comete un crimen. A veces ganas, a veces acabas en el puerto.' },
  { name: '/rob @usuario', description: 'Intenta robar a otro pasajero.' },
  { name: '/pay @usuario cantidad', description: 'Transfiere monedas a otro usuario.' },
  { name: '/deposit cantidad', description: 'Guarda dinero en el banco.' },
  { name: '/withdraw cantidad', description: 'Saca dinero del banco.' },
  { name: '/shop', description: 'Muestra la tienda del BSC Bilel.' },
  { name: '/buy item [cantidad]', description: 'Compra artículos. Algunos tienen límite por compra.' },
  { name: '/inventory [usuario]', description: 'Muestra tu inventario organizado por categorías.' },
  { name: '/item use/sell/info', description: 'Usa, vende o consulta información de un item.' },
  { name: '/pass menu/subscribe/cancel/status', description: 'Gestiona tu BSC Pass.' },
  { name: '/pass drink <bebida>', description: 'Reclama bebidas incluidas en tu plan.' },
  { name: '/casino apuesta', description: 'Juega a la tragaperras del crucero.' },
  { name: '/leaderboard', description: 'Top 10 de pasajeros más ricos.' },
  { name: '/excursion', description: 'Participa en una excursión del crucero.' },
  { name: '/tip @usuario cantidad', description: 'Deja una propina a otro pasajero o tripulante.' },
  { name: '/bartender serve/restock/stock', description: 'Comandos exclusivos del personal de bar.' },
  { name: '/help', description: 'Muestra esta ayuda.' }
];

const ITEMS_PER_PAGE = 6;

function buildPage(page) {
  const start = page * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageCommands = commands.slice(start, end);
  const totalPages = Math.ceil(commands.length / ITEMS_PER_PAGE);

  const fields = pageCommands.map(cmd => ({
    name: cmd.name,
    value: cmd.description
  }));

  return {
    containerPayload: {
      title: '📖 Bienvenido al BSC Bilel',
      description: `Bot de economía tematizado en crucero. Página **${page + 1}** de **${totalPages}**.`,
      fields,
      footer: 'Usa cada comando para más detalles. ¡Disfruta del viaje!'
    },
    totalPages
  };
}

function buildButtonData(page, totalPages, userId) {
  return [
    {
      customId: `help_prev_${userId}`,
      label: '◀ Anterior',
      style: ButtonStyle.Secondary,
      disabled: page === 0
    },
    {
      customId: `help_next_${userId}`,
      label: 'Siguiente ▶',
      style: ButtonStyle.Secondary,
      disabled: page === totalPages - 1
    }
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la ayuda del bot del BSC Bilel.'),

  async execute(interaction) {
    let page = 0;
    const userId = interaction.user.id;
    const { containerPayload, totalPages } = buildPage(page);
    const buttons = buildButtonData(page, totalPages, userId);
    const payload = createEconomyContainer({ ...containerPayload, buttons });

    const message = await interaction.reply({
      ...payload,
      fetchReply: true
    });

    if (totalPages <= 1) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId &&
        (i.customId === `help_prev_${userId}` || i.customId === `help_next_${userId}`),
      time: 300000 // 5 minutos
    });

    collector.on('collect', async i => {
      if (i.customId === `help_prev_${userId}`) page--;
      if (i.customId === `help_next_${userId}`) page++;

      const { containerPayload: newPayload, totalPages: newTotal } = buildPage(page);
      const newButtons = buildButtonData(page, newTotal, userId);

      await i.update(createEconomyContainer({ ...newPayload, buttons: newButtons }));
    });

    collector.on('end', async () => {
      try {
        const disabledButtons = buildButtonData(page, totalPages, userId)
          .map(btn => ({ ...btn, disabled: true }));

        await interaction.editReply(createEconomyContainer({
          ...buildPage(page).containerPayload,
          buttons: disabledButtons
        }));
      } catch (error) {
        // Ignorar errores si el mensaje ya no existe
      }
    });
  }
};
