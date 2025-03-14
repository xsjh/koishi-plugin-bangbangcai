var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  reusable: () => reusable,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_node_url = __toESM(require("node:url"));
var import_jimp = require("jimp");
var reusable = true;
var name = "bangbangcai";
var inject = {
  required: ["database", "i18n"]
  // optional: ["assets"], // 你也没用到这个啊
};
var usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>

<p>卡面图片来源于 <a href="https://bestdori.com" target="_blank">bestdori.com</a></p>

<div class="notice">
<h3>Notice</h3>
<p>在 Onebot 适配器下，偶尔发不出来图，Koishi 报错日志为 <code>retcode:1200</code> 时，

请查看协议端日志自行解决！</p>
</div>

<hr>

<div class="requirement">
<h3>Requirement</h3>
<p>卡面存放路径可更改，默认在 koishi根目录 创建。</p>
</div>

<hr>

<div class="version">
<h3>Version</h3>
<p>1.0.2</p>
<ul>
<li>解决了定时器问题导致多次发送错误答案。</li>
</ul>
</div>

<hr>

<div class="thanks">
<h3>Thanks</h3>
<p>灵感参考： <a href="https://www.npmjs.com/package/koishi-plugin-cck" target="_blank">koishi-plugin-cck</a></p>

<hr>

<h4>如果想继续开发优化本插件，<a href="https://github.com/xsjh/koishi-plugin-bangbangcai/pulls" target="_blank">欢迎 PR</a></h4>

