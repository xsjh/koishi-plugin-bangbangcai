import { Context, Schema, segment, h } from "koishi";
import fs from "fs";
import path from "path";
import { Jimp } from "jimp"; // 引入 Jimp 库进行图像处理

export const name = "azi-bangdream-cck";

export interface Config {
  phrase_timeout: string[];
  phrase_answered: string[];
  phrase_bzd: string[];
  card_path: string;
}

export const Config: Schema<Config> = Schema.object({
  card_path: Schema.string()
    .description("卡面图片存放路径")
    .default("D:\\bbcimg\\card"),
  phrase_timeout: Schema.array(String)
    .role("table")
    .description("超时结束时提示：")
    .default(["60秒到了~答案是："]),
  phrase_answered: Schema.array(String)
    .role("table")
    .description("回答正确时时提示：")
    .default(["不赖，你还懂"]),
  phrase_bzd: Schema.array(String)
    .role("table")
    .description("不知道时提示：")
    .default(["游戏结束，这是："]),
});

export const usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>
<h2>卡面图片来源于「bestdori.com」</h2>
<h3>！！！注意！！！</h3>
<h3>此版本只能在单个群聊进行单次游戏进程！否则仍有问题</h3>
<h3>若需要多个群聊使用,请使用koishi克隆功能+过滤器</h3>
<h3>Notice</h3> 
偶尔发不出来图大概率是cetcode:1200,一直发不出来可能是某些依赖没更新
<h3>Requirement</h3>
1、lib文件内应有all.5.json和nickname.json两个json文件</br>
2、卡面存放路径可更改,默认在D盘创建
<h3>Version</h3>
1.0.2</br>
解决了定时器问题导致多次发送错误答案</br>
<h3>Thanks</h3>
开发过程中参考插件koishi-plugin-cck (作者kumoSleeping)</br>
【P.S】自用插件,多个群聊多进程实现方式暂时懒得写,实现方式大概想了下：</br>
可以把监听器放在主逻辑一直开着，每次监听到消息都与数据库里的进程比对即可</br>
定时器也可以放在主逻辑进行定时删除。</br>
<h4>如果想继续开发优化本插件的欢迎</h4>
`;

// 前置
// 声明必需依赖
export const inject = {
  required: ["database"],
  optional: ["assets"],
};

// 延迟等待方法
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 下载图片并存储二进制数据到数据库
async function downloadImage(
  ctx: Context,
  imageUrl: string,
  maxRetries = 2, // 下载图片的最大重试次数
  retryDelay = 2000 // 重试间隔时间
): Promise<Buffer | null> {
  let attempt = 0; // 下载尝试次数
  while (attempt <= maxRetries) {
    try {
      // 使用ctx.http获取图片的二进制数据，返回ArrayBuffer
      const responseData = await ctx.http.get<ArrayBuffer>(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
          Referer: "https://bestdori.com/",
        },
      });
      console.log(`图片请求成功，大小: ${responseData.byteLength} 字节`);
      console.log(
        `图片二进制数据的前10个字节:`,
        new Uint8Array(responseData, 0, 10)
      ); // 输出前10个字节进日志查看
      const buffer = Buffer.from(responseData); // 将 ArrayBuffer 转换为 Buffer
      return buffer;
    } catch (error) {
      console.error(`第 ${attempt + 1} 次下载图片失败:`, error);
      attempt++;
      if (attempt > maxRetries) {
        console.error(`下载图片失败，已达到最大重试次数 (${maxRetries} 次)`);
        return null;
      }
      // 等待重试间隔时间
      console.log(`等待 ${retryDelay / 1000} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  return null; // 所有重试都失败返回null
}

