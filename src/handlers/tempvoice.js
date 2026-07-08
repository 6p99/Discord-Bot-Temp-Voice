const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const { rooms, userSettings, guilds } = require("../database/db");
const { getActiveRoomFromMember, isOwner, getRoom, destroyRoom } = require("../utils/rooms");
const { measureAllRegions } = require("../utils/pingTest");

function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

/**
 * يتحقق أن العضو داخل غرفة مؤقتة وأنه المالك، ويرجع {channel, room} أو يرد بخطأ
 */
function requireOwnedRoom(interaction) {
  const { channel, room } = getActiveRoomFromMember(interaction.member);

  if (!channel || !room) {
    return {
      ok: false,
      reply: ephemeral("⚠️ لازم تكون داخل غرفتك الصوتية المؤقتة عشان تستخدم هاد الزر."),
    };
  }

  if (!isOwner(room, interaction.user.id)) {
    return {
      ok: false,
      reply: ephemeral("⚠️ هاد الزر يقدر يستخدمه بس **مالك الغرفة**."),
    };
  }

  return { ok: true, channel, room };
}

// ============ الأزرار الرئيسية ============

async function handleButton(interaction) {
  const id = interaction.customId;

  // زر تأكيد/إلغاء الحذف
  if (id === "tv_delete_confirm" || id === "tv_delete_cancel") {
    return handleDeleteConfirmation(interaction);
  }

  // المطالبة بالملكية لها منطق خاص (تشتغل حتى لو الشخص مو المالك الحالي)
  if (id === "tv_claim") {
    return handleClaim(interaction);
  }

  const check = requireOwnedRoom(interaction);
  if (!check.ok) return interaction.reply(check.reply);
  const { channel, room } = check;

  switch (id) {
    case "tv_rename":
      return showRenameModal(interaction, channel);
    case "tv_limit":
      return showLimitModal(interaction, channel);
    case "tv_lock":
      return setLock(interaction, channel, room, true);
    case "tv_unlock":
      return setLock(interaction, channel, room, false);
    case "tv_hide":
      return setHidden(interaction, channel, room, true);
    case "tv_unhide":
      return setHidden(interaction, channel, room, false);
    case "tv_chat":
      return toggleChat(interaction, channel, room);
    case "tv_transfer":
      return showTransferSelect(interaction, channel);
    case "tv_region":
      return showRegionSelect(interaction, channel);
    case "tv_kick":
      return showKickSelect(interaction, channel);
    case "tv_unban":
      return showUnbanSelect(interaction, channel);
    case "tv_permit":
      return showPermitSelect(interaction, channel);
    case "tv_invite":
      return doInvite(interaction, channel);
    case "tv_thread":
      return doThread(interaction, channel);
    case "tv_delete":
      return showDeleteConfirm(interaction, channel);
    default:
      return;
  }
}

// ============ قفل / فتح ============

async function setLock(interaction, channel, room, locked) {
  const everyoneId = channel.guild.roles.everyone.id;

  await channel.permissionOverwrites.edit(everyoneId, {
    Connect: locked ? false : null,
  });

  room.locked = locked;
  rooms.set(channel.id, room);

  const saved = userSettings.get(room.ownerId) || {};
  userSettings.set(room.ownerId, { ...saved, locked });

  await interaction.reply(
    ephemeral(locked ? "🔒 تم قفل الغرفة." : "🔓 تم فتح الغرفة.")
  );
}

// ============ إخفاء / إظهار ============

async function setHidden(interaction, channel, room, hidden) {
  const everyoneId = channel.guild.roles.everyone.id;

  await channel.permissionOverwrites.edit(everyoneId, {
    ViewChannel: hidden ? false : null,
  });

  room.hidden = hidden;
  rooms.set(channel.id, room);

  await interaction.reply(
    ephemeral(hidden ? "🙈 تم إخفاء الغرفة عن باقي الأعضاء." : "👁️ تم إظهار الغرفة من جديد.")
  );
}

// ============ تفعيل / تعطيل الشات داخل الغرفة ============

async function toggleChat(interaction, channel, room) {
  const everyoneId = channel.guild.roles.everyone.id;
  const newDisabled = !room.chatDisabled;

  await channel.permissionOverwrites.edit(everyoneId, {
    SendMessages: newDisabled ? false : null,
  });

  room.chatDisabled = newDisabled;
  rooms.set(channel.id, room);

  await interaction.reply(
    ephemeral(
      newDisabled
        ? "💬 تم تعطيل الشات النصي داخل غرفتك."
        : "💬 تم تفعيل الشات النصي داخل غرفتك."
    )
  );
}

