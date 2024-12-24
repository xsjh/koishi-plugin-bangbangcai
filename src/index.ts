import { Context, Schema, segment, h } from 'koishi';
import fs from 'fs';
import path from 'path';
import {Jimp} from 'jimp';// 引入 Jimp 库进行图像处理

export const name = 'azi-bangdream-cck';

export interface Config {
  phrase_timeout: string[];
  phrase_answered: string[];
  phrase_bzd: string[];
  card_path: string;
  croppedcard_path: string;
}

export const Config: Schema<Config> = Schema.object({
  card_path: Schema.string().description("卡面图片存放路径").default("D:\\bbcimg\\card"),
  croppedcard_path: Schema.string().description("裁切好的卡面存放路径").default("D:\\bbcimg\\handle"),
  phrase_timeout: Schema.array(String).role('table').description("超时结束时提示：").default(['60秒到了~答案是：']),
  phrase_answered: Schema.array(String).role('table').description("回答正确时时提示：").default(['不赖，你还懂']),
  phrase_bzd: Schema.array(String).role('table').description("不知道时提示：").default(['游戏结束，这是：']),
});

export const usage = `
<h1>邦多利猜猜看（邦邦猜）</h1>
<h2>卡面图片来源于「bestdori.com」</h2>
<h4>Notice！</h4>
测试版，如遇bug请根据提示清除数据库并重开游戏！</br>
目前只有本地环境onebot平台测试运行过，不保证其余方式成功运行
<h4>Thanks</h4>
开发过程中参考插件koishi-plugin-cck (作者kumoSleeping)
`


//前置
// 声明必需依赖
export const inject = {
  required: ['database'],
  optional: ['assets']
};

// 延迟等待方法
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 下载图片方法
async function downloadImage(ctx: Context, imageUrl: string, filePath: string): Promise<void> {
  try {
    await delay(3000);
    // 使用 ctx.http 获取图片的二进制数据，返回的是 ArrayBuffer
    const responseData = await ctx.http.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer', // 确保返回二进制数据
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        "Referer": "https://bestdori.com/",
      },
    });
    // 将 ArrayBuffer 转换为 Buffer(否则会导致writeFileSync无法写入)
    const buffer = Buffer.from(responseData);
    // 将数据写入文件
    fs.writeFileSync(filePath, buffer);
    console.log('图片下载成功:', filePath);
  } catch (error) {
    console.error('下载图片失败:', error);
    throw error;
  }
}

// 随机裁剪图像方法
async function randomCropImage(inputImagePath: string, cut_width: number, cut_length: number, c_filePath: string) {
  try {
    const image = await Jimp.read(inputImagePath);
    for (let i = 1; i <= 3 ; i++){
    // 随机计算矩形的起始坐标
    const x = Math.floor(Math.random() * (image.bitmap.width - cut_width));
    const y = Math.floor(Math.random() * (image.bitmap.height - cut_length));
    // 裁剪图片
    const croppedImage = image.clone().crop({ x: x, y: y, w: cut_width, h: cut_length });
    // 使用 path.resolve 来生成 'handle' 文件夹的绝对路径
    const folderPath = path.resolve(c_filePath);
    // 强制转换为模板字符串类型（否则write方法无法使用）
    const outputFilePath = path.join(folderPath, `cropped_image_${i}.png`) as `${string}.${string}`; 
    await croppedImage.write(outputFilePath);  // 保存文件
    console.log(`图像裁剪完成，保存为：${outputFilePath}`);
    }
  } catch (error) {
    console.error('处理图像时出错:', error);
  }
}

// 随机读取卡面json的方法
async function readJson(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8'); // 异步读取文件
    const parsedData = JSON.parse(data); // 解析 JSON 数据
    const keys = Object.keys(parsedData); // 获取所有的键

    // 随机选择一个键并返回相应的资源数据
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const characterData = parsedData[randomKey];
    console.error('json随机键:', randomKey);
    console.error('获得的随机characterData:', characterData);

    // 获取 resourceSetName 和 characterId
    const resourceSetName = characterData.resourceSetName;
    const characterId = characterData.characterId;
    console.error('此键resourceSetName:', resourceSetName);
    console.error('此键characterId:', characterId);

    return { resourceSetName, characterId }; // 返回相关数据
  } catch (error) {
    console.error('读取 JSON 文件时出错:', error);
    return null; // 如果出错，返回 null
  }
}

