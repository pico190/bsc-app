const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.json');

const defaultData = {
  users: {},
  items: {
    'sprite': {
      id: 'sprite',
      name: 'Sprite',
      price: 90,
      emoji: '<:Sprite:1520045436805714040>',
      description: 'Refresco de lima-limón bien frío. Perfecto para refrescarse entre partidas.',
      stock: 500,
      maxStock: 500,
      category: 'refresco'
    },
    'cocacola': {
      id: 'cocacola',
      name: 'Coca-Cola',
      price: 100,
      emoji: '<:CocaCola:1520045243758674041>',
      description: 'El clásico de toda la vida. Siempre hay alguien que pide una.',
      stock: 500,
      maxStock: 500,
      category: 'refresco'
    },
    'nestea_maracuya': {
      id: 'nestea_maracuya',
      name: 'Nestea Maracuyá',
      price: 140,
      emoji: '<:NesteaMaracuya:1520045119921717299>',
      description: 'Té frío con un toque tropical de maracuyá. Dulce y refrescante.',
      stock: 250,
      maxStock: 250,
      category: 'refresco'
    },
    'aquarius_melocoton': {
      id: 'aquarius_melocoton',
      name: 'Aquarius Melocotón',
      price: 120,
      emoji: '<:AquariusMelocoton:1520044944448815164>',
      description: 'Bebida isotónica sabor melocotón para recuperar energía.',
      stock: 300,
      maxStock: 300,
      category: 'refresco'
    },
    'aquarius_naranja': {
      id: 'aquarius_naranja',
      name: 'Aquarius Naranja',
      price: 120,
      emoji: '<:AquariusNaranja:1520044811619406054>',
      description: 'Isotónica de naranja con un sabor ligero y cítrico.',
      stock: 300,
      maxStock: 300,
      category: 'refresco'
    },
    'fanta_naranja': {
      id: 'fanta_naranja',
      name: 'Fanta Naranja',
      price: 100,
      emoji: '<:FantaNaranja:1520044604232040579>',
      description: 'Refresco de naranja con burbujas y mucho azúcar. La receta de la felicidad temporal.',
      stock: 450,
      maxStock: 450,
      category: 'refresco'
    },
    'fanta_limon': {
      id: 'fanta_limon',
      name: 'Fanta Limón',
      price: 100,
      emoji: '<:FantaLimon:1520044475324305558>',
      description: 'Refresco cítrico con un punto ácido muy refrescante.',
      stock: 450,
      maxStock: 450,
      category: 'refresco'
    },
    'aquarius_limon': {
      id: 'aquarius_limon',
      name: 'Aquarius Limón',
      price: 120,
      emoji: '<:AquariusLimon:1520044298240917628>',
      description: 'Bebida isotónica de limón, ideal para hidratarse en cubierta.',
      stock: 300,
      maxStock: 300,
      category: 'refresco'
    },
    'daiquiri': {
      id: 'daiquiri',
      name: 'Daiquiri',
      price: 550,
      emoji: '<:Daiquiri:1520043379797266452>',
      description: 'Cóctel afrutado preparado con ron y zumo de lima.',
      stock: 60,
      maxStock: 60,
      category: 'cocktail'
    },
    'margarita': {
      id: 'margarita',
      name: 'Margarita',
      price: 650,
      emoji: '<:Margarita:1520043277292929114>',
      description: 'El clásico mexicano con tequila y lima. Un imprescindible.',
      stock: 50,
      maxStock: 50,
      category: 'cocktail'
    },
    'caipirinha': {
      id: 'caipirinha',
      name: 'Caipirinha',
      price: 700,
      emoji: '<:Caipirinha:1520043159114223727>',
      description: 'Cóctel brasileño de cachaça, lima y azúcar de caña.',
      stock: 45,
      maxStock: 45,
      category: 'cocktail'
    },
    'pina_colada': {
      id: 'pina_colada',
      name: 'Piña Colada',
      price: 800,
      emoji: '<:PinaColada:1520042823095685160>',
      description: 'Mezcla cremosa de piña, coco y ron. Sabe a vacaciones.',
      stock: 40,
      maxStock: 40,
      category: 'cocktail'
    },
    'mojito': {
      id: 'mojito',
      name: 'Mojito',
      price: 750,
      emoji: '<:Mohito:1520042750106402967>',
      description: 'Ron blanco, hierbabuena, lima y un toque de soda. El favorito de media humanidad.',
      stock: 45,
      maxStock: 45,
      category: 'cocktail'
    },
    'chaleco_salvavidas': {
      id: 'chaleco_salvavidas',
      name: 'Chaleco Salvavidas',
      price: 500,
      emoji: '🛟',
      description: 'Por si alguien te tira por la borda.',
      stock: 50,
      maxStock: 50,
      category: 'supervivencia',
      usable: true,
      sellable: true,
      sellPrice: 300,
      useMessage: 'Te pones el chaleco salvavidas. Por si alguien te tira por la borda, al menos flotas con estilo.'
    },
    'crema_solar_bsc': {
      id: 'crema_solar_bsc',
      name: 'Crema Solar BSC',
      price: 750,
      emoji: '🧴',
      description: 'Protección 50 contra los quemados del chat.',
      stock: 40,
      maxStock: 40,
      category: 'supervivencia',
      usable: true,
      sellable: true,
      sellPrice: 450,
      useMessage: 'Te untas la Crema Solar BSC. Tu piel ahora brilla más que el chat a las 3 de la mañana.'
    },
    'chanclas_buffet': {
      id: 'chanclas_buffet',
      name: 'Chanclas del Buffet',
      price: 1000,
      emoji: '🩴',
      description: 'Huele a gambas pero son icónicas.',
      stock: 35,
      maxStock: 35,
      category: 'supervivencia',
      usable: true,
      sellable: true,
      sellPrice: 600,
      useMessage: 'Calzas las Chanclas del Buffet. Huele a gambas, pero ya eres leyenda.'
    },
    'mojito_cubierta': {
      id: 'mojito_cubierta',
      name: 'Mojito de Cubierta',
      price: 1500,
      emoji: '🍹',
      description: 'Te emborracha lo justo.',
      stock: 60,
      maxStock: 60,
      category: 'gastronomia',
      usable: true,
      sellable: true,
      sellPrice: 900,
      useMessage: 'Bebes un Mojito de Cubierta. El viento, el mar y una leve pérdida de equilibrio.'
    },
    'buffet_ilimitado': {
      id: 'buffet_ilimitado',
      name: 'Buffet Ilimitado',
      price: 2500,
      emoji: '🍽️',
      description: 'Come todo lo que puedas.',
      stock: 30,
      maxStock: 30,
      category: 'gastronomia',
      usable: true,
      sellable: true,
      sellPrice: 1500,
      useMessage: 'Atacas el Buffet Ilimitado. Sales rodando, pero feliz.'
    },
    'botella_ron_capitán': {
      id: 'botella_ron_capitán',
      name: 'Botella de Ron del Capitán',
      price: 7000,
      emoji: '🍾',
      description: '90% Coca-Cola, etiqueta molona.',
      stock: 12,
      maxStock: 12,
      category: 'gastronomia',
      usable: true,
      sellable: true,
      sellPrice: 4200,
      useMessage: 'Abres la Botella de Ron del Capitán. 90% Coca-Cola, 100% arrepentimiento mañana.'
    },
    'ticket_bingo': {
      id: 'ticket_bingo',
      name: 'Ticket de Bingo',
      price: 1750,
      emoji: '🎫',
      description: 'No ganas pero gritas línea.',
      stock: 45,
      maxStock: 45,
      category: 'entretenimiento',
      usable: true,
      sellable: true,
      sellPrice: 1050,
      useMessage: 'Usas tu Ticket de Bingo. No ganas, pero gritas línea y te echan.'
    },
    'ficha_casino': {
      id: 'ficha_casino',
      name: 'Ficha de Casino',
      price: 2000,
      emoji: '🎰',
      description: 'Apuéstala o guárdala.',
      stock: 80,
      maxStock: 80,
      category: 'entretenimiento',
      usable: true,
      sellable: true,
      sellPrice: 1200,
      useMessage: 'Apuestas tu Ficha de Casino. La suerte sonríe... o no.'
    },
    'microfono_karaoke': {
      id: 'microfono_karaoke',
      name: 'Micrófono de Karaoke',
      price: 3000,
      emoji: '🎤',
      description: 'Con derecho a arruinar una canción.',
      stock: 20,
      maxStock: 20,
      category: 'entretenimiento',
      usable: true,
      sellable: true,
      sellPrice: 1800,
      useMessage: 'Coges el Micrófono de Karaoke. Una canción destrozada, un público traumatizado.'
    },
    'disfraz_marinero': {
      id: 'disfraz_marinero',
      name: 'Disfraz de Marinero',
      price: 3500,
      emoji: '🎭',
      description: 'Para ligar mal y parecer ridículo.',
      stock: 25,
      maxStock: 25,
      category: 'entretenimiento',
      usable: true,
      sellable: true,
      sellPrice: 2100,
      useMessage: 'Te pones el Disfraz de Marinero. Ligas mal, pero pareces ridículo con convicción.'
    },
    'loro_cubierta': {
      id: 'loro_cubierta',
      name: 'Loro de Cubierta',
      price: 4000,
      emoji: '🦜',
      description: 'Repite tus errores en bucle.',
      stock: 10,
      maxStock: 10,
      category: 'entretenimiento',
      usable: true,
      sellable: true,
      sellPrice: 2400,
      useMessage: 'Sacas el Loro de Cubierta. Repite todos tus errores en bucle. Como tu ex.'
    },
    'gorra_capitán': {
      id: 'gorra_capitán',
      name: 'Gorra de Capitán',
      price: 1250,
      emoji: '🧢',
      description: 'Te la pones y dejas de obedecer a Biel.',
      stock: 30,
      maxStock: 30,
      category: 'merchandising',
      usable: true,
      sellable: true,
      sellPrice: 750,
      useMessage: 'Te pones la Gorra de Capitán. A partir de ahora, Biel es tu subordinado.'
    },
    'foto_biel': {
      id: 'foto_biel',
      name: 'Foto con Biel',
      price: 4500,
      emoji: '📸',
      description: 'Edición limitada, fondo verde.',
      stock: 15,
      maxStock: 15,
      category: 'merchandising',
      usable: true,
      sellable: true,
      sellPrice: 2700,
      useMessage: 'Enmarcaste la Foto con Biel. Edición limitada, fondo verde, vergüenza infinita.'
    },
    'traje_gala': {
      id: 'traje_gala',
      name: 'Traje de Gala',
      price: 6000,
      emoji: '🎩',
      description: 'Obligatorio para cenas que nadie se toma en serio.',
      stock: 18,
      maxStock: 18,
      category: 'merchandising',
      usable: true,
      sellable: true,
      sellPrice: 3600,
      useMessage: 'Te vistes con el Traje de Gala. Cena elegante que nadie se toma en serio.'
    },
    'wifi_premium': {
      id: 'wifi_premium',
      name: 'WiFi Premium',
      price: 5000,
      emoji: '🛜',
      description: 'Funciona 10 minutos seguidos.',
      stock: 15,
      maxStock: 15,
      category: 'lujo',
      usable: true,
      sellable: true,
      sellPrice: 3000,
      useMessage: 'Conectas el WiFi Premium. Funciona diez minutos seguidos. Récord.'
    },
    'masaje_spa': {
      id: 'masaje_spa',
      name: 'Masaje en el Spa',
      price: 5500,
      emoji: '🧖',
      description: 'Te relaja hasta que alguien mencione política.',
      stock: 12,
      maxStock: 12,
      category: 'lujo',
      usable: true,
      sellable: true,
      sellPrice: 3300,
      useMessage: 'Disfrutas del Masaje en el Spa. Te relajas hasta que alguien menciona política.'
    },
    'excursion_lancha': {
      id: 'excursion_lancha',
      name: 'Excursión en Lancha',
      price: 7500,
      emoji: '🛥️',
      description: 'Sales 20 minutos y te pierdes.',
      stock: 8,
      maxStock: 8,
      category: 'lujo',
      usable: true,
      sellable: true,
      sellPrice: 4500,
      useMessage: 'Sales en Excursión en Lancha. Veinte minutos después estás perdido.'
    },
    'jacuzzi_privado': {
      id: 'jacuzzi_privado',
      name: 'Jacuzzi Privado',
      price: 8500,
      emoji: '🛁',
      description: 'Capacidad para dos, entran siete.',
      stock: 6,
      maxStock: 6,
      category: 'lujo',
      usable: true,
      sellable: true,
      sellPrice: 5100,
      useMessage: 'Reservas el Jacuzzi Privado. Capacidad para dos, entran siete. Fiesta.'
    },
    'upgrade_camarote': {
      id: 'upgrade_camarote',
      name: 'Upgrade de Camarote',
      price: 10000,
      emoji: '🛏️',
      description: 'Ahora tienes ventana. Sigue oliendo a motor.',
      stock: 5,
      maxStock: 5,
      category: 'lujo',
      usable: true,
      sellable: true,
      sellPrice: 6000,
      useMessage: 'Consigues el Upgrade de Camarote. Ahora tienes ventana. Sigue oliendo a motor.'
    },
    'mapa_tesoro': {
      id: 'mapa_tesoro',
      name: 'Mapa del Tesoro',
      price: 6500,
      emoji: '🗺️',
      description: 'Lleva a la caja fuerte vacía del casino.',
      stock: 7,
      maxStock: 7,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 3900,
      useMessage: 'Sigues el Mapa del Tesoro. Lleva a la caja fuerte vacía del casino. Biel se ríe.'
    },
    'subasta_arte_barco': {
      id: 'subasta_arte_barco',
      name: 'Subasta de Arte del Barco',
      price: 12500,
      emoji: '🎨',
      description: 'Cuadro feo firmado por Biel.',
      stock: 3,
      maxStock: 3,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 7500,
      useMessage: 'Ganas la Subasta de Arte del Barco. Cuadro feo firmado por Biel. Invierno en el salón.'
    },
    'cena_capitán': {
      id: 'cena_capitán',
      name: 'Cena con el Capitán',
      price: 15000,
      emoji: '🍽️',
      description: 'Él habla, tú asientes. Tres horas.',
      stock: 3,
      maxStock: 3,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 9000,
      useMessage: 'Asistes a la Cena con el Capitán. Él habla, tú asientes. Tres horas eternas.'
    },
    'tour_puente_mando': {
      id: 'tour_puente_mando',
      name: 'Tour por el Puente de Mando',
      price: 18000,
      emoji: '🧭',
      description: 'Descubres que nadie sabe dónde vamos.',
      stock: 2,
      maxStock: 2,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 10800,
      useMessage: 'Haces el Tour por el Puente de Mando. Descubres que nadie sabe dónde vamos.'
    },
    'llave_barco': {
      id: 'llave_barco',
      name: 'Llave del Barco',
      price: 22000,
      emoji: '⚓',
      description: 'No arranca nada, pero te sientes importante.',
      stock: 1,
      maxStock: 1,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 13200,
      useMessage: 'Usas la Llave del Barco. No arranca nada, pero te sientes importante.'
    },
    'yate_privado_bsc': {
      id: 'yate_privado_bsc',
      name: 'Yate Privado BSC',
      price: 50000,
      emoji: '🚢',
      description: 'Flex supremo. Miras por encima del hombro a los turistas.',
      stock: 1,
      maxStock: 1,
      category: 'exclusivo',
      usable: true,
      sellable: true,
      sellPrice: 30000,
      useMessage: 'Subes a tu Yate Privado BSC. Flex supremo. Miras por encima del hombro a los turistas.'
    }
  }
};