// ============ المطالبة بالملكية ============

async function handleClaim(interaction) {
  const { channel, room } = getActiveRoomFromMember(interaction.member);

  if (!channel || !room) {
    return interaction.reply(
      ephemeral("⚠️ لازم تكون داخل غرفة صوتية مؤقتة عشان تطالب فيها.")
    );
  }

  if (room.ownerId === interaction.user.id) {
    return interaction.reply(ephemeral("ℹ️ انت أصلاً مالك هاد الغرفة."));
  }

  const ownerStillHere = channel.members.has(room.ownerId);
  if (ownerStillHere) {
    return interaction.reply(
      ephemeral("⚠️ ما تقدر تطالب بالغرفة، مالكها لسا موجود داخلها.")
    );
  }

  await channel.permissionOverwrites.edit(room.ownerId, {
    ManageChannels: null,
    MoveMembers: null,
  });
  await channel.permissionOverwrites.edit(interaction.user.id, {
    Connect: true,
    ManageChannels: true,
    MoveMembers: true,
  });

  room.ownerId = interaction.user.id;
  rooms.set(channel.id, room);

  await interaction.reply(ephemeral("👑 تم! صرت أنت مالك الغرفة."));
}

// ============ دعوة (لينك دعوة سريع) ============

async function doInvite(interaction, channel) {
  try {
    const invite = await channel.createInvite({
      maxAge: 3600,
      maxUses: 1,
      unique: true,
    });
    await interaction.reply(
      ephemeral(`✉️ رابط الدعوة (صالح ساعة واحدة، استخدام واحد فقط):\n${invite.url}`)
    );
  } catch (err) {
    await interaction.reply(
      ephemeral("❌ ما قدرت أنشئ رابط دعوة، تأكد إنه صلاحية Create Invite موجودة للبوت.")
    );
  }
}

// ============ ثريد داخل شات الغرفة ============

async function doThread(interaction, channel) {
  try {
    const thread = await channel.threads.create({
      name: `نقاش - ${channel.name}`.slice(0, 90),
      autoArchiveDuration: 60,
    });
    await interaction.reply(ephemeral(`🧵 تم إنشاء ثريد: ${thread}`));
  } catch (err) {
    await interaction.reply(
      ephemeral("❌ هاد الميزة مش مدعومة حالياً على هاد النوع من الرومات بديسكورد.")
    );
  }
}

// ============ سماح لعضو معين بالدخول (حتى لو الغرفة مقفولة/مخفية) ============

async function showPermitSelect(interaction, channel) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tv_permit_select:${channel.id}`)
    .setPlaceholder("اختر العضو يلي بدك تسمحله بالدخول")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    ...ephemeral("👇 اختر العضو يلي بدك تسمحله يدخل غرفتك حتى لو مقفولة/مخفية:"),
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============ تغيير الاسم ============

async function showRenameModal(interaction, channel) {
  const modal = new ModalBuilder()
    .setCustomId(`tv_rename_modal:${channel.id}`)
    .setTitle("تغيير اسم الغرفة");

  const input = new TextInputBuilder()
    .setCustomId("new_name")
    .setLabel("الاسم الجديد للغرفة")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(90)
    .setValue(channel.name.slice(0, 90))
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

// ============ تغيير الحد الأقصى للأعضاء ============

async function showLimitModal(interaction, channel) {
  const modal = new ModalBuilder()
    .setCustomId(`tv_limit_modal:${channel.id}`)
    .setTitle("تحديد عدد المستخدمين");

  const input = new TextInputBuilder()
    .setCustomId("new_limit")
    .setLabel("الحد الأقصى (0 = بدون حد، أقصى شي 99)")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(2)
    .setPlaceholder("مثال: 5")
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

// ============ نقل الملكية ============

async function showTransferSelect(interaction, channel) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tv_transfer_select:${channel.id}`)
    .setPlaceholder("اختر العضو يلي بدك تنقله ملكية الغرفة")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    ...ephemeral("👇 اختر العضو الجديد (يجب أن يكون داخل غرفتك):"),
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============ تغيير المنطقة الصوتية (مع قياس بينج حقيقي لكل منطقة) ============

