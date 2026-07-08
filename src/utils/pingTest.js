const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection,
} = require("@discordjs/voice");
const { ChannelType, PermissionsBitField } = require("discord.js");
const { guilds } = require("../database/db");

// قائمة كل مناطق ديسكورد الصوتية يلي رح نقيس البينج إلها
const REGIONS = [
  { label: "أمريكا الغربية", value: "us-west" },
  { label: "أمريكا الشرقية", value: "us-east" },
  { label: "أمريكا الوسطى", value: "us-central" },
  { label: "أمريكا الجنوبية", value: "us-south" },
  { label: "روسيا", value: "russia" },
  { label: "سنغافورة", value: "singapore" },
  { label: "هونغ كونغ", value: "hongkong" },
  { label: "اليابان", value: "japan" },
  { label: "الهند", value: "india" },
  { label: "جنوب أفريقيا", value: "southafrica" },
  { label: "سيدني", value: "sydney" },
  { label: "روتردام (أوروبا)", value: "rotterdam" },
  { label: "البرازيل", value: "brazil" },
];

/**
 * يجيب روم صوتي مخفي مخصص لقياس البينج، أو ينشئه أول مرة
 * (مخفي عن الكل، البوت بس يلي يدخله لحظياً وقت القياس)
 */
async function getOrCreateTestChannel(guild, guildConfig) {
  let channel = guildConfig.pingTestChannelId
    ? guild.channels.cache.get(guildConfig.pingTestChannelId)
    : null;

  if (channel) return channel;

  channel = await guild.channels.create({
    name: "🧪 ping-test",
    type: ChannelType.GuildVoice,
    parent: guildConfig.categoryId || undefined,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  });

  guildConfig.pingTestChannelId = channel.id;
  guilds.set(guild.id, guildConfig);

  return channel;
}

/**
 * يقيس بينج منطقة صوتية وحدة عن طريق دخول البوت فعلياً للروم وقياس UDP ping
 */
async function measureRegionPing(channel, regionId) {
  try {
    await channel.setRTCRegion(regionId);
  } catch {
    return null;
  }

  // نتأكد ما في اتصال قديم عالق بنفس الروم
  const existing = getVoiceConnection(channel.guild.id);
  if (existing) existing.destroy();

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 8_000);
    // نستنى شوي لحد ما يتحسب أول ping فعلي
    await new Promise((r) => setTimeout(r, 1800));
    const ping = connection.ping?.udp ?? null;
    return ping;
  } catch {
    return null;
  } finally {
    connection.destroy();
    await new Promise((r) => setTimeout(r, 300));
  }
}

/**
 * يقيس البينج لكل مناطق ديسكورد ويرجعهن مرتبين من الأسرع للأبطأ
 */
async function measureAllRegions(guild, guildConfig, onProgress) {
  const testChannel = await getOrCreateTestChannel(guild, guildConfig);
  const results = [];

  for (const region of REGIONS) {
    const ping = await measureRegionPing(testChannel, region.value);
    results.push({ ...region, ping });
    if (onProgress) {
      await onProgress(results.length, REGIONS.length, region.label);
    }
  }

  const existing = getVoiceConnection(guild.id);
  if (existing) existing.destroy();

  results.sort((a, b) => {
    if (a.ping === null) return 1;
    if (b.ping === null) return -1;
    return a.ping - b.ping;
  });

  return results;
}

module.exports = { REGIONS, measureAllRegions };
