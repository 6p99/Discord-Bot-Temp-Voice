const {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryItemBuilder,
} = require("discord.js");
const { emojis } = require("../database/db");

// إيموجي احتياطي (يونيكود) لو البوت لسا ما رفع الإيموجيز المخصصة تبعه
const FALLBACK_EMOJIS = {
  tv_rename: "✏️",
  tv_limit: "🔢",
  tv_lock: "🔒",
  tv_unlock: "🔓",
  tv_hide: "🙈",
  tv_unhide: "👁️",
  tv_transfer: "🔄",
  tv_region: "🌍",
  tv_kick: "⛔",
  tv_unban: "✅",
  tv_permit: "🎫",
  tv_invite: "✉️",
  tv_chat: "💬",
  tv_thread: "🧵",
  tv_claim: "👑",
  tv_delete: "🗑️",
};

function emojiFor(key) {
  return emojis.get(key) || FALLBACK_EMOJIS[key];
}

function btn(customId) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setEmoji(emojiFor(customId))
    .setStyle(ButtonStyle.Secondary);
}

/**
 * يبني بانل التحكم بالغرف الصوتية المؤقتة (Components v2)
 * نفس شكل اللوحة يلي بالصورة: عنوان + شرح + أزرار تحكم
 */
function buildTempVoicePanel() {
  const container = new ContainerBuilder()
    .addTextDisplayComponents((text) =>
      text.setContent("## 🎙️ تحكم بغرفتك")
    )
    .addTextDisplayComponents((text) =>
      text.setContent(
        "ادخل روم **➕ Create Room** لإنشاء غرفتك الخاصة، ثم استخدم الأزرار بالأسفل وأنت داخل غرفتك للتحكم بها."
      )
    )
    .addSeparatorComponents((sep) =>
      sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents((text) =>
      text.setContent(
        "⚠️ **الأزرار تتحكم في الغرفة التي تجلس فيها وأنت مالكها فقط.**"
      )
    )
    .addSeparatorComponents((sep) =>
      sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addMediaGalleryComponents((mg) =>
      mg.addItems(
        new MediaGalleryItemBuilder()
          .setURL("attachment://panel_legend.png")
          .setDescription("شرح أزرار بانل الغرف الصوتية")
      )
    )
    .addSeparatorComponents((sep) =>
      sep.setSpacing(SeparatorSpacingSize.Small).setDivider(false)
    );

  const row1 = new ActionRowBuilder().addComponents(
    btn("tv_lock"),
    btn("tv_unlock"),
    btn("tv_hide"),
    btn("tv_unhide"),
    btn("tv_limit")
  );

  const row2 = new ActionRowBuilder().addComponents(
    btn("tv_rename"),
    btn("tv_region"),
    btn("tv_kick"),
    btn("tv_unban"),
    btn("tv_permit")
  );

  const row3 = new ActionRowBuilder().addComponents(
    btn("tv_invite"),
    btn("tv_transfer"),
    btn("tv_claim"),
    btn("tv_chat"),
    btn("tv_thread")
  );

  container
    .addActionRowComponents(row1)
    .addActionRowComponents(row2)
    .addActionRowComponents(row3);

  return container;
}

module.exports = { buildTempVoicePanel };