function load() {
  if (!fs.existsSync(dbPath)) {
    return structuredClone(defaultData);
  }
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const base = structuredClone(defaultData);

    // Fusionar usuarios
    if (data.users) {
      for (const [userId, userData] of Object.entries(data.users)) {
        base.users[userId] = { ...base.users[userId], ...userData };
      }
    }

    // Fusionar items: default añade nuevos, disco conserva stock/precio si existe
    if (data.items) {
      for (const [itemId, diskItem] of Object.entries(data.items)) {
        if (base.items[itemId]) {
          base.items[itemId] = { ...base.items[itemId], ...diskItem };
        } else {
          base.items[itemId] = diskItem;
        }
      }
    }

    // Asegurar que los items por defecto heredan campos nuevos si faltan en disco
    for (const [itemId, defaultItem] of Object.entries(defaultData.items)) {
      if (base.items[itemId]) {
        base.items[itemId] = { ...defaultItem, ...base.items[itemId] };
      }
    }

    return base;
  } catch (error) {
    console.error('Error al cargar la base de datos:', error);
    return structuredClone(defaultData);
  }
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function getUser(data, userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      balance: 0,
      bank: 0,
      inventory: {},
      dailyStreak: 0,
      lastDaily: null,
      lastWork: null,
      lastCrime: null,
      lastRob: null,
      lastExcursion: null
    };
  }
  return data.users[userId];
}

module.exports = { load, save, getUser, defaultData };
