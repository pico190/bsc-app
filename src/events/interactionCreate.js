const { createEphemeralReply } = require('../utils/components');
const { load, save, getUser } = require('../utils/database');
const { subscribe, assignRoles, getPlan, isPassActive } = require('../utils/passManager');
const { formatCoins } = require('../utils/format');
const { buildMenuPayload } = require('../utils/passUI');

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

    if (interaction.isButton() && interaction.customId.startsWith('pass_subscribe_')) {
      const planId = interaction.customId.replace('pass_subscribe_', '');
      const data = load();
      const user = getUser(data, interaction.user.id);
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

      await assignRoles(interaction.member, planId);

      await interaction.update(buildMenuPayload(user));

      if (result.price > 0) {
        await interaction.followUp(createEphemeralReply(`✅ Has activado **${getPlan(planId).name}** por ${formatCoins(result.price)}. Se renueva cada semana.`));
      }
    }
  }
};
