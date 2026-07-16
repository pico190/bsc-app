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

    for (const field of fields) {
      const fieldContent = `**${field.name}**\n${field.value}`;

      // Discord limita cada TextDisplay a 4000 caracteres
      if (fieldContent.length > 4000) {
        const chunks = [];
        let current = '';
        const lines = field.value.split('\n');

        for (const line of lines) {
          if ((current + '\n' + line).length > 3950) {
            chunks.push(current);
            current = line;
          } else {
            current = current ? current + '\n' + line : line;
          }
        }
        if (current) chunks.push(current);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${field.name}**`)
        );
        for (const chunk of chunks) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(chunk)
          );
        }
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(fieldContent)
        );
      }
    }
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
    const isNested = Array.isArray(buttons[0]);
    const rows = isNested ? buttons : [buttons];

    for (const row of rows) {
      if (row.length === 0) continue;
      const actionRow = new ActionRowBuilder();
      for (const btn of row) {
        const builder = new ButtonBuilder()
          .setCustomId(btn.customId)
          .setLabel(btn.label)
          .setStyle(btn.style || ButtonStyle.Primary)
          .setDisabled(btn.disabled || false);
        if (btn.emoji) builder.setEmoji(btn.emoji);
        actionRow.addComponents(builder);
      }
      container.addActionRowComponents(actionRow);
    }
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };
}

function createEphemeralReply(content) {
  return {
    content,
    flags: MessageFlags.Ephemeral
  };
}

module.exports = { createEconomyContainer, createEphemeralReply };
