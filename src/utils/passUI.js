const { ButtonStyle } = require('discord.js');
const { createEconomyContainer } = require('./components');
const { getPlan } = require('./passManager');

function buildPlanField(planId, userPlanId) {
  const plan = getPlan(planId);
  const formatCoins = require('./format').formatCoins;
  const isCurrent = userPlanId === planId;
  const priceText = plan.weeklyPrice === 0 ? 'Gratis' : `${formatCoins(plan.weeklyPrice)}/semana`;

  let value = `${plan.emoji} **${plan.name}** — ${priceText}\n_${plan.description}_\n\n`;

  for (const benefit of plan.benefits) {
    value += `✓ ${benefit}\n`;
  }
  for (const excluded of plan.excludedBenefits) {
    value += `✗ ${excluded}\n`;
  }

  if (isCurrent) {
    value += '\n🟢 **Tu plan actual**';
  }

  return { name: `${plan.emoji} ${plan.name}`, value };
}

function buildMenuPayload(user) {
  const fields = [
    buildPlanField('basic', user.passPlan),
    buildPlanField('comfort', user.passPlan),
    buildPlanField('premium', user.passPlan)
  ];

  const buttons = [
    { customId: 'pass_subscribe_basic', label: 'Subir a bordo', style: ButtonStyle.Secondary, disabled: user.passPlan === 'basic' },
    { customId: 'pass_subscribe_comfort', label: 'Elegir Comfort', style: ButtonStyle.Primary, disabled: user.passPlan === 'comfort' },
    { customId: 'pass_subscribe_premium', label: 'Elegir Premium', style: ButtonStyle.Success, disabled: user.passPlan === 'premium' }
  ];

  return createEconomyContainer({
    title: '🎫 BSC Pass',
    description: 'Elige tu experiencia a bordo del crucero Bilel. Los planes superiores incluyen bebidas y comidas ilimitadas.',
    fields,
    buttons,
    footer: 'Usa /pass status para ver tu suscripción actual.'
  });
}

module.exports = { buildMenuPayload, buildPlanField };
