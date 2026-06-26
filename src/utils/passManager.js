const { load, save, getUser } = require('./database');
const { formatCoins } = require('./format');

const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    emoji: '🎫',
    price: 0,
    weeklyPrice: 0,
    roleId: '1520090124401115186',
    description: 'Solo viaje. Acceso básico al servidor.',
    benefits: [
      'Acceso al servidor',
      'Rol de Pasajero de Turista'
    ],
    excludedBenefits: [
      'Bebidas no incluidas',
      'Comidas no incluidas',
      'Eventos VIP ni zonas exclusivas'
    ]
  },
  comfort: {
    id: 'comfort',
    name: 'Comfort',
    emoji: '🍽️',
    price: 350,
    weeklyPrice: 350,
    roleId: '1520090147604136007',
    description: 'Todo incluido básico. Refrescos, comida y cubierta VIP.',
    benefits: [
      'Todo lo del Basic',
      'Rol de Pasajero de Primera Clase',
      'Aquarius, Nestea, refrescos y zumos ilimitados',
      'Buffet libre, menú del día y bocadillos',
      'Acceso a Cubierta VIP'
    ],
    drinkCategories: ['refresco'],
    dailyDrinkLimit: 25,
    excludedBenefits: []
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    emoji: '🍸',
    price: 1000,
    weeklyPrice: 1000,
    roleId: '1520090177463128195',
    description: 'Todo incluido deluxe. Cócteles, eventos privados y zona exclusiva.',
    benefits: [
      'Todo lo del Comfort',
      'Rol exclusivo de Huésped de Lujo',
      'Cócteles, helados y cafés especiales ilimitados',
      'Comida elaborada y cenas de gala',
      'Eventos privados, sorteos y zona exclusiva'
    ],
    drinkCategories: ['refresco', 'cocktail', 'helado'],
    dailyDrinkLimit: 50,
    excludedBenefits: []
  }
};

const DRINK_COOLDOWN_MS = 60 * 1000; // 1 minuto entre bebidas gratis
const SUBSCRIPTION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 semana
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // revisar cada hora

function getPlan(planId) {
  return PLANS[planId] || PLANS.basic;
}

function isPassActive(user) {
  if (user.passPlan === 'basic') return true;
  return user.passExpiresAt && Date.now() < user.passExpiresAt;
}

function resetDailyDrinksIfNeeded(user) {
  const now = new Date();
  const lastReset = user.passLastDrinkReset ? new Date(user.passLastDrinkReset) : null;

  if (!lastReset || lastReset.getDate() !== now.getDate() || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    user.passIncludedDrinks = {};
    user.passLastDrinkReset = now.toISOString();
  }
}

function canClaimFreeDrink(user, item) {
  if (user.passPlan === 'basic') return { allowed: false, reason: 'Tu plan Basic no incluye bebidas.' };
  if (!isPassActive(user)) return { allowed: false, reason: 'Tu BSC Pass ha expirado. Renuévalo con `/pass`.' };

  const plan = getPlan(user.passPlan);
  if (!plan.drinkCategories.includes(item.category)) {
    return { allowed: false, reason: `Tu plan **${plan.name}** no incluye esta categoría de bebida.` };
  }

  resetDailyDrinksIfNeeded(user);

  const todayCount = user.passIncludedDrinks[item.id] || 0;
  if (todayCount >= plan.dailyDrinkLimit) {
    return { allowed: false, reason: `Has alcanzado el límite diario de bebidas incluidas (${plan.dailyDrinkLimit}).` };
  }

  const now = Date.now();
  if (user.passLastFreeDrinkAt && now - user.passLastFreeDrinkAt < DRINK_COOLDOWN_MS) {
    const remaining = Math.ceil((DRINK_COOLDOWN_MS - (now - user.passLastFreeDrinkAt)) / 1000);
    return { allowed: false, reason: `Espera ${remaining}s entre bebidas gratis.` };
  }

  return { allowed: true };
}

function claimFreeDrink(user, item) {
  user.passIncludedDrinks[item.id] = (user.passIncludedDrinks[item.id] || 0) + 1;
  user.passLastFreeDrinkAt = Date.now();
  user.inventory[item.id] = (user.inventory[item.id] || 0) + 1;
}

