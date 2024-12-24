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
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_jimp = require("jimp");
var name = "azi-bangdream-cck";
var Config = import_koishi.Schema.object({
  card_path: import_koishi.Schema.string().description("卡面图片存放路径").default("D:\\bbcimg\\card"),
  croppedcard_path: import_koishi.Schema.string().description("裁切好的卡面存放路径").default("D:\\bbcimg\\handle"),
  phrase_timeout: import_koishi.Schema.array(String).role("table").description("超时结束时提示：").default(["60秒到了~答案是："]),
  phrase_answered: import_koishi.Schema.array(String).role("table").description("回答正确时时提示：").default(["不赖，你还懂"]),
  phrase_bzd: import_koishi.Schema.array(String).role("table").description("不知道时提示：").default(["游戏结束，这是："])
});
var usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>
<h2>卡面图片来源于「bestdori.com」</h2>
<h4>Notice！</h4>
开发过程中，如遇bug请根据提示清除数据库并重开游戏！</br>
目前只有本地环境平台onebot测试运行过，不保证其余方式成功运行
<h4>Thanks</h4>
开发过程中参考插件koishi-plugin-cck (作者kumoSleeping)
`;
var inject = {
  required: ["database"],
  optional: ["assets"]
};
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(delay, "delay");
async function downloadImage(ctx, imageUrl, filePath) {
  try {
    await delay(3e3);
    const responseData = await ctx.http.get(imageUrl, {
      responseType: "arraybuffer",
      // 确保返回二进制数据
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        "Referer": "https://bestdori.com/"
      }
    });
    const buffer = Buffer.from(responseData);
    import_fs.default.writeFileSync(filePath, buffer);
    console.log("图片下载成功:", filePath);
  } catch (error) {
    console.error("下载图片失败:", error);
    throw error;
  }
}
__name(downloadImage, "downloadImage");
async function randomCropImage(inputImagePath, cut_width, cut_length, c_filePath) {
  try {
    const image = await import_jimp.Jimp.read(inputImagePath);
    for (let i = 1; i <= 3; i++) {
      const x = Math.floor(Math.random() * (image.bitmap.width - cut_width));
      const y = Math.floor(Math.random() * (image.bitmap.height - cut_length));
      const croppedImage = image.clone().crop({ x, y, w: cut_width, h: cut_length });
      const folderPath = import_path.default.resolve(c_filePath);
      const outputFilePath = import_path.default.join(folderPath, `cropped_image_${i}.png`);
      await croppedImage.write(outputFilePath);
      console.log(`图像裁剪完成，保存为：${outputFilePath}`);
    }
  } catch (error) {
    console.error("处理图像时出错:", error);
  }
}
__name(randomCropImage, "randomCropImage");
async function readJson(filePath) {
  try {
    const data = await import_fs.default.promises.readFile(filePath, "utf8");
    const parsedData = JSON.parse(data);
    const keys = Object.keys(parsedData);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const characterData = parsedData[randomKey];
    console.error("json随机键:", randomKey);
    console.error("获得的随机characterData:", characterData);
    const resourceSetName = characterData.resourceSetName;
    const characterId = characterData.characterId;
    console.error("此键resourceSetName:", resourceSetName);
    console.error("此键characterId:", characterId);
    return { resourceSetName, characterId };
  } catch (error) {
    console.error("读取 JSON 文件时出错:", error);
    return null;
  }
}
__name(readJson, "readJson");
async function readJson_nickname(nick_filePath, characterId) {
  try {
    const data = await import_fs.default.promises.readFile(nick_filePath, "utf8");
    const parsedData = JSON.parse(data);
    const nicknames = parsedData[characterId];
    console.error("角色名", nicknames);
    if (nicknames) {
      return nicknames;
    } else {
      console.error(`未找到对应的 characterId: ${characterId} 的昵称`);
      return [];
    }
  } catch (error) {
    console.error("读取 JSON 文件时出错:", error);
    return [];
  }
}
__name(readJson_nickname, "readJson_nickname");
function apply(ctx, config) {
  try {
    ctx.model.extend("bangguess_user", {
      // 各字段类型
      id: "unsigned",
      platform: "string",
      userId: "string",
      guildId: "string",
      time: "timestamp"
    }, {
      // 使用自增的主键值
      autoInc: true,
      // 联合唯一索引
      unique: [["platform", "userId", "guildId"]]
    });
    console.log("数据表创建成功：");
  } catch (error) {
    console.error("数据表创建出错", error);
  }
  const folderPath = import_path.default.resolve(config.card_path);
  const outputPath = import_path.default.resolve(config.croppedcard_path);
  let isGameStarted = false;
  try {
    import_fs.default.mkdirSync(folderPath, { recursive: true });
    console.log("卡面文件夹创建成功：", folderPath);
    import_fs.default.mkdirSync(outputPath, { recursive: true });
    console.log("裁剪文件夹创建成功：", outputPath);
  } catch (error) {
    console.error("创建文件夹时出错", error);
  }
  ctx.database.remove("bangguess_user", {});
  ctx.command("bbc重开", "bbc数据库修复").action(async ({ session }) => {
    const { userId } = session;
    await ctx.database.remove("bangguess_user", { userId });
    await session.send(`用户${userId}数据库已清理，请重开游戏！`);
  });
  ctx.command("bbc", "BanG Dream猜猜卡面！").action(async ({ session }) => {
    try {
      const { userId, guildId } = session;
      try {
        const existingGames = await ctx.database.get("bangguess_user", {
          $or: [
            { userId },
            { guildId: guildId || null }
          ]
        });
        if (existingGames.length > 0) {
          session.send('当前已有游戏进行中~输入bzd可以结束当前游戏\n(如遇到故障可输入"bbc重开"清理数据库)');
          return;
        } else {
          const data = {
            platform: session.platform,
            userId: session.userId,
            guildId: session.guildId || "",
            // 根据需要处理 guildId 是否为空
            time: /* @__PURE__ */ new Date()
          };
          await ctx.database.create("bangguess_user", data);
        }
      } catch (error) {
        console.error("插入数据时出错：", error);
        session.send("游戏启动失败，请稍后重试。");
      }
      isGameStarted = true;
      const jsonFilePath = import_path.default.join(__dirname, "all.5.json");
      console.log("读取的json文件位置：", jsonFilePath);
      const jsonData = await readJson(jsonFilePath);
      if (!jsonData) {
        session.send("读取角色数据失败，请检查 JSON 文件");
        return;
      }
      const { resourceSetName, characterId } = jsonData;
      const nicknameFilePath = import_path.default.join(__dirname, "nickname.json");
      let nicknames = await readJson_nickname(nicknameFilePath, characterId);
      console.log(`角色ID: ${characterId} 的所有昵称:`, nicknames);
      const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
      console.log(`选中的角色ID: ${characterId}`);
      console.log(`图片链接: ${imageUrl}`);
      session.send("图片加载中请稍等...");
      let imagePath = import_path.default.join(folderPath, "res.png");
      await downloadImage(ctx, imageUrl, imagePath);
      if (import_fs.default.existsSync(imagePath)) {
      } else {
        session.send("图片下载失败，请重新开始游戏！");
        return;
      }
      const cutWidth = 200;
      const cutLength = 150;
      const imageSegments = [];
      try {
        import_fs.default.mkdirSync(outputPath, { recursive: true });
        console.log("裁剪输出文件夹创建成功：", outputPath);
      } catch (error) {
        console.error("创建裁剪输出文件夹时出错", error);
      }
      try {
        let cut_filePath = import_path.default.join(outputPath);
        await randomCropImage(imagePath, cutWidth, cutLength, cut_filePath);
        const textMessage = "时间60秒~猜猜我是谁：";
        imageSegments.push(textMessage);
        const files = import_fs.default.readdirSync(outputPath);
        files.forEach(async (file) => {
          const outputImagePath = import_path.default.join(outputPath, file);
          imageSegments.push(import_koishi.segment.image(`file://${outputImagePath}`));
        });
        const remind_Message = "（如遇到重复题目请输入 bbc重开 清理数据库)";
        imageSegments.push(remind_Message);
        await delay(2e3);
        try {
          if (guildId) {
            ctx.bots[0].broadcast([`${guildId}`], imageSegments);
          } else {
            ctx.bots[0].broadcast([`private:${userId}`], imageSegments);
          }
          console.log("裁剪图片发往：", userId, guildId);
        } catch (error) {
          console.error("发送图片消息时出错:", error);
        }
        console.log("游戏继续进行...");
        setInterval(async () => {
          const now = /* @__PURE__ */ new Date();
          const timeoutThreshold = new Date(now.getTime() - 7e4);
          const expiredGames = await ctx.database.get("bangguess_user", {
            time: { $lte: timeoutThreshold }
            // 查询60秒前的记录
          });
          if (expiredGames.length > 0) {
            for (const game of expiredGames) {
              const message = [
                `${config.phrase_timeout}${nicknames[7]}`,
                (0, import_koishi.h)("image", { url: `file://${imagePath}` })
              ].join("\n");
              const message_t = [`${nicknames[7]}:${imageUrl}`];
              const { platform, userId: userId2, guildId: guildId2 } = game;
              console.log("平台与ID：", platform, userId2, guildId2);
              if (guildId2) {
                await ctx.bots[0].broadcast([`${guildId2}`], message_t);
                ctx.bots[0].broadcast([`${guildId2}`], message);
                await ctx.database.remove("bangguess_user", { guildId: guildId2 });
                console.log(`已删除群聊 ${guildId2} 中的所有记录`);
                console.log("超时游戏结束消息发给群聊", guildId2, "的：", userId2);
                dispose();
              } else {
                await ctx.bots[0].broadcast([`${guildId2}`], message_t);
                ctx.bots[0].broadcast([`${guildId2}`], message);
                ctx.bots[0].broadcast([`private:${userId2}`], message);
                await ctx.database.remove("bangguess_user", { userId: userId2 });
                console.log(`已删除用户 ${userId2} 的记录`);
                console.log("超时游戏结束消息发给了私信：", userId2);
                dispose();
              }
              dispose();
            }
            dispose();
          }
        }, 5e3);
        const dispose = ctx.on("message", async (session2) => {
          if (isGameStarted) {
            let userInput = session2.content.trim();
            const userId2 = session2.userId;
            console.log("游戏开始后用户输入:", userInput, userId2);
            if (userInput.toLowerCase() === "bzd") {
              try {
                const message = [
                  `${config.phrase_bzd}${nicknames[7]}`,
                  (0, import_koishi.h)("image", { url: `file://${imagePath}` })
                ].join("\n");
                const message_b = [`是${nicknames[7]}:${imageUrl}`];
                await session2.send(message);
                await session2.send(message_b);
                console.log("bzd游戏结束消息发给了", userId2, userInput);
              } catch (error) {
                console.error("发送消息或图片时出错:", error);
              } finally {
                isGameStarted = false;
                const userId3 = session2.userId;
                try {
                  if (guildId) {
                    await ctx.database.remove("bangguess_user", { guildId });
                    console.log(`已删除群聊 ${guildId} 中的所有记录`);
                  } else {
                    await ctx.database.remove("bangguess_user", { userId: userId3 });
                    console.log(`已删除用户 ${userId3} 的记录`);
                  }
                } catch (error) {
                  console.error("删除数据库记录时出错:", error);
                }
                dispose();
              }
              return;
            }
            if (nicknames.some((nickname) => userInput === nickname)) {
              const message_y = [`正确，${nicknames[7]}:${imageUrl}`];
              await session2.send(message_y);
              const message = `${(0, import_koishi.h)("at", { id: session2.userId })} ${config.phrase_answered} ${userInput} ${(0, import_koishi.h)("image", { url: `file://${imagePath}` })} 
 游戏结束`;
              await session2.send(message);
              isGameStarted = false;
              const userId3 = session2.userId;
              try {
                if (guildId) {
                  await ctx.database.remove("bangguess_user", { guildId });
                  console.log(`已删除群聊 ${guildId} 中的所有记录`);
                } else {
                  await ctx.database.remove("bangguess_user", { userId: userId3 });
                  console.log(`已删除用户 ${userId3} 的记录`);
                }
              } catch (error) {
                console.error("删除数据库记录时出错:", error);
              }
              dispose();
              return;
            }
          }
        });
      } catch (error) {
        return "裁剪失败，请检查日志。";
      }
    } catch (error) {
      console.error("游戏执行过程中出错:", error);
      session.send("执行游戏时出错，请查看日志");
    }
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name,
  usage
});
