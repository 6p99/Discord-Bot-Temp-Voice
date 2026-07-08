const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");
const { guilds } = require("../database/db");
const { buildTempVoicePanel } = require("../utils/panel");

const LEGEND_PATH = path.join(__dirname, "..", "..", "assets", "panel_legend.png");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("يرسل/يحدّث بانل التحكم بالغرف الصوتية في هذا الروم")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const guildConfig = guilds.get(interaction.guild.id);
    if (!guildConfig) {
      return interaction.reply({
        content: "⚠️ ما في إعداد بعد لهاد السيرفر، استخدم الأمر `/setup` أول شي.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = buildTempVoicePanel();
    const legendFile = new AttachmentBuilder(LEGEND_PATH, { name: "panel_legend.png" });
    await interaction.channel.send({
      components: [container],
      files: [legendFile],
      flags: MessageFlags.IsComponentsV2,
    });

    guildConfig.panelChannelId = interaction.channel.id;
    guilds.set(interaction.guild.id, guildConfig);

    await interaction.reply({
      content: "✅ تم إرسال البانل.",
      flags: MessageFlags.Ephemeral,
    });
  },
};