async function assignRoles(member, planId) {
  if (!member || !member.roles) return;

  const plan = getPlan(planId);
  const roleIds = Object.values(PLANS)
    .map(p => p.roleId)
    .filter(id => id);

  try {
    for (const id of roleIds) {
      if (id === plan.roleId) {
        await member.roles.add(id);
      } else {
        if (member.roles.cache.has(id)) {
          await member.roles.remove(id);
        }
      }
    }
  } catch (error) {
    console.error('Error al asignar roles de BSC Pass:', error);
  }
}

function chargeSubscription(userId) {
  const data = load();
  const user = getUser(data, userId);
  const plan = getPlan(user.passPlan);

  if (plan.id === 'basic') return { changed: false };
  if (!isPassActive(user)) return { changed: false };

  const now = Date.now();

  // Solo cobrar si ha pasado una semana desde el último cobro o expiración
  const lastCharge = user.passLastChargeAt || user.passExpiresAt - SUBSCRIPTION_DURATION_MS;
  if (now - lastCharge < SUBSCRIPTION_DURATION_MS) return { changed: false };

  if (user.balance >= plan.weeklyPrice) {
    user.balance -= plan.weeklyPrice;
    user.passLastChargeAt = now;
    user.passExpiresAt = now + SUBSCRIPTION_DURATION_MS;
    save(data);
    return {
      changed: true,
      renewed: true,
      downgraded: false,
      plan: plan.id,
      price: plan.weeklyPrice
    };
  } else {
    // No puede pagar: bajar a Basic
    user.passPlan = 'basic';
    user.passExpiresAt = null;
    user.passAutoRenew = false;
    user.passLastChargeAt = null;
    save(data);
    return {
      changed: true,
      renewed: false,
      downgraded: true,
      oldPlan: plan.id
    };
  }
}

function subscribe(userId, planId) {
  const data = load();
  const user = getUser(data, userId);
  const plan = getPlan(planId);

  if (plan.id === 'basic') {
    user.passPlan = 'basic';
    user.passExpiresAt = null;
    user.passAutoRenew = false;
    save(data);
    return { success: true, plan: 'basic' };
  }

  if (user.balance < plan.price) {
    save(data);
    return {
      success: false,
      reason: `Necesitas ${formatCoins(plan.price)} para suscribirte a ${plan.name}. Tienes ${formatCoins(user.balance)}.`
    };
  }

  user.balance -= plan.price;
  user.passPlan = plan.id;
  user.passExpiresAt = Date.now() + SUBSCRIPTION_DURATION_MS;
  user.passLastChargeAt = Date.now();
  user.passAutoRenew = true;
  user.passIncludedDrinks = {};
  save(data);

  return { success: true, plan: plan.id, price: plan.price };
}

function cancelSubscription(userId) {
  const data = load();
  const user = getUser(data, userId);

  if (user.passPlan === 'basic') {
    save(data);
    return { cancelled: false, reason: 'No tienes una suscripción activa.' };
  }

  user.passAutoRenew = false;
  save(data);

  return {
    cancelled: true,
    plan: user.passPlan,
    expiresAt: user.passExpiresAt
  };
}

function startPassScheduler(client) {
  const check = () => {
    const data = load();
    const now = Date.now();

    for (const [userId, user] of Object.entries(data.users)) {
      if (user.passPlan === 'basic') continue;
      if (!user.passExpiresAt || now < user.passExpiresAt) continue;
      if (!user.passAutoRenew) continue;

      const result = chargeSubscription(userId);
      if (result.changed) {
        console.log(`[BSC Pass] ${userId}: ${result.renewed ? 'renovado' : 'bajado a Basic'}`);
      }
    }
  };

  check();
  return setInterval(check, CHECK_INTERVAL_MS);
}

module.exports = {
  PLANS,
  getPlan,
  isPassActive,
  canClaimFreeDrink,
  claimFreeDrink,
  assignRoles,
  subscribe,
  cancelSubscription,
  chargeSubscription,
  startPassScheduler,
  SUBSCRIPTION_DURATION_MS
};