</body>
`;
var Config = import_koishi.Schema.intersect([
  import_koishi.Schema.object({
    bbc: import_koishi.Schema.string().default("猜猜看").description("`父级指令`名称"),
    bbc_command: import_koishi.Schema.string().default("bbc").description("`游戏开始`的指令名称"),
    bbc_restart_command: import_koishi.Schema.string().default("bbc重开").description("`游戏重新开始`的指令名称"),
    bbc_bzd_command: import_koishi.Schema.string().default("bzd").description("`不知道答案`的指令名称")
  }).description("基础设置"),
  import_koishi.Schema.object({
    textMessage: import_koishi.Schema.string().description("`猜谜`提示语1").default("时间60秒~\n猜猜我是谁："),
    remind_Message: import_koishi.Schema.string().description("`猜谜`提示语2").default("(如遇到重复题目请输入 bbc重开 以清理数据库)"),
    phrase_timeout: import_koishi.Schema.array(String).role("table").description("`超时结束`时 提示：").default(["60秒到了~\n答案是："]),
    phrase_answered: import_koishi.Schema.array(String).role("table").description("`回答正确`时 提示：").default(["不赖，你还懂"]),
    phrase_bzd: import_koishi.Schema.array(String).role("table").description("触发`不知道`时 提示：").default(["游戏结束，这是："])
  }).description("进阶设置"),
  import_koishi.Schema.object({
    nowtimers: import_koishi.Schema.boolean().default(false).description("开启后，触发【bbc】指令之后，立即进入60秒计时<br>关闭后，等待用户 `交互第一条消息后` 才进入计时。"),
    autocleantemp: import_koishi.Schema.boolean().default(true).description("开启后，自动清除`游戏结束的`频道数据。"),
    bbctimeout: import_koishi.Schema.number().default(60).description("游戏持续(计时)的 时长（秒）")
  }).description("交互设置"),
  import_koishi.Schema.object({
    card_path: import_koishi.Schema.string().description("卡面图片数据 (临时)存放路径<br>请填入`文件夹绝对路径`，例如：`D:\\bbcimg\\card`<br>为空时，默认存到`koishi根目录/data/bangbangcai`"),
    cutWidth: import_koishi.Schema.number().default(200).description("卡片剪裁 宽度"),
    cutLength: import_koishi.Schema.number().default(150).description("卡片剪裁 高度")
  }).description("高级设置"),
  import_koishi.Schema.object({
    logger_info: import_koishi.Schema.boolean().default(false).description("日志调试模式")
  }).description("开发者设置")
]);
async function apply(ctx, config) {
  const listeners = {};
  const timers = {};
  ctx.on("ready", async () => {
    try {
      ctx.model.extend(
        "bangguess_user",
        {
          // 各字段类型
          id: "unsigned",
          platform: "string",
          userId: "string",
          channelId: "string",
          time: "timestamp",
          img_url: "string",
          card: "binary",
          gaming: "boolean",
          nicknames: "json"
        },
        {
          // 使用自增的主键值
          autoInc: true,
          unique: [["platform", "channelId"]]
          // userId 从 unique 移除，改为 channelId 维度
        }
      );
    } catch (error) {
      ctx.logger.error("数据表创建出错", error);
    }
    ctx.i18n.define(
      "zh-CN",
      {
        commands: {
          [config.bbc]: {
            description: `邦多利猜猜看（邦邦猜）`,
            messages: {}
          },
          [config.bbc_command]: {
            description: `BanG Dream猜猜卡面！`,
            messages: {
              "aleadygaming": '当前已有游戏进行中~输入"{0}" 可以结束当前游戏\n(如遇到故障可输入 "{1}" 以清理数据库)',
              "errorstart": "游戏启动失败，请稍后重试。",
              "jsonreaderror": "读取角色数据失败，请检查 JSON 文件",
              "failedtocachedata": "存储图片 URL 到数据库失败，请稍后重试。",
              "nowloading": "图片加载中请稍等...",
              "downloaderror": "图片下载失败，请检查网络或重新开始游戏！",
              "dataerror": '数据库出错，请输入 "{0}" 清理数据库后即可重新开始游戏！',
              "imagedataerror": '未找到图片数据，若有需要请输入 "{0}" 以清理数据库，之后重新开始游戏即可！',
              "imgfailedtosend": "答案图片发送失败",
              "runtimeerror": "执行游戏时出错，请查看日志"
            }
          },
          [config.bbc_restart_command]: {
            description: `bbc数据清理，重开！`,
            messages: {
              "restartplz": "群聊 {0} 数据已清理，请重开游戏！",
              "restarterror": "清理数据失败，请稍后再试"
            }
          },
          [config.bbc_bzd_command]: {
            // bzd 指令 i18n
            description: "不知道答案",
            messages: {
              "nogame": "当前没有正在进行的游戏哦~"
            }
          }
        }
      }
    );
    ctx.command(`${config.bbc}`);
    ctx.command(`${config.bbc}/${config.bbc_restart_command}`).action(async ({ session }) => {
      const channelId = session.channelId || "sandbox";
      try {
        await ctx.database.remove("bangguess_user", { channelId });
        await session.send(session.text(".restartplz", [channelId]));
        logInfo(`群聊 ${channelId} 的数据已被清理 (包括正在进行的游戏)`);
      } catch (error) {
        ctx.logger.error(`清理群聊 ${channelId} 数据时出错`, error);
        await session.send(session.text(".restarterror"));
      }
    });
    ctx.command(`${config.bbc}/${config.bbc_bzd_command}`).action(async ({ session }) => {
      const channelId = session.channelId || "sandbox";
      const userId = session.userId;
      try {
        const gameRecord = await ctx.database.get("bangguess_user", { channelId, gaming: true });
        if (gameRecord.length === 0) {
          await session.send(session.text(`commands.${config.bbc_bzd_command}.messages.nogame`));
          return;
        }
        const record = gameRecord[0];
        const imageData = record.card;
        const nicknames = record.nicknames;
        try {
          const message = [
            `${config.phrase_bzd}${nicknames[7]}`,
            import_koishi.h.image(imageData, "image/png")
            // 使用 h.image() 发送图片
          ].join("\n");
          await session.send(message);
        } catch (e) {
          ctx.logger.error("答案图片发送失败:", e);
          await session.send(session.text(`commands.${config.bbc_command}.messages.imgfailedtosend`));
        }
        logInfo("bzd游戏结束消息发给了", userId, channelId);
        await clearGameSession(channelId, userId);
      } catch (error) {
        ctx.logger.error("处理不知道答案指令时出错:", error);
        await session.send(session.text(".runtimeerror"));
      }
    });
    async function clearGameSession(channelId, userId) {
      try {
        if (channelId) {
          const gameRecord = await ctx.database.get("bangguess_user", { channelId, gaming: true });
          if (config.autocleantemp && gameRecord.length > 0) {
            const currentUserId = userId || gameRecord[0].userId;
            const card_path = config.card_path || import_node_path.default.join(ctx.baseDir, "data", "bangbangcai");
            const userFolder = import_node_path.default.join(card_path, "images", `${currentUserId}_${channelId || ""}`);
            try {
              if (import_node_fs.default.existsSync(userFolder)) {
                await import_node_fs.default.promises.rm(userFolder, { recursive: true, force: true });
                logInfo(`已删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹: ${userFolder}`);
              } else {
                logInfo(`未找到用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹，无需删除`);
              }
            } catch (folderDeletionError) {
              ctx.logger.error(`删除用户 ${currentUserId} 在群聊 ${channelId} 的临时图片文件夹时出错:`, folderDeletionError);
            }
            await ctx.database.remove("bangguess_user", { channelId, gaming: true });
            logInfo(`已删除群聊 ${channelId} 的游戏数据 (autocleantemp enabled)`);
          } else {
            await ctx.database.set("bangguess_user", { channelId, gaming: true }, { gaming: false });
            logInfo(`已结束群聊 ${channelId} 的游戏 (autocleantemp disabled, data kept)`);
          }
          if (timers[channelId]) {
            clearTimeout(timers[channelId]);
            delete timers[channelId];
          }
          if (listeners[channelId]) {
            delete listeners[channelId];
            logInfo(`已移除群聊 ${channelId} 的监听器`);
          }
        }
      } catch (error) {
        ctx.logger.error("更新数据库记录时出错:", error);
      }
    }
    __name(clearGameSession, "clearGameSession");
    ctx.command(`${config.bbc}/${config.bbc_command}`).action(async ({ session }) => {
      try {
        const channelId = session.channelId || "sandbox";
        const userId = session.userId || "";
        try {
          const existingGame = await ctx.database.get("bangguess_user", {
            channelId,
            gaming: true
            // 查找 gaming 为 true 的记录
          });
          if (existingGame.length > 0) {
            await session.send(session.text(".aleadygaming", [config.bbc_bzd_command, config.bbc_restart_command]));
            return;
          } else {
            const data = {
              platform: session.platform,
              userId: session.userId,
              channelId: session.channelId || "sandbox",
              // 根据需要处理 channelId 是否为空
              time: /* @__PURE__ */ new Date(),
              gaming: true
              // 设置 gaming 为 true
            };
            await ctx.database.create("bangguess_user", data);
          }
        } catch (error) {
          ctx.logger.error("插入数据时出错：", error);
          await session.send(session.text(".errorstart"));
        }
        const jsonFilePath = import_node_path.default.join(__dirname, "./../resource/all.5.json");
        logInfo("读取的json文件位置：", jsonFilePath);
        const jsonData = await readJson(jsonFilePath);
        if (!jsonData) {
          await session.send(session.text(".jsonreaderror"));
          return;
        }
        const { resourceSetName, characterId } = jsonData;
        const nicknameFilePath = import_node_path.default.join(__dirname, "./../resource/nickname.json");
        let nicknames = await readJson_nickname(nicknameFilePath, characterId);
        logInfo(`角色ID: ${characterId} 的所有昵称:`, nicknames);
        const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
        logInfo(`选中的角色ID: ${characterId}`);
        logInfo(`图片链接: ${imageUrl}`);
        try {
          await ctx.database.set(
            "bangguess_user",
            { channelId: channelId || "sandbox", gaming: true },
            // 查找 gaming 为 true 的记录
            { img_url: imageUrl, nicknames }
            // 保存 nicknames
          );
          logInfo("图片 URL 和 昵称 已成功更新到数据库");
        } catch (error) {
          ctx.logger.error("更新图片 URL 和 昵称 到数据库时出错:", error);
          await session.send(session.text(".failedtocachedata"));
          return;
        }
        await session.send(session.text(".nowloading"));
        const Buffer2 = await downloadImage(imageUrl);
        if (!Buffer2) {
          await session.send(session.text(".downloaderror"));
          return;
        }
        try {
          await ctx.database.set(
            "bangguess_user",
            { channelId: channelId || "sandbox", gaming: true },
            // 查找 gaming 为 true 的记录
            { card: Buffer2 }
          );
          logInfo("图片 二进制数据 已成功更新到数据库");
        } catch (error) {
          ctx.logger.error("更新图片 二进制数据 到数据库时出错:", error);
          await session.send(session.text(".failedtocachedata"));
          return;
        }
        const imageSegments = [];
        try {
          const card_path = config.card_path || import_node_path.default.join(ctx.baseDir, "data", "bangbangcai");
          const folderPath = import_node_path.default.join(card_path, "images");
          const cutWidth = config.cutWidth;
          const cutLength = config.cutLength;
          await randomCropImage(
            userId,
            channelId,
            cutWidth,
            cutLength,
            folderPath
          );
          imageSegments.push(config.textMessage);
          for (let i = 1; i <= 3; i++) {
            const croppedImagePath = import_node_path.default.join(
              folderPath,
              `${userId}_${channelId || ""}`,
              `cropped_image_${i}.png`
            );
            if (import_node_fs.default.existsSync(croppedImagePath)) {
              imageSegments.push(import_koishi.h.image(import_node_url.default.pathToFileURL(croppedImagePath).href));
            } else {
              ctx.logger.error(`裁剪后的图片不存在: ${croppedImagePath}`);
            }
          }
          imageSegments.push(config.remind_Message);
          await delay(1e3);
        } catch (error) {
          ctx.logger.error("裁剪失败:", error);
          return "裁剪失败，请检查日志。";
        }
        try {
          await session.send(imageSegments);
          logInfo("裁剪图片发往：", userId, channelId);
        } catch (error) {
          ctx.logger.error("发送图片消息时出错:", error);
        }
        logInfo("游戏继续进行...");
        const messageListener = /* @__PURE__ */ __name(async (session2) => {
          if (session2.channelId !== channelId) return;
          logInfo(`[Message Listener] 频道 ${channelId} 正在进行游戏, 进入监听`);
          let userInput = session2.stripped.content.trim();
          const userId2 = session2.userId;
          logInfo("游戏开始后 用户 ", userId2, " 在 ", channelId, " 输入: ", userInput);
          if (!timers[channelId] && !config.nowtimers) {
            timers[channelId] = ctx.setTimeout(async () => {
              try {
                const records = await ctx.database.get("bangguess_user", {
                  channelId: channelId || "sandbox",
                  gaming: true
                  // 查找 gaming 为 true 的记录
                });
                if (records.length === 0 || !records[0].card) {
                  ctx.logger.error("倒计时结束方法未找到用户记录或二进制数据");
                  await session2.send(session2.text(`commands.${config.bbc_command}.messages.dataerror`, [config.bbc_restart_command]));
                  return;
                }
                const record = records[0];
                const imageData = record.card;
                const to_url = record.img_url;
                const nicknames2 = record.nicknames;
                const message = [
                  `${config.phrase_timeout}${nicknames2[7]}`,
                  to_url,
                  import_koishi.h.image(imageData, "image/png")
                  // 使用 h.image() 发送图片
                ].join("\n");
                await session2.send(message);
                logInfo("超时游戏结束消息发给了", channelId, userId2);
              } catch (error) {
                ctx.logger.error("发送消息或图片时出错:", error);
              } finally {
                logInfo("超时, 弃置监听器");
                await clearGameSession(channelId, userId2);
              }
            }, config.bbctimeout * 1e3);
          }
          if (nicknames.some((nickname) => userInput === nickname)) {
            if (timers[channelId]?.timer) {
              clearTimeout(timers[channelId].timer);
              delete timers[channelId].timer;
            }
            const userId3 = session2.userId;
            try {
              const records = await ctx.database.get("bangguess_user", {
                channelId: channelId || "sandbox",
                gaming: true
                // 查找 gaming 为 true 的记录
              });
              if (records.length === 0 || !records[0].img_url) {
                ctx.logger.error("未找到用户记录或 img_url 数据");
                await session2.send(session2.text(`commands.${config.bbc_command}.messages.imagedataerror`, [config.bbc_restart_command]));
                return;
              }
              const record = records[0];
              const img_url = record.img_url;
              const imageData = record.card;
              const nicknames2 = record.nicknames;
              const message_y = [`正确，${nicknames2[7]} : `, img_url];
              await session2.send(message_y);
              try {
                const message = [
                  `${import_koishi.h.at(session2.userId)} ${config.phrase_answered}${userInput}`,
                  import_koishi.h.image(imageData, "image/png"),
                  "游戏结束"
                  // 使用 h.image() 发送图片
                ].join("\n");
                await session2.send(message);
              } catch {
                await session2.send(session2.text(`commands.${config.bbc_command}.messages.imgfailedtosend`));
              }
              logInfo("回答正确消息发送至：", userId3, userInput);
            } catch (error) {
              ctx.logger.error("发送消息时出错:", error);
            } finally {
              await clearGameSession(channelId, userId3);
            }
          }
        }, "messageListener");
        const unregister = ctx.on("message", messageListener);
        if (timers[channelId]) {
          timers[channelId].unregisterListener = unregister;
        } else {
          timers[channelId] = { unregisterListener: unregister };
        }
        logInfo(`开始监听群聊 ${channelId} 的消息...`);
        if (config.nowtimers) {
          timers[channelId] = timers[channelId] || {};
          timers[channelId].timer = ctx.setTimeout(async () => {
            try {
              const records = await ctx.database.get("bangguess_user", {
                channelId: channelId || "sandbox",
                gaming: true
                // 查找 gaming 为 true 的记录
              });
              if (records.length === 0 || !records[0].card) {
                ctx.logger.error("倒计时结束方法未找到用户记录或二进制数据");
                await session.send(session.text(`commands.${config.bbc_command}.messages.dataerror`, [config.bbc_restart_command]));
                return;
              }
              const record = records[0];
              const imageData = record.card;
              const to_url = record.img_url;
              const nicknames2 = record.nicknames;
              const message = [
                `${config.phrase_timeout}${nicknames2[7]}`,
                to_url,
                import_koishi.h.image(imageData, "image/png")
                // 使用 h.image() 发送图片
              ].join("\n");
              await session.send(message);
              logInfo("超时游戏结束消息发给了", channelId, userId);
            } catch (error) {
              ctx.logger.error("发送消息或图片时出错:", error);
            } finally {
              logInfo("超时, 弃置监听器");
              await clearGameSession(channelId, userId);
            }
          }, config.bbctimeout * 1e3);
        }
      } catch (error) {
        ctx.logger.error("游戏执行过程中出错:", error);
        await session.send(session.text(".runtimeerror"));
      }
    });
    async function delay(ms) {
      return new Promise((resolve) => ctx.setTimeout(resolve, ms));
    }
    __name(delay, "delay");
    async function downloadImage(imageUrl, maxRetries = 2, retryDelay = 2e3) {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const responseData = await ctx.http.get(imageUrl, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
              Referer: "https://bestdori.com/"
            }
          });
          logInfo(`图片请求成功，大小: ${responseData.byteLength} 字节`);
          logInfo(
            `图片二进制数据的前10个字节:`,
            new Uint8Array(responseData, 0, 10)
          );
          const buffer = Buffer.from(responseData);
          return buffer;
        } catch (error) {
          ctx.logger.error(`第 ${attempt + 1} 次下载图片失败:`, error);
          attempt++;
          if (attempt > maxRetries) {
            ctx.logger.error(`下载图片失败，已达到最大重试次数 (${maxRetries} 次)`);
            return null;
          }
          logInfo(`等待 ${retryDelay / 1e3} 秒后重试...`);
          await new Promise((resolve) => ctx.setTimeout(resolve, retryDelay));
        }
      }
      return null;
    }
    __name(downloadImage, "downloadImage");
    async function randomCropImage(userId, channelId, cutWidth, cutLength, folderPath) {
      try {
        const records = await ctx.database.get("bangguess_user", {
          channelId: channelId || "sandbox",
          gaming: true
          // 查找 gaming 为 true 的记录
        });
        if (records.length === 0 || !records[0].card) {
          ctx.logger.error("未找到图片数据");
          return;
        }
        const imageData = records[0].card;
        const imageBuffer = Buffer.from(imageData);
        const userFolder = import_node_path.default.join(folderPath, `${userId}_${channelId || ""}`);
        if (!import_node_fs.default.existsSync(userFolder)) {
          import_node_fs.default.mkdirSync(userFolder, { recursive: true });
        }
        const originalImagePath = import_node_path.default.join(userFolder, "res.png");
        await import_node_fs.default.promises.writeFile(originalImagePath, imageBuffer);
        logInfo(`原始图片已保存到: ${originalImagePath}`);
        const image = await import_jimp.Jimp.read(imageBuffer);
        for (let i = 1; i <= 3; i++) {
          const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
          const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
          const croppedImage = image.clone().crop({ x, y, w: cutWidth, h: cutLength });
          const croppedImagePath = import_node_path.default.join(userFolder, `cropped_image_${i}.png`);
          await croppedImage.write(croppedImagePath);
          logInfo(`图像裁剪完成，保存为：${croppedImagePath}`);
        }
        logInfo("所有裁切图片已成功保存");
      } catch (error) {
        ctx.logger.error("裁剪图像时出错:", error);
        return;
      }
    }
    __name(randomCropImage, "randomCropImage");
    async function readJson(filePath) {
      try {
        const data = await import_node_fs.default.promises.readFile(filePath, "utf8");
        const parsedData = JSON.parse(data);
        const keys = Object.keys(parsedData);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const characterData = parsedData[randomKey];
        logInfo("json随机键:", randomKey);
        logInfo("获得的随机characterData:", characterData);
        const resourceSetName = characterData.resourceSetName;
        const characterId = characterData.characterId;
        logInfo("此键resourceSetName:", resourceSetName);
        logInfo("此键characterId:", characterId);
        return { resourceSetName, characterId };
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return null;
      }
    }
    __name(readJson, "readJson");
    async function readJson_nickname(nick_filePath, characterId) {
      try {
        const data = await import_node_fs.default.promises.readFile(nick_filePath, "utf8");
        const parsedData = JSON.parse(data);
        const nicknames = parsedData[characterId];
        if (nicknames) {
          return nicknames;
        } else {
          ctx.logger.error(`未找到对应的 characterId: ${characterId} 的昵称`);
          return [];
        }
      } catch (error) {
        ctx.logger.error("读取 JSON 文件时出错:", error);
        return [];
      }
    }
    __name(readJson_nickname, "readJson_nickname");
    function logInfo(...args) {
      if (config.logger_info) {
        ctx.logger.info(...args);
      }
    }
    __name(logInfo, "logInfo");
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  reusable,
  usage
});
