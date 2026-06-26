# 🚢 BSC Bilel — Bot de Economía para Discord

Bot de economía tematizado en un crucero de lujo, construido con **Discord.js v14** y los nuevos **Components V2** de Discord (containers, text displays, separators y botones integrados).

Gana monedas del BSC, bebe cócteles en cubierta, roba a otros pasajeros, compra artículos de la tienda duty free y escala hasta lo más alto del leaderboard.

---

## ✨ Características principales

- **Economía completa**: balance, banco, daily, work, crime, rob, pay, tip, deposit/withdraw.
- **Casino**: tragaperras con multiplicadores.
- **Tienda duty free**: bebidas, supervivencia, gastronomía, entretenimiento, merchandising, lujo y artículos exclusivos con stock limitado.
- **Sistema de inventario**: organizado por categorías con emojis y cantidades.
- **Uso y reventa de items**: consume artículos para ver frases temáticas o revéndelos por el 60% de su valor.
- **Rol de bartender**: usuarios con el rol designado pueden servir bebidas gratis y reponer stock.
- **Components V2**: interfaz moderna, limpia y adaptada a Discord sin ASCII ni hacks visuales.
- **Dockerizado**: listo para ejecutar con Docker Compose.

---

## 📋 Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Un bot de Discord con token de aplicación
- Permisos para registrar slash commands

---

## 🚀 Instalación rápida

### 1. Clona el repositorio

```bash
git clone https://github.com/tuusuario/bsc-bilel-bot.git
cd bsc-bilel-bot
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Configura el bot

Copia el archivo de ejemplo:

```bash
cp config.json.example config.json
```

Edita `config.json` con tus datos:

```json
{
  "token": "TU_TOKEN_DEL_BOT",
  "clientId": "ID_DE_TU_APLICACION",
  "guildId": "ID_DE_TU_SERVIDOR"
}
```

> También puedes usar variables de entorno: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` y `DISCORD_GUILD_ID`.

### 4. Registra los comandos slash

```bash
npm run deploy
```

### 5. Inicia el bot

```bash
npm start
```

En desarrollo con recarga automática:

```bash
npm run dev
```

---

## 🐳 Docker

El bot incluye `Dockerfile` y `docker-compose.yml` para despliegue sencillo.

### 1. Configura las variables de entorno

```bash
cp .env.example .env
```

Rellena `.env`:

```env
DISCORD_TOKEN=TU_TOKEN_DEL_BOT
DISCORD_CLIENT_ID=ID_DE_TU_APLICACION
# Opcional: para registro en un servidor concreto
# DISCORD_GUILD_ID=ID_DE_TU_SERVIDOR
```

### 2. Construye e inicia

```bash
docker-compose up -d --build
```

El contenedor registra los comandos slash automáticamente al arrancar y luego inicia el bot. Si añades o modificas comandos, solo tienes que reiniciar el contenedor:

```bash
docker-compose restart
```

> Si prefieres desactivar el deploy automático, añade `AUTO_DEPLOY=false` al `.env` y regístralos manualmente con `docker-compose exec bsc-bilel-bot node src/deploy.js`.

La base de datos se persiste en el volumen `bsc-bilel-data`, así que los balances y stocks se conservan entre reinicios.

---

## 🤖 Comandos disponibles

### Economía

| Comando | Descripción |
| --- | --- |
| `/balance [usuario]` | Muestra dinero en mano, banco y total. |
| `/daily` | Recompensa diaria con sistema de racha. |
| `/work` | Trabaja para ganar monedas. |
| `/crime` | Comete un crimen. Puedes ganar o perder dinero. |
| `/rob @usuario` | Intenta robar a otro pasajero. |
| `/pay @usuario cantidad` | Transfiere monedas. |
| `/deposit cantidad` | Guarda dinero en el banco. |
| `/withdraw cantidad` | Saca dinero del banco. |
| `/tip @usuario cantidad` | Deja una propina. |
| `/excursion` | Gana monedas en una excursión en tierra. |
| `/leaderboard` | Top 10 de pasajeros más ricos. |

### Tienda e inventario

| Comando | Descripción |
| --- | --- |
| `/shop` | Muestra la tienda duty free completa. |
| `/buy item [cantidad]` | Compra artículos. Algunos tienen límites por compra. |
| `/inventory [usuario]` | Muestra el inventario organizado por categorías. |
| `/item use item [cantidad]` | Usa un item y muestra su frase temática. |
| `/item sell item cantidad` | Revende items por el 60% de su precio. |
| `/item info item` | Muestra información detallada de un item. |

### Casino

| Comando | Descripción |
| --- | --- |
| `/casino apuesta` | Juega a la tragaperras del crucero. |

### Personal de bar

| Comando | Descripción |
| --- | --- |
| `/bartender serve @usuario bebida [cantidad]` | Sirve bebidas/items gratis. Solo rol de bartender. |
| `/bartender restock item cantidad` | Repone stock hasta el máximo. Solo rol de bartender. |
| `/bartender stock` | Consulta el stock actual del bar. |

### Utilidad

| Comando | Descripción |
| --- | --- |
| `/help` | Ayuda paginada con todos los comandos. |

---

## 🛍️ Categorías de la tienda

- **🥤 Refrescos**: Sprite, Coca-Cola, Fanta, Aquarius, Nestea.
- **🍸 Cócteles**: Mojito, Daiquiri, Margarita, Caipirinha, Piña Colada, y sus versiones sin alcohol.
- **🍦 Helados**: Vainilla, chocolate, fresa, limón, menta-chocolate, cookies, mango y coco.
- **🛟 Supervivencia básica**: Chaleco salvavidas, crema solar, chanclas del buffet.
- **🍽️ Gastronomía**: Mojito de cubierta, buffet ilimitado, botella de ron del capitán.
- **🎰 Entretenimiento**: Bingo, casino, karaoke, disfraces, loro de cubierta.
- **👕 Merchandising**: Gorra de capitán, foto con Biel, traje de gala.
- **🧖 Lujo y bienestar**: WiFi premium, spa, excursiones, jacuzzi, upgrade de camarote.
- **🏆 Exclusivo**: Mapa del tesoro, subasta de arte, cena con el capitán, tour por el puente, llave del barco, yate privado.

Los artículos exclusivos tienen stock muy limitado (algunos únicos) para crear escasez y eventos especiales en el servidor.

---

## 🧑‍✈️ Configurar el rol de bartender

El ID del rol de bartender está configurado en `src/commands/bartender.js`:

```js
const BARTENDER_ROLE_ID = '1515466137414930506';
```

Cambia este valor por el ID del rol de tu servidor si es necesario. Los administradores también pueden usar estos comandos.

---

## 🛡️ Seguridad

- Los archivos `config.json`, `.env` y `database.json` están ignorados en Git.
- Nunca subas tokens ni datos de usuarios al repositorio.

---

## 📦 Estructura del proyecto

```
.
├── src/
│   ├── commands/        # Comandos slash
│   ├── events/          # Eventos de Discord
│   ├── utils/           # Utilidades (DB, componentes, formato)
│   ├── index.js         # Punto de entrada del bot
│   └── deploy.js        # Registro de comandos slash
├── Dockerfile
├── docker-compose.yml
├── package.json
├── config.json.example
├── .env.example
└── README.md
```

---

## 📄 Licencia

MIT. Úsalo, modifícalo y mejóralo como quieras.

---

*Hecho con amor, ron y muchas horas en cubierta.* 🌊