// 随机裁剪图像方法
async function randomCropImage(
  ctx: Context,
  userId: string,
  guildId: string | null,
  cutWidth: number,
  cutLength: number,
  folderPath: string
): Promise<void> {
  try {
    const records = await ctx.database.get("bangguess_user", {
      userId,
      guildId: guildId || null,
    });
    if (records.length === 0 || !records[0].card) {
      throw new Error("未找到图片数据");
    }
    const imageData = records[0].card; // 获取图片二进制数据
    const imageBuffer = Buffer.from(imageData); // 确保是 Buffer 类型
    // 创建文件夹路径
    const userFolder = path.join(folderPath, `${userId}_${guildId || ""}`);
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    // 保存原始图片到文件夹中
    const originalImagePath = path.join(userFolder, "res.png");
    await fs.promises.writeFile(originalImagePath, imageBuffer);
    console.log(`原始图片已保存到: ${originalImagePath}`);
    // 使用 Jimp 读取图片
    const image = await Jimp.read(imageBuffer);
    for (let i = 1; i <= 3; i++) {
      // 随机计算矩形的起始坐标
      const x = Math.floor(Math.random() * (image.bitmap.width - cutWidth));
      const y = Math.floor(Math.random() * (image.bitmap.height - cutLength));
      // 裁剪图片
      const croppedImage = image
        .clone()
        .crop({ x: x, y: y, w: cutWidth, h: cutLength });
      // 强制转换为模板字符串类型（否则write方法无法使用）
      const croppedImagePath = path.join(
        userFolder,
        `cropped_image_${i}.png`
      ) as `${string}.${string}`;
      await croppedImage.write(croppedImagePath); // 保存文件
      console.log(`图像裁剪完成，保存为：${croppedImagePath}`);
    }
    console.log("所有裁切图片已成功保存");
  } catch (error) {
    console.error("裁剪图像时出错:", error);
    return;
  }
}

// 随机读取卡面json的方法
async function readJson(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf8"); // 异步读取文件
    const parsedData = JSON.parse(data); // 解析 JSON 数据
    const keys = Object.keys(parsedData); // 获取所有键
    // 随机选择一个键并返回相应的资源数据
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const characterData = parsedData[randomKey];
    console.error("json随机键:", randomKey);
    console.error("获得的随机characterData:", characterData);
    // 获取 resourceSetName 和 characterId
    const resourceSetName = characterData.resourceSetName;
    const characterId = characterData.characterId;
    console.error("此键resourceSetName:", resourceSetName);
    console.error("此键characterId:", characterId);
    return { resourceSetName, characterId }; // 返回相关数据
  } catch (error) {
    console.error("读取 JSON 文件时出错:", error);
    return null; // 如果出错，返回 null
  }
}

// 读取 nickname.json 文件并根据 characterId 获取对应的昵称列表方法
async function readJson_nickname(nick_filePath, characterId) {
  try {
    // 异步读取 JSON 文件
    const data = await fs.promises.readFile(nick_filePath, "utf8");
    const parsedData = JSON.parse(data); // 解析 JSON 数据
    // 查找对应的 characterId
    const nicknames = parsedData[characterId]; // 通过 characterId 查找对应的昵称
    // console.log('角色名', nicknames);
    // 如果找到了该 ID 对应的昵称数组，返回该数组，否则返回一个空数组
    if (nicknames) {
      return nicknames; // 返回该 characterId 对应的所有昵称
    } else {
      console.error(`未找到对应的 characterId: ${characterId} 的昵称`);
      return []; // 如果没有找到对应的昵称，返回一个空数组
    }
  } catch (error) {
    console.error("读取 JSON 文件时出错:", error);
    return [];
  }
}

//声明数据表
declare module "koishi" {
  interface Tables {
    bangguess_user: Bangguess_user;
  }
}
//表的接口类型
export interface Bangguess_user {
  id: number;
  platform: string;
  userId: string;
  guildId: string;
  time: Date;
  img_url: string;
  card: Buffer;
  h_card: Buffer;
}

