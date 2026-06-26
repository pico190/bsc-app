const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

function createEconomyContainer({ title, description, fields = [], footer, buttons = [], color = 0x5865F2 }) {
  const container = new ContainerBuilder();

  const titleText = new TextDisplayBuilder()
    .setContent(`# ${title}`);
  container.addTextDisplayComponents(titleText);

  if (description) {
    const descText = new TextDisplayBuilder()
      .setContent(description);
    container.addTextDisplayComponents(descText);
  }

  if (fields.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const fieldsContent = fields
      .map(field => `**${field.name}:** ${field.value}`)
      .join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fieldsContent)
    );
  }

  if (footer) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*${footer}*`)
    );
  }

  if (buttons.length > 0) {
    const actionRow = new ActionRowBuilder();
    for (const btn of buttons) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(btn.customId)
          .setLabel(btn.label)
          .setStyle(btn.style || ButtonStyle.Primary)
          .setEmoji(btn.emoji || '💰')
          .setDisabled(btn.disabled || false)
      );
    }
    container.addActionRowComponents(actionRow);
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
}

module.exports = { createEconomyContainer };
