// SwiftKey Wallet Bot
// By Pai 💖 For ซีม่อน

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder
} = require("discord.js");

const axios = require("axios");
const fs = require("fs");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;

const OWNER_ID = "1432690520005804092";
const GUILD_ID = "1469089204150735180";
const ROLE_ID = "1469729666192376073";
const LOG_CHANNEL = "1469912273891098685";

const KEY_PRICE = 59;

// ================= DATABASE =================

const dbPath = "./database";
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

const files = {
  users: "./database/users.json",
  keys: "./database/keys.json",
  payments: "./database/payments.json"
};

function initDB() {
  for (let f in files) {
    if (!fs.existsSync(files[f])) {
      fs.writeFileSync(files[f], JSON.stringify({}, null, 2));
    }
  }
}
initDB();

function load(file) {
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ================= SLASH =================

client.once("ready", async () => {
  console.log("Bot Ready!");

  const cmds = [
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("เปิดแผงควบคุม"),

    new SlashCommandBuilder()
      .setName("addkey")
      .setDescription("เพิ่มคีย์ (Owner)")
      .addStringOption(o =>
        o.setName("key").setDescription("ใส่คีย์").setRequired(true)
      )
  ];

  await client.application.commands.set(cmds, GUILD_ID);
});

// ================= PANEL =================

function panel() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("topup")
      .setLabel("💰 เติมเงิน")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("getkey")
      .setLabel("🔑 Get Key")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("balance")
      .setLabel("💳 เช็คยอด")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("howto")
      .setLabel("📖 วิธีใช้")
      .setStyle(ButtonStyle.Secondary)
  );
}

// ================= WALLET CHECK =================
// ใช้ API ตรวจซอง (ตัวอย่าง Public API)
async function checkWallet(url) {
  try {
    const res = await axios.post(
      "https://wallet-api.vercel.app/verify",
      { url }
    );

    if (!res.data.status) return null;

    return res.data.amount;

  } catch {
    return null;
  }
}

// ================= INTERACTION =================

client.on("interactionCreate", async (i) => {

  // ===== SLASH =====
  if (i.isChatInputCommand()) {

    if (i.commandName === "panel") {

      if (i.guildId !== GUILD_ID) return;

      const embed = new EmbedBuilder()
        .setTitle("💎 SwiftKey Panel")
        .setDescription(
          "✨ ระบบขายคีย์พรีเมี่ยม\n\n" +
          "1️⃣ เติมเงินก่อน\n" +
          "2️⃣ รอเครดิตเข้า\n" +
          "3️⃣ กด Get Key\n\n" +
          "💖 โดย ปาย"
        )
        .setColor("#ff6ec7");

      await i.reply({
        embeds: [embed],
        components: [panel()]
      });
    }

    // ===== ADD KEY =====
    if (i.commandName === "addkey") {

      if (i.user.id !== OWNER_ID)
        return i.reply({ content: "❌ ไม่มีสิทธิ์", ephemeral: true });

      const key = i.options.getString("key");

      const keys = load(files.keys);

      keys[Date.now()] = key;

      save(files.keys, keys);

      i.reply({ content: "✅ เพิ่มคีย์แล้ว", ephemeral: true });
    }
  }

  // ===== BUTTON =====
  if (i.isButton()) {

    const users = load(files.users);

    if (!users[i.user.id])
      users[i.user.id] = { credit: 0 };

    // ----- TOPUP -----
    if (i.customId === "topup") {

      const modal = new ModalBuilder()
        .setCustomId("walletmodal")
        .setTitle("💰 เติมเงิน");

      const input = new TextInputBuilder()
        .setCustomId("walleturl")
        .setLabel("ลิงก์ซองวอเล็ต")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return i.showModal(modal);
    }

    // ----- BALANCE -----
    if (i.customId === "balance") {

      await i.reply({
        content: `💖 เครดิตคุณ: ${users[i.user.id].credit} บาท`,
        ephemeral: true
      });
    }

    // ----- HOWTO -----
    if (i.customId === "howto") {

      await i.reply({
        content:
          "📖 วิธีใช้งาน\n\n" +
          "1️⃣ เติมเงิน\n" +
          "2️⃣ รอเครดิต\n" +
          "3️⃣ กด Get Key\n\n" +
          "⚠️ ต้องเติมก่อนถึงใช้ได้",
        ephemeral: true
      });
    }

    // ----- GET KEY -----
    if (i.customId === "getkey") {

      if (users[i.user.id].credit < KEY_PRICE)
        return i.reply({
          content: "⚠️ เครดิตไม่พอ กรุณาเติมก่อนนะคะ 💕",
          ephemeral: true
        });

      const keys = load(files.keys);
      const ids = Object.keys(keys);

      if (ids.length === 0)
        return i.reply({
          content: "❌ คีย์หมดแล้ว",
          ephemeral: true
        });

      const id = ids[0];
      const key = keys[id];

      delete keys[id];

      users[i.user.id].credit -= KEY_PRICE;

      save(files.keys, keys);
      save(files.users, users);

      try {
        await i.user.send(`🔑 คีย์ของคุณ:\n\n${key}`);
      } catch {}

      await i.reply({
        content: "✅ ส่งคีย์ไปทาง DM แล้ว 💖",
        ephemeral: true
      });
    }
  }

  // ===== MODAL =====
  if (i.type === InteractionType.ModalSubmit) {

    if (i.customId === "walletmodal") {

      const url = i.fields.getTextInputValue("walleturl");

      await i.reply({
        content: "⏳ กำลังตรวจซอง...",
        ephemeral: true
      });

      const amount = await checkWallet(url);

      if (!amount)
        return i.editReply({
          content: "❌ ตรวจไม่ผ่าน กรุณาลองใหม่"
        });

      const users = load(files.users);

      if (!users[i.user.id])
        users[i.user.id] = { credit: 0 };

      users[i.user.id].credit += amount;

      save(files.users, users);

      // Give Role
      const member = await i.guild.members.fetch(i.user.id);
      await member.roles.add(ROLE_ID).catch(() => {});

      // Log
      const ch = await client.channels.fetch(LOG_CHANNEL);

      const now = new Date();

      ch.send(
        `✅ <@${i.user.id}> เติมเงินสำเร็จ\n` +
        `💰 ${amount} บาท\n` +
        `📅 ${now.toLocaleString("th-TH")}`
      );

      i.editReply({
        content: `🎉 เติมสำเร็จ +${amount} บาท 💖`
      });
    }
  }
});

// ================= START =================

client.login(TOKEN);
