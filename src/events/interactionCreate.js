const { createEphemeralReply } = require('../utils/components');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error ejecutando /${interaction.commandName}:`, error);
        const message = createEphemeralReply('❌ Ha ocurrido un error al ejecutar este comando.');
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(message);
        } else {
          await interaction.reply(message);
        }
      }
    }

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error en autocompletado de /${interaction.commandName}:`, error);
      }
    }
  }
};