// 读取 nickname.json 文件并根据 characterId 获取对应的昵称列表方法
async function readJson_nickname(nick_filePath, characterId) {
  try {
    // 异步读取 JSON 文件
    const data = await fs.promises.readFile(nick_filePath, 'utf8');
    const parsedData = JSON.parse(data); // 解析 JSON 数据
    
    // 查找对应的 characterId
    const nicknames = parsedData[characterId]; // 通过 characterId 查找对应的昵称
    console.error('角色名', nicknames);

    // 如果找到了该 ID 对应的昵称数组，返回该数组，否则返回一个空数组
    if (nicknames) {
      return nicknames; // 返回该 characterId 对应的所有昵称
    } else {
      console.error(`未找到对应的 characterId: ${characterId} 的昵称`);
      return []; // 如果没有找到对应的昵称，返回一个空数组
    }
  } catch (error) {
    console.error('读取 JSON 文件时出错:', error);
    return [];
  }
}

//声明数据表
declare module 'koishi' {
  interface Tables {
    bangguess_user: Bangguess_user
  }
}
//表的接口类型
export interface Bangguess_user {
  id: number,
  platform: string,
  userId: string,
  guildId: string,
  time: Date,
}



//主逻辑
export function apply(ctx: Context, config:Config) {

  // 创建user数据表
  try{ctx.model.extend('bangguess_user', {
    // 各字段类型
    id: 'unsigned',
    platform: 'string',
    userId: 'string',
    guildId: 'string',
    time: 'timestamp',
  }, {
    // 使用自增的主键值
    autoInc: true,
    // 联合唯一索引
    unique: [['platform', 'userId', 'guildId']],
  })
  console.log('数据表创建成功：');
} catch (error) {
  console.error('数据表创建出错', error);
}

  
//初始化
  // 定义文件夹路径和固定图片 URL
  const folderPath = path.resolve(config.card_path);
  const outputPath = path.resolve(config.croppedcard_path);
  let isGameStarted = false; // 判断游戏是否开始
  // 尝试创建文件夹
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log('卡面文件夹创建成功：', folderPath);
    fs.mkdirSync(outputPath, { recursive: true });
    console.log('裁剪文件夹创建成功：', outputPath);
  } catch (error) {
    console.error('创建文件夹时出错', error);
  }
  //清空user表里所有数据
  ctx.database.remove('bangguess_user', {});





  
  //故障重启指令
  ctx.command('bbc重开', 'bbc数据库修复').action(async ({ session }) => {
    const { userId } = session;
    await ctx.database.remove('bangguess_user', { userId });
    await session.send(`用户${userId}数据库已清理，请重开游戏！`)
  })

  


  // 定义 "开始游戏" 命令
  ctx.command('bbc','BanG Dream猜猜卡面！').action(async ({ session }) => {
    try{

      const { userId, guildId } = session;
  // 判断是否重复进行，若无往数据库增加当前用户的数据
      try {
        const existingGames = await ctx.database.get('bangguess_user', {
          $or: [
            { userId },
            { guildId: guildId || null },
          ],
        });
        if (existingGames.length > 0) {
          session.send('当前已有游戏进行中~输入bzd可以结束当前游戏\n(如遇到故障可输入"bbc重开"清理数据库)');
          return;
        }
        else{const data = {
          platform: session.platform,
          userId: session.userId,
          guildId: session.guildId || '', // 根据需要处理 guildId 是否为空
          time: new Date(),
        };
        await ctx.database.create('bangguess_user', data);
      }
      }catch(error){
        console.error('插入数据时出错：', error);
        session.send('游戏启动失败，请稍后重试。');
      }

      // 设置游戏开始标志
      isGameStarted = true;
      
      

    // 1. 读取 JSON 文件，获取随机角色信息
       const jsonFilePath = path.join(__dirname, 'all.5.json'); // JSON 文件路径
       console.log('读取的json文件位置：', jsonFilePath);
 
       // 调用 readJson 方法来获取随机角色的resourceSetName, characterId
       const jsonData = await readJson(jsonFilePath);
       if (!jsonData) {
         session.send('读取角色数据失败，请检查 JSON 文件');
         return;
       }
       const { resourceSetName, characterId } = jsonData;
       //读取nickname
       const nicknameFilePath = path.join(__dirname, 'nickname.json'); // 假设你有一个名为 nickname.json 的文件
       let nicknames = await readJson_nickname(nicknameFilePath, characterId);
       console.log(`角色ID: ${characterId} 的所有昵称:`, nicknames);
       

    // 2. 构造图片 URL
      const imageUrl = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip/card_normal.png`;
      console.log(`选中的角色ID: ${characterId}`);
      console.log(`图片链接: ${imageUrl}`);

    // 3. 下载图片
     session.send('图片加载中请稍等...')
     let imagePath = path.join(folderPath, 'res.png'); // 图片保存路径
     
     await downloadImage(ctx, imageUrl, imagePath); // 调用下载图片的函数（你需要实现）
     // 确认图片是否已下载成功
     if (fs.existsSync(imagePath)) {
     } else {
       session.send('图片下载失败，请重新开始游戏！');
       return;
     }

    // 4. 执行裁剪操作
      const cutWidth = 200; // 裁剪宽度
      const cutLength = 150; // 裁剪高度

      const imageSegments = []; // 初始化图片消息段数组
      
      // 确保裁剪输出文件夹存在
      try {
        fs.mkdirSync(outputPath, { recursive: true });
        console.log('裁剪输出文件夹创建成功：', outputPath);
      } catch (error) {
        console.error('创建裁剪输出文件夹时出错', error);
      }

      // 调用randomCropImage进行裁剪
      try {
        //调用裁剪方法
        let cut_filePath = path.join(outputPath); // 图片保存路径
        await randomCropImage(imagePath,cutWidth, cutLength, cut_filePath);
        
        // 发送图片之前加一行文字并添加到数组
        const textMessage = "时间60秒~猜猜我是谁：";
        imageSegments.push(textMessage);

        

        // 遍历裁切好的三张图片，将每个图片添加到消息段数组
        const files = fs.readdirSync(outputPath);
        files.forEach(async file => {
        const outputImagePath = path.join(outputPath, file);
        imageSegments.push(segment.image(`file://${outputImagePath}`));
      });
        const remind_Message = "（如遇到重复题目请输入 bbc重开 清理数据库)";
        imageSegments.push(remind_Message);
      
        await delay(2000);//等两秒

        // 发送裁剪好的图片消息段
        try{   
            if(guildId){
              ctx.bots[0].broadcast([`${guildId}`], imageSegments)
            }else{
              ctx.bots[0].broadcast([`private:${userId}`], imageSegments)
            }
          console.log('裁剪图片发往：' ,userId, guildId)
        }catch (error) {
         console.error('发送图片消息时出错:', error);
        }
        
        // 如果没有捕获错误，继续执行后续逻辑
        console.log('游戏继续进行...');

      
      
      // 5.全局计时器
      setInterval(async () => {
        const now = new Date(); // 获取当前时间
        const timeoutThreshold = new Date(now.getTime() - 70000); // 60秒前的时间

        // 查询超时的游戏记录
        const expiredGames = await ctx.database.get('bangguess_user', {
          time: { $lte: timeoutThreshold }, // 查询60秒前的记录
        });
      
        // 60s结束
        if (expiredGames.length > 0) {
          // 遍历超时的记录，发送超时消息
          for (const game of expiredGames) {
            // 创建消息串
            const message = [
              `${config.phrase_timeout}${nicknames[7]}`,
              h('image', { url: `file://${imagePath}` }),
            ].join('\n');
            const message_t = [`${nicknames[7]}:${imageUrl}`];
            // 获取当前行信息
            const { platform, userId, guildId } = game;
            console.log('平台与ID：', platform, userId, guildId)
            if(guildId){
              await ctx.bots[0].broadcast([`${guildId}`], message_t);
              ctx.bots[0].broadcast([`${guildId}`], message);
              // 如果是群聊，删除所有与该 guildId 相关的记录
              await ctx.database.remove('bangguess_user', { guildId });
              console.log(`已删除群聊 ${guildId} 中的所有记录`);
              console.log('超时游戏结束消息发给群聊', guildId, '的：',userId);
              dispose();
            }else{
              await ctx.bots[0].broadcast([`${guildId}`], message_t);
              ctx.bots[0].broadcast([`${guildId}`], message);
              ctx.bots[0].broadcast([`private:${userId}`], message);
              // 如果是私聊，删除对应的用户记录
              await ctx.database.remove('bangguess_user', { userId });
              console.log(`已删除用户 ${userId} 的记录`);
              console.log('超时游戏结束消息发给了私信：', userId,);
              dispose();
            }
          dispose();    
          }
          dispose();   
        } 
      }, 5000); // 每5秒检查一次



    // 7. 监听用户输入的消息，ctx.on()会返回dispose函数，调用即可取消监听
      const dispose = ctx.on('message', async (session) => {
        if (isGameStarted) {
          let userInput = session.content.trim();  // 获取用户输入的消息内容并去除前后空格
          const userId = session.userId;
          console.log('游戏开始后用户输入:', userInput, userId);  // 打印用户输入的内容进行调试
          
          // 如果用户输入 bzd，立即结束游戏
          if (userInput.toLowerCase() === 'bzd') {
            try {
              const message = [
                `${config.phrase_bzd}${nicknames[7]}`,
                h('image', { url: `file://${imagePath}` }),
              ].join('\n');
              const message_b = [`是${nicknames[7]}:${imageUrl}`];
              await session.send(message); // 发送合并后的消息
              await session.send(message_b);
              console.log('bzd游戏结束消息发给了', userId, userInput);
            } catch (error) {
              console.error('发送消息或图片时出错:', error);
            } finally {
              // 确保逻辑结束时重置标志
              isGameStarted = false;
              // 获取用户 ID
              const userId = session.userId;
              try {
                // 从数据库中删除对应的用户记录
                if (guildId) {
                  // 如果是群聊，删除所有与该 guildId 相关的记录
                  await ctx.database.remove('bangguess_user', { guildId });
                  console.log(`已删除群聊 ${guildId} 中的所有记录`);
                } else {
                  // 如果是私聊，删除对应的用户记录
                  await ctx.database.remove('bangguess_user', { userId });
                  console.log(`已删除用户 ${userId} 的记录`);
                }
              } catch (error) {
                console.error('删除数据库记录时出错:', error);
              }
              dispose(); // 取消监听器
            }
            return;
          }

          if (nicknames.some(nickname => userInput === nickname)) {
            // @用户并发送答案
            const message_y = [`正确，${nicknames[7]}:${imageUrl}`];
            await session.send(message_y);
            const message = `${h('at', { id: session.userId })} ${config.phrase_answered} ${userInput} ${h('image', { url: `file://${imagePath}` })} \n 游戏结束`;
            await session.send(message);
            isGameStarted = false;
            
            // 获取用户 ID
            const userId = session.userId;
            try {
              // 从数据库中删除对应的用户记录
              if (guildId) {
                // 如果是群聊，删除所有与该 guildId 相关的记录
                await ctx.database.remove('bangguess_user', { guildId });
                console.log(`已删除群聊 ${guildId} 中的所有记录`);
              } else {
                // 如果是私聊，删除对应的用户记录
                await ctx.database.remove('bangguess_user', { userId });
                console.log(`已删除用户 ${userId} 的记录`);
              }
            } catch (error) {
              console.error('删除数据库记录时出错:', error);
            }
            dispose()
            return;
          }
        }
    });
      } catch (error) {
        return '裁剪失败，请检查日志。';
      }
    }catch (error) {
      console.error('游戏执行过程中出错:', error);
      session.send('执行游戏时出错，请查看日志');
    }
  });
  
}