async function showRegionSelect(interaction, channel) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await interaction.editReply(
    "🏓 جاري قياس البينج الحقيقي لكل منطقة صوتية... ممكن ياخد لحد دقيقة، لا تسكر الرسالة."
  );

  const guildConfig = guilds.get(channel.guild.id) || {};

  let results;
  try {
    results = await measureAllRegions(channel.guild, guildConfig, async (done, total, label) => {
      await interaction
        .editReply(`🏓 جاري القياس... (${done}/${total}) — آخر منطقة: ${label}`)
        .catch(() => {});
    });
  } catch (err) {
    console.error("[PingTest] فشل القياس:", err);
    return interaction.editReply(
      "❌ صار خطأ أثناء قياس البينج. تأكد إنه صلاحيات البوت (Connect/View Channel) موجودة، وحاول كمان مرة."
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`tv_region_select:${channel.id}`)
    .setPlaceholder("اختر المنطقة الصوتية")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("تلقائي (Automatic)")
        .setDescription("ديسكورد يختار الأفضل تلقائياً")
        .setValue("null"),
      ...results.map((r, i) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${i === 0 ? "⭐ " : ""}${r.label}`)
          .setDescription(r.ping !== null ? `🏓 ${r.ping}ms` : "غير متاح حالياً")
          .setValue(r.value)
      )
    );

  const lines = results
    .map((r, i) => `${i === 0 ? "⭐" : "•"} ${r.label}: ${r.ping !== null ? `**${r.ping}ms**` : "غير متاح"}`)
    .join("\n");

  await interaction.editReply({
    content: `✅ خلص القياس! هاي أفضل المناطق لغرفتك (الأقل بينج بالأول):\n\n${lines}\n\n👇 اختر المنطقة يلي بدك تستخدمها:`,
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============ حظر عضو ============

async function showKickSelect(interaction, channel) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tv_kick_select:${channel.id}`)
    .setPlaceholder("اختر العضو يلي بدك تحظره من غرفتك")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    ...ephemeral("👇 اختر العضو يلي بدك تحظره من الدخول للغرفة:"),
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============ فك حظر عضو ============

async function showUnbanSelect(interaction, channel) {
  const room = getRoom(channel.id);
  if (!room || !room.bannedUsers || room.bannedUsers.length === 0) {
    return interaction.reply(ephemeral("ℹ️ ما في حد محظور من غرفتك حالياً."));
  }

  const select = new UserSelectMenuBuilder()
    .setCustomId(`tv_unban_select:${channel.id}`)
    .setPlaceholder("اختر العضو يلي بدك تفك حظره")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    ...ephemeral("👇 اختر العضو يلي بدك تفك حظره:"),
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============ حذف الغرفة (بتأكيد) ============

async function showDeleteConfirm(interaction, channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tv_delete_confirm:${channel.id}`)
      .setLabel("تأكيد الحذف")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tv_delete_cancel")
      .setLabel("إلغاء")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    ...ephemeral("⚠️ متأكد بدك تحذف غرفتك؟ هاد الإجراء ما إله رجعة."),
    components: [row],
  });
}

async function handleDeleteConfirmation(interaction) {
  if (interaction.customId === "tv_delete_cancel") {
    return interaction.update({
      content: "❎ تم إلغاء الحذف.",
      components: [],
    });
  }

  const channelId = interaction.customId.split(":")[1];
  const check = requireOwnedRoomById(interaction, channelId);
  if (!check.ok) {
    return interaction.update({ content: check.message, components: [] });
  }

  await interaction.update({ content: "🗑️ جاري حذف الغرفة...", components: [] });
  await destroyRoom(interaction.guild, channelId);
}

// ============ التحقق من الملكية عبر channelId مخزّن بالـ customId ============

function requireOwnedRoomById(interaction, channelId) {
  const room = getRoom(channelId);
  if (!room) {
    return { ok: false, message: "⚠️ الغرفة ما عادت موجودة." };
  }
  if (room.ownerId !== interaction.user.id) {
    return { ok: false, message: "⚠️ هاد الإجراء يقدر يعمله بس مالك الغرفة." };
  }
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return { ok: false, message: "⚠️ الغرفة ما عادت موجودة." };
  }
  return { ok: true, room, channel };
}

// ============ استقبال الـ Select Menus ============

async function handleSelectMenu(interaction) {
  const [action, channelId] = interaction.customId.split(":");
  if (!channelId) return;

  const check = requireOwnedRoomById(interaction, channelId);
  if (!check.ok) {
    return interaction.update({ content: check.message, components: [] });
  }
  const { channel, room } = check;

  switch (action) {
    case "tv_transfer_select":
      return doTransfer(interaction, channel, room);
    case "tv_region_select":
      return doRegionChange(interaction, channel);
    case "tv_kick_select":
      return doKick(interaction, channel, room);
    case "tv_unban_select":
      return doUnban(interaction, channel, room);
    case "tv_permit_select":
      return doPermit(interaction, channel, room);
    default:
      return;
  }
}

async function doTransfer(interaction, channel, room) {
  const targetId = interaction.values[0];
  const targetMember = channel.members.get(targetId);

  if (!targetMember) {
    return interaction.update({
      content: "⚠️ هاد العضو لازم يكون داخل غرفتك عشان تنقله الملكية.",
      components: [],
    });
  }
  if (targetId === room.ownerId) {
    return interaction.update({
      content: "ℹ️ هاد العضو أصلاً هو مالك الغرفة.",
      components: [],
    });
  }

  // شيل صلاحيات المالك القديم، عطي الجديد
  await channel.permissionOverwrites.edit(room.ownerId, {
    ManageChannels: null,
    MoveMembers: null,
  });
  await channel.permissionOverwrites.edit(targetId, {
    Connect: true,
    ManageChannels: true,
    MoveMembers: true,
  });

  room.ownerId = targetId;
  rooms.set(channel.id, room);

  await interaction.update({
    content: `✅ تم نقل ملكية الغرفة إلى <@${targetId}>.`,
    components: [],
  });
}

async function doRegionChange(interaction, channel) {
  const value = interaction.values[0];
  await channel.setRTCRegion(value === "null" ? null : value);

  await interaction.update({
    content: "✅ تم تغيير منطقة الغرفة الصوتية.",
    components: [],
  });
}

async function doKick(interaction, channel, room) {
  const targetId = interaction.values[0];

  if (targetId === room.ownerId) {
    return interaction.update({
      content: "⚠️ ما تقدر تحظر نفسك، انت مالك الغرفة.",
      components: [],
    });
  }

  await channel.permissionOverwrites.edit(targetId, {
    Connect: false,
  });

  const targetMember = channel.members.get(targetId);
  if (targetMember) {
    await targetMember.voice.disconnect().catch(() => {});
  }

  room.bannedUsers = Array.from(new Set([...(room.bannedUsers || []), targetId]));
  rooms.set(channel.id, room);

  await interaction.update({
    content: `⛔ تم حظر <@${targetId}> من الدخول لغرفتك.`,
    components: [],
  });
}

async function doUnban(interaction, channel, room) {
  const targetId = interaction.values[0];

  await channel.permissionOverwrites.edit(targetId, {
    Connect: null,
  });

  room.bannedUsers = (room.bannedUsers || []).filter((id) => id !== targetId);
  rooms.set(channel.id, room);

  await interaction.update({
    content: `✅ تم فك الحظر عن <@${targetId}>.`,
    components: [],
  });
}

async function doPermit(interaction, channel, room) {
  const targetId = interaction.values[0];

  await channel.permissionOverwrites.edit(targetId, {
    Connect: true,
    ViewChannel: true,
  });

  room.permittedUsers = Array.from(new Set([...(room.permittedUsers || []), targetId]));
  rooms.set(channel.id, room);

  await interaction.update({
    content: `🎫 تم السماح لـ <@${targetId}> بالدخول لغرفتك حتى لو مقفولة أو مخفية.`,
    components: [],
  });
}

// ============ استقبال الـ Modals ============

async function handleModalSubmit(interaction) {
  const [action, channelId] = interaction.customId.split(":");
  if (!channelId) return;

  const check = requireOwnedRoomById(interaction, channelId);
  if (!check.ok) {
    return interaction.reply(ephemeral(check.message));
  }
  const { channel } = check;

  if (action === "tv_rename_modal") {
    const newName = interaction.fields.getTextInputValue("new_name").trim();
    if (!newName) return interaction.reply(ephemeral("⚠️ الاسم مو صحيح."));

    await channel.setName(newName.slice(0, 90));
    return interaction.reply(ephemeral(`✅ تم تغيير اسم الغرفة إلى **${newName}**.`));
  }

  if (action === "tv_limit_modal") {
    const raw = interaction.fields.getTextInputValue("new_limit").trim();
    const limit = Number(raw);

    if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
      return interaction.reply(
        ephemeral("⚠️ لازم تكتب رقم صحيح بين 0 و 99 (0 يعني بدون حد).")
      );
    }

    await channel.setUserLimit(limit);

    const saved = userSettings.get(interaction.user.id) || {};
    userSettings.set(interaction.user.id, { ...saved, limit });

    return interaction.reply(
      ephemeral(
        limit === 0
          ? "✅ تم إزالة الحد الأقصى للأعضاء."
          : `✅ تم تحديد الحد الأقصى بـ ${limit} أعضاء.`
      )
    );
  }
}

module.exports = {
  handleButton,
  handleSelectMenu,
  handleModalSubmit,
};
