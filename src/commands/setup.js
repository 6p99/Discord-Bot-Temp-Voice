const {
  SlashCommandBuilder,
  ChannelType,
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
    .setName("setup")
    .setDescription("يجهز نظام الغرف الصوتية المؤقتة في السيرفر")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;

    // 1) كاتيجوري الغرف الصوتية المؤقتة
    const category = await guild.channels.create({
      name: "🔊 الغرف الصوتية",
      type: ChannelType.GuildCategory,
    });

    // 2) روم الإنشاء (Create Room)
    const creatorChannel = await guild.channels.create({
      name: "➕ Create Room",
      type: ChannelType.GuildVoice,
      parent: category.id,
    });

    // 3) روم التحكم النصية (البانل)
    const panelChannel = await guild.channels.create({
      name: "🎛️-تحكم-بغرفتك",
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.SendMessages],
        },
      ],
    });

    const container = buildTempVoicePanel();
    const legendFile = new AttachmentBuilder(LEGEND_PATH, { name: "panel_legend.png" });
    const panelMessage = await panelChannel.send({
      components: [container],
      files: [legendFile],
      flags: MessageFlags.IsComponentsV2,
    });

    guilds.set(guild.id, {
      categoryId: category.id,
      creatorChannelId: creatorChannel.id,
      panelChannelId: panelChannel.id,
      panelMessageId: panelMessage.id,
    });

    await interaction.editReply(
      `✅ تم تجهيز نظام الغرف الصوتية المؤقتة بنجاح!\n\n` +
        `📁 الكاتيجوري: ${category}\n` +
        `➕ روم الإنشاء: ${creatorChannel}\n` +
        `🎛️ روم التحكم: ${panelChannel}\n\n` +
        `أي شخص يدخل روم **➕ Create Room** رح تنعمله غرفة خاصة فيه تلقائياً.`
    );
  },
};
