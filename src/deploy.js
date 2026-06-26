const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

let config = {};
const configPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Error al leer config.json:', error);
  }
}

const TOKEN = process.env.DISCORD_TOKEN || config.token;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || config.clientId;
const GUILD_ID = process.env.DISCORD_GUILD_ID || config.guildId;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Faltan TOKEN o CLIENT_ID.');
  console.error('   Configura DISCORD_TOKEN y DISCORD_CLIENT_ID como variables de entorno o en config.json.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`⚠️ El archivo ${file} no tiene la estructura de comando requerida.`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🚀 Registrando ${commands.length} comandos...`);

    let data;
    if (GUILD_ID) {
      data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} comandos registrados en el servidor ${GUILD_ID}.`);
    } else {
      data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} comandos registrados globalmente.`);
    }
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
    process.exit(1);
  }
})();
