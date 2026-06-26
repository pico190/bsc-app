const shop = require('./shop');

module.exports = {
  data: shop.data.setName('store').setDescription('Alias de /shop. Muestra la tienda del BSC Bilel.'),
  execute: shop.execute
};