//主逻辑
export async function apply(ctx: Context, config: Config) {
  // 创建user数据表
  try {
    ctx.model.extend(
      "bangguess_user",
      {
        // 各字段类型
        id: "unsigned",
        platform: "string",
        userId: "string",
        guildId: "string",
        time: "timestamp",
        img_url: "string",
        card: "binary",
        h_card: "binary",
      },
      {
        // 使用自增的主键值
        autoInc: true,
        unique: [["platform", "userId", "guildId"]],
      }
    );
    console.log("数据表创建成功：bangguess_user");
  } catch (error) {
    console.error("数据表创建出错", error);
  }

  //初始化（重启插件的时候进行的初始化）
  let isGameStarted = false; // 判断游戏是否开始
  // 清空表里的所有数据
  try {
    await ctx.database.remove("bangguess_user", {});
    console.log("bangguess_user 表数据已清空");
  } catch (error) {
    console.error("清空数据表时出错", error);
  }

  // 故障重启指令
  ctx.command("bbc重开", "bbc数据库清理").action(async ({ session }) => {
    const { guildId } = session;
    try {
      await ctx.database.remove("bangguess_user", { guildId });
      await session.send(`群聊${guildId}数据库已清理，请重开游戏！`);
      console.log(`群聊 ${guildId} 的数据已被清理`);
    } catch (error) {
      console.error(`清理群聊 ${guildId} 数据时出错`, error);
      await session.send(`清理数据失败，请稍后再试`);
    }
  });

  // 游戏结束后清除对应用户群聊数据库方法
  async function clearGameSession(ctx, guildId, userId) {
    try {
      if (guildId) {
        await ctx.database.remove("bangguess_user", { guildId });
        console.log(`已删除群聊 ${guildId} 中的所有记录`);
      } else {
        await ctx.database.remove("bangguess_user", { userId });
        console.log(`已删除用户 ${userId} 的记录`);
      }
    } catch (error) {
      console.error("删除数据库记录时出错:", error);
    }
  }

  // 定义 "开始游戏" 命令,启动监听
  ctx.command("bbc", "BanG Dream猜猜卡面！").action(async ({ session }) => {
    try {
      const { userId, guildId } = session;
      // 判断是否重复进行，若无往数据库增加当前用户的数据
      try {
        const existingGames = await ctx.database.get("bangguess_user", {
          $or: [{ userId }, { guildId: guildId || null }],
        });
        if (existingGames.length > 0) {
          session.send(
            '当前已有游戏进行中~输入bzd可以结束当前游戏\n(如遇到故障可输入"bbc重开"清理数据库)'
          );
          return;
        } else {
          const data = {
            platform: session.platform,
            userId: session.userId,
            guildId: session.guildId || "", // 根据需要处理 guildId 是否为空
            time: new Date(),
          };
          await ctx.database.create("bangguess_user", data);
        }
      } catch (error) {
        console.error("插入数据时出错：", error);
        session.send("游戏启动失败，请稍后重试。");
      }

      // 设置游戏开始标志
      isGameStarted = true;

      // 1. 读取 JSON 文件，获取随机角色信息
      const jsonFilePath = path.join(__dirname, "all.5.json"); // JSON 文件路径
      console.log("读取的json文件位置：", jsonFilePath);
      const jsonData = await readJson(jsonFilePath);// 调用 readJson 方法来获取随机角色的resourceSetName, characterId
      if (!jsonData) {
        session.send("读取角色数据失败，请检查 JSON 文件");
        return;
      }
      const { resourceSetName, characterId } = jsonData;
      const nicknameFilePath = path.join(__dirname, "nickname.json"); // //读取nickname
      let nicknames = await readJson_nickname(nicknameFilePath, characterId);
      console.log(`角色ID: ${characterId} 的所有昵称:`, nicknames);
      
      // 2. 构造图片 URL
      const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
      console.log(`选中的角色ID: ${characterId}`);
      console.log(`图片链接: ${imageUrl}`);
      try {
        await ctx.database.set(
          "bangguess_user",
          { userId, guildId: guildId || null },
          { img_url: imageUrl }
        );
        console.log("图片 URL 已成功更新到数据库");
      } catch (error) {
        console.error("更新图片 URL 到数据库时出错:", error);
        await session.send("存储图片 URL 到数据库失败，请稍后重试。");
        return;
      } // 更新数据库中的 img_url 字段

      // 3. 下载图片
      session.send("图片加载中请稍等...");
      const Buffer = await downloadImage(ctx, imageUrl);
      if (!Buffer) {
        await session.send("图片下载失败，请检查网络或重新开始游戏！");
        return;
      }

      // 4. 将二进制编码存储到数据库的 card 字段
      try {
        await ctx.database.set(
          "bangguess_user",
          { userId, guildId: guildId || null },
          { card: Buffer }
        );
        console.log("图片 URL 已成功更新到数据库");
      } catch (error) {
        console.error("更新图片 URL 到数据库时出错:", error);
        await session.send("存储图片 URL 到数据库失败，请稍后重试。");
        return;
      }

      // 5.调用randomCropImage进行裁剪
      const imageSegments = []; // 初始化图片消息段数组
      try {
        const folderPath = path.join(config.card_path, "images"); // 图片保存路径
        const cutWidth = 200; // 裁剪宽度
        const cutLength = 150; // 裁剪高度
        await randomCropImage(
          ctx,
          userId,
          guildId,
          cutWidth,
          cutLength,
          folderPath
        );
        const textMessage = "时间60秒~猜猜我是谁：";// 发送图片之前加一行文字并添加到数组
        imageSegments.push(textMessage);
        for (let i = 1; i <= 3; i++) {
          const croppedImagePath = path.join(
            folderPath,
            `${userId}_${guildId || ""}`,
            `cropped_image_${i}.png`
          );// 遍历裁切好的三张图片，将每个图片添加到消息段数组
          if (fs.existsSync(croppedImagePath)) {
            imageSegments.push(segment.image(`file://${croppedImagePath}`));
          } else {
            console.error(`裁剪后的图片不存在: ${croppedImagePath}`);
          }
        }
        const remind_Message = "(如遇到重复题目请输入 bbc重开 清理数据库)";
        imageSegments.push(remind_Message);
        await delay(1000); //等1秒
      } catch (error) {
        return "裁剪失败，请检查日志。";
      }
      try {
        if (guildId) {
          ctx.bots[0].broadcast([`${guildId}`], imageSegments);
        } else {
          ctx.bots[0].broadcast([`private:${userId}`], imageSegments);
        }// 发送裁剪好的图片消息段
        console.log("裁剪图片发往：", userId, guildId);
      } catch (error) {
        console.error("发送图片消息时出错:", error);
      }

      // 如果没有捕获错误，继续执行后续逻辑
      console.log("游戏继续进行...");

      
      // 6. 监听用户输入的消息[ctx.on()会返回dispose函数，调用即可取消监听]
      let countdownTimer: NodeJS.Timeout | null = null;// 定义一个标志变量，用于判断倒计时是否已设置
      const dispose = ctx.on("message", async (session) => {
        if (!isGameStarted) {
          dispose();
          return;
        } // 如果游戏未开始，直接返回
        let userInput = session.content.trim(); // 获取用户输入的消息内容并去除前后空格
        const userId = session.userId;
        const guildId = session.guildId;
        console.log(
          "游戏开始后用户",
          userId,
          "在",
          guildId,
          "输入:",
          userInput
        ); // 打印用户输入的内容进行调试

        // 如果倒计时未设置，则设置倒计时，结束自动发送答案
        if (!countdownTimer) {
          countdownTimer = setTimeout(async () => {
            try {
              const records = await ctx.database.get("bangguess_user", {
                guildId: guildId || null,
              });
              if (records.length === 0 || !records[0].card) {
                console.error("倒计时结束方法未找到用户记录或二进制数据");
                await session.send(
                  "数据库出错，请输入【bbc重开】清理数据库后即可重新开始游戏！"
                );
                return;
              }
              const imageData = records[0].card; // 获得图片二进制数据
              const to_url = records[0].img_url; // 获得图片url
              const message = [
                `${config.phrase_timeout}${nicknames[7]}`,
                to_url,
                h.image(imageData, "image/png"), // 使用 h.image() 发送图片
              ].join("\n");
              await session.send(message);
              console.log("超时游戏结束消息发给了", guildId, userId);
            } catch (error) {
              console.error("发送消息或图片时出错:", error);
            } finally {
              console.log("弃置监听器");
              isGameStarted = false;
              dispose();
            }
          }, 60000);
        }

        //bbc重开则弃置监听器
        if (userInput === "bbc重开") {
          clearTimeout(countdownTimer); // 取消倒计时
          countdownTimer = null; // 重置倒计时标志
          dispose();// 弃置监听器
          return;
        }

        //用户输入bzd发送答案
        if (userInput.toLowerCase() === "bzd") {
          clearTimeout(countdownTimer); // 取消倒计时
          countdownTimer = null; // 重置倒计时标志
          const userId = session.userId;
          const guildId = session.guildId;
          try {
            const records = await ctx.database.get("bangguess_user", {
              guildId: guildId || null,
            });
            if (records.length === 0 || !records[0].card) {
              console.error("未找到用户记录或二进制数据");
              await session.send(
                "未找到图片数据，若有需要请输入【bbc重开】清理数据库后即可重新开始游戏！"
              );
              return;
            }
            const imageData = records[0].card; // 获取第一条记录的二进制数据
            try {
              const message = [
                `${config.phrase_bzd}${nicknames[7]}`,
                h.image(imageData, "image/png"), // 使用 h.image() 发送图片
              ].join("\n");
              await session.send(message);
            } catch {
              await session.send("答案图片发送失败");
            }
            console.log("bzd游戏结束消息发给了", userId, userInput);
          } catch (error) {
            console.error("发送消息或图片时出错:", error);
          } finally {
            isGameStarted = false;
            await clearGameSession(ctx, guildId, userId);
            dispose();
          }
        }

        if (nicknames.some((nickname) => userInput === nickname)) {
          // @用户并发送答案
          clearTimeout(countdownTimer); // 取消倒计时
          countdownTimer = null; // 重置倒计时标志
          const userId = session.userId;
          const guildId = session.guildId;
          try {
            const records = await ctx.database.get("bangguess_user", {
              guildId: guildId || null,
            });
            if (records.length === 0 || !records[0].img_url) {
              console.error("未找到用户记录或 img_url 数据");
              await session.send(
                "未找到图片数据，您可能在其他群有游戏进程，若有需要请输入【bbc重开】清理数据库后即可重新开始游戏！"
              );
              return;
            }
            const img_url = records[0].img_url; // 获取第一条记录的 img_url
            const imageData = records[0].card; // 获取第一条记录的二进制数据
            const message_y = [`正确，${nicknames[7]}:`, img_url];
            await session.send(message_y);
            try {
              const message = [
                `${h('at', { id: session.userId })} ${config.phrase_answered}${userInput}`,
                h.image(imageData, "image/png"),
                "游戏结束", // 使用 h.image() 发送图片
              ].join("\n");
              await session.send(message);
            } catch {
              await session.send("答案图片发送失败，可以点击url查看原图");
            }
            console.log("回答正确消息发送至：", userId, userInput);
          } catch (error) {
            console.error("发送消息时出错:", error);
          } finally {
            isGameStarted = false;
            await clearGameSession(ctx, guildId, userId);
            dispose();
          }
        }
      });
    } catch (error) {
      console.error("游戏执行过程中出错:", error);
      session.send("执行游戏时出错，请查看日志");
    }
  });
}
