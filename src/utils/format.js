function formatCoins(amount) {
  return `**<:BSCOIN:1520037262945947679> ${amount.toLocaleString('es-ES')}**`;
}

function formatDate(date) {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleString('es-ES');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { formatCoins, formatDate, randomInt, sleep };
