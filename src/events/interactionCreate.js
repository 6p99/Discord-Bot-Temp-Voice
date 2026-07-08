const { Events, MessageFlags } = require("discord.js");
const {
  handleButton,
  handleSelectMenu,
  handleModalSubmit,
} = require("../handlers/tempvoice");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith("tv_")) {
        return handleButton(interaction);
      }

      if (
        (interaction.isUserSelectMenu() || interaction.isStringSelectMenu()) &&
        interaction.customId.startsWith("tv_")
      ) {
        return handleSelectMenu(interaction);
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("tv_")) {
        return handleModalSubmit(interaction);
      }
    } catch (err) {
      console.error("[Interaction] خطأ:", err);
      const payload = {
        content: "❌ صار خطأ غير متوقع أثناء تنفيذ الطلب.",
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
