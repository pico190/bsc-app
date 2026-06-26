const { SlashCommandBuilder } = require('discord.js');
const { load, save, getUser } = require('../utils/database');
const { formatCoins } = require('../utils/format');
const { createEconomyContainer, createEphemeralReply } = require('../utils/components');
const {
  PLANS,
  getPlan,
  isPassActive,
  canClaimFreeDrink,
  claimFreeDrink,
  assignRoles,
  subscribe,
  cancelSubscription,
  SUBSCRIPTION_DURATION_MS
} = require('../utils/passManager');
const { buildMenuPayload } = require('../utils/passUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pass')
    .setDescription('Gestiona tu BSC Pass y disfruta de beneficios a bordo.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('menu')
        .setDescription('Muestra el menú de planes BSC Pass.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('subscribe')
        .setDescription('Suscríbete a un plan BSC Pass.')
        .addStringOption(option =>
          option
            .setName('plan')
            .setDescription('Plan al que quieres suscribirte.')
            .setRequired(true)
            .addChoices(
              { name: '🎫 Basic (Gratis)', value: 'basic' },
              { name: '🍽️ Comfort (350/semana)', value: 'comfort' },
              { name: '🍸 Premium (1000/semana)', value: 'premium' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancela la renovación automática de tu BSC Pass.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Consulta el estado de tu BSC Pass actual.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('drink')
        .setDescription('Reclama una bebida incluida en tu BSC Pass.')
        .addStringOption(option =>
          option
            .setName('bebida')
            .setDescription('Bebida que quieres reclamar.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('cantidad')
            .setDescription('Cantidad a reclamar.')
            .setRequired(false)
            .setMinValue(1)
        )
    ),

  async autocomplete(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const plan = getPlan(user.passPlan);
    const focused = interaction.options.getFocused().toLowerCase();

    const choices = Object.values(data.items)
      .filter(item => {
        if (!plan.drinkCategories || !plan.drinkCategories.includes(item.category)) return false;
        const searchable = `${item.id} ${item.name}`.toLowerCase();
        return searchable.includes(focused) && item.stock > 0;
      })
      .slice(0, 25)
      .map(item => {
        const used = user.passIncludedDrinks[item.id] || 0;
        const limit = plan.dailyDrinkLimit || 0;
        return {
          name: `${item.emoji} ${item.name} — ${used}/${limit} hoy`,
          value: item.id
        };
      });

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const data = load();
    const user = getUser(data, interaction.user.id);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'menu') {
      save(data);
      return await interaction.reply(buildMenuPayload(user));
    }

    if (subcommand === 'status') {
      const plan = getPlan(user.passPlan);
      const isActive = isPassActive(user);

      const fields = [
        { name: 'Plan actual', value: `${plan.emoji} **${plan.name}**` },
        { name: 'Estado', value: isActive ? '🟢 Activo' : '🔴 Expirado' }
      ];

      if (user.passPlan !== 'basic') {
        const expires = user.passExpiresAt ? `<t:${Math.floor(user.passExpiresAt / 1000)}:R>` : 'Nunca';
        fields.push(
          { name: 'Expira', value: expires },
          { name: 'Renovación automática', value: user.passAutoRenew ? 'Sí' : 'No' },
          { name: 'Precio semanal', value: formatCoins(plan.weeklyPrice) }
        );
      }

      save(data);
      const payload = createEconomyContainer({
        title: '🎫 Tu BSC Pass',
        description: `Aquí está el estado de tu experiencia a bordo.`,
        fields,
        footer: user.passPlan !== 'basic' && !user.passAutoRenew ? 'Tu suscripción no se renovará automáticamente.' : 'Usa /pass menu para cambiar de plan.'
      });
      return await interaction.reply(payload);
    }

    if (subcommand === 'cancel') {
      const result = cancelSubscription(interaction.user.id);
      save(data);

      if (!result.cancelled) {
        return await interaction.reply(createEphemeralReply(result.reason));
      }

      const payload = createEconomyContainer({
        title: '🎫 Renovación cancelada',
        description: `Has cancelado la renovación automática de tu plan **${getPlan(result.plan).name}**.`,
        fields: [
          { name: 'Plan activo hasta', value: `<t:${Math.floor(result.expiresAt / 1000)}:f>` }
        ],
        footer: 'Seguirás disfrutando los beneficios hasta que expire.'
      });
      return await interaction.reply(payload);
    }

    if (subcommand === 'subscribe') {
      const planId = interaction.options.getString('plan', true);
      const currentPlan = user.passPlan;

      if (currentPlan === planId && isPassActive(user)) {
        save(data);
        return await interaction.reply(createEphemeralReply(`Ya tienes el plan **${getPlan(planId).name}** activo.`));
      }

      const result = subscribe(interaction.user.id, planId);
      save(data);

      if (!result.success) {
        return await interaction.reply(createEphemeralReply(result.reason));
      }

      const plan = getPlan(planId);

      await assignRoles(interaction.member, planId);

      const fields = [
        { name: 'Plan', value: `${plan.emoji} **${plan.name}**` },
        { name: 'Expira', value: `<t:${Math.floor(user.passExpiresAt / 1000)}:R>` }
      ];

      if (result.price > 0) {
        fields.push({ name: 'Pagado', value: formatCoins(result.price) });
        fields.push({ name: 'Nuevo balance', value: formatCoins(user.balance) });
      }

      const payload = createEconomyContainer({
        title: '🎫 BSC Pass activado',
        description: `¡Bienvenido a bordo! Has activado el plan **${plan.name}**.`,
        fields,
        footer: 'Se cobrará automáticamente cada semana si tienes saldo suficiente.'
      });
      return await interaction.reply(payload);
    }

    if (subcommand === 'drink') {
      const itemId = interaction.options.getString('bebida', true).toLowerCase();
      let quantity = interaction.options.getInteger('cantidad') || 1;
      const item = data.items[itemId];

      if (!item) {
        save(data);
        return await interaction.reply(createEphemeralReply('❌ Esa bebida no existe.'));
      }

      const plan = getPlan(user.passPlan);

      for (let i = 0; i < quantity; i++) {
        const check = canClaimFreeDrink(user, item);
        if (!check.allowed) {
          save(data);
          return await interaction.reply(createEphemeralReply(check.reason));
        }
      }

      for (let i = 0; i < quantity; i++) {
        claimFreeDrink(user, item);
      }

      save(data);

      const todayCount = user.passIncludedDrinks[item.id] || 0;
      const payload = createEconomyContainer({
        title: '🍹 Bebida incluida servida',
        description: `Has reclamado **${item.name}** x${quantity} con tu BSC Pass **${plan.name}**.`,
        fields: [
          { name: 'Bebida', value: `${item.emoji} ${item.name}` },
          { name: 'Hoy reclamadas', value: `${todayCount}/${plan.dailyDrinkLimit}` },
          { name: 'Total en inventario', value: `${user.inventory[item.id] || 0}` }
        ],
        footer: 'Las bebidas incluidas tienen un pequeño cooldown entre sí.'
      });
      return await interaction.reply(payload);
    }
  }
};
