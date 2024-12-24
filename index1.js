// index.js

// Import the sub-bot launch function from index1.js
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const BotUsers = require('./models/botusers.js'); // Foydalanuvchilar modeli
const BotModel = require('./models/botModel.js'); // Bot model
const User = require('./models/users.js'); 
const botModel = require('./models/botModel.js');
const reqStudent = require("./models/reqStudent.js");
const defaultBot = require('./models/defaultBot.js');
const Course = require("./models/kurslar.js");
const XLSX = require('xlsx');
const dotenv = require('dotenv');
dotenv.config();

// const launchSubBot = require('./client.js');
// const launchSubBot = require('./client.js').launchSubBot; // Botni ishga tushiruvchi funksiya
// const stopSubBot = require('./client.js'); // Botni to'xtatuvchi funksiya
const {activeBots, stopSubBot, launchSubBot} = require('./client.js'); // Botni to'xtatuvchi funksiya


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));


// Launch all bots from the database

async function launchAllBots() {
  try {
    const allBots = await BotModel.find();
    if (!allBots.length) {
      console.log('Hech qanday bot topilmadi.');
      return;
    }
    
    for (const botData of allBots) {
      const subscriptionExpired = !botData.subscriptionType ||
        !botData.subscriptionEndDate || new Date() > new Date(botData.subscriptionEndDate);

      if (subscriptionExpired) {
        await stopSubBot(botData);
        await BotModel.findByIdAndUpdate(botData._id, { isActive: false });
        console.log(`${botData.botName} obunasi tugaganligi sababli to'xtatildi.`);
      } else {
        const botIdString = botData._id.toString();
        if (!activeBots[botIdString]) {
          console.log('Bot not active, launching:', botData.botName);
          await launchSubBot(botData);
          await BotModel.findByIdAndUpdate(botData._id, { isActive: true });
          console.log(`${botData.botName} faol holatda.`);
        } else {
          console.log(`${botData.botName} already active.`);
        }
      }
    }
  } catch (error) {
    console.error('Botlarni ishga tushirishda xatolik:', error.message);
  }
}
launchAllBots().then(() => {
  console.log('All registered bots launched successfully at startup.');
});
// Har 1 daqiqada yangilash
setInterval(launchAllBots, 1 * 60 * 1000);



// Initialize main bot
const edubot = new Telegraf(process.env.TOKEN, { polling: true });
// const PROVIDER_TOKEN = '410694247:TEST:151020e4-62d1-43f5-8739-3d52e5397b26'; //trranziso test usd
// const PROVIDER_TOKEN = '398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065'; //click test uzs
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN;
// Main bot commands

// Start komandasi
edubot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const opts = {
    reply_markup: {
      keyboard: [
        [
          {
            text: "Kontaktimni ulashish",
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
  await ctx.reply("Assalomu alaykum! Telefon raqamingizni yuboring:", opts);
});

// Kontakt olish
edubot.on("contact", async (ctx) => {
  const chatId = ctx.chat.id;
  const name = ctx.chat.first_name;
  const phoneNumber = ctx.message.contact.phone_number;
  const users = await User.findOne({ chatId });
  try {
    // Foydalanuvchini bazadan topish
    let user = await User.findOne({ chatId });

    if (user) {
      // Agar foydalanuvchi mavjud bo'lsa, ma'lumotlarni yangilash
      await User.findByIdAndUpdate(
        user._id,
        { name, phoneNumber, isActive: true, chatId },
        { new: true }
      );
    } else {
      // Yangi foydalanuvchini yaratish
      const newUser = new User({
        name,
        chatId,
        phoneNumber,
        admin: false, // Default qiymat
        status: true, // Default qiymat
        isActive: true,
        bots: [], // Bo'sh massiv
        createdAt: new Date(),
      });
      await newUser.save();
    }

    // Xabar yuborish
    await ctx.reply("Telefon raqamingiz muvaffaqiyatli saqlandi!", {
      reply_markup: { remove_keyboard: true },
    });

    // Mavjud foydalanuvchi bo'lsa, mos menyuni ko'rsatish
    if (chatId.toString() === "5803698389") {
      adminStartFunc(ctx); // Admin uchun menyu
    } else {
      startFunc(ctx); // Oddiy foydalanuvchi menyusi
    }
  } catch (error) {
    console.error("Error handling contact:", error);
    ctx.reply(ctx.chat.id, "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
  }
});



function startFunc(ctx) {
  const chatId = ctx.chat.id;
  const cname = ctx.from.first_name;
  
  ctx.reply(
    `Xush kelibsiz! ${cname} Bu bot orqali Ta'lim markazingiz botini bog'lab o'z botingizdan foydalanashingiz mumkin. `,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Profile", callback_data: "profile" }],
          [{ text: "Botlar statusi", callback_data: "mybots" }],
          [{ text: "Botlar ro'yxati", callback_data: "botLists" }],
          [{ text: "Maxfiylik siyosati ", callback_data: "privacy" }],
        ],
      },
    }
  );
}

  // Define the adminStartFunc for admins
  function adminStartFunc(ctx) {
    const chatId = ctx.chat.id;
    const cname = ctx.from.first_name;
    
    ctx.reply(
      `Xush kelibsiz! ${cname} Bu bot orqali Ta'lim markazingiz botini bog'lab o'z botingizdan foydalanashingiz mumkin.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Profile", callback_data: "profile" }],
            [{ text: "Botlar statusi", callback_data: "mybots" }], 
            [{ text: "Botlar ro'yxati", callback_data: "botLists" }],
            [{ text: "Maxfiylik siyosati ", callback_data: "privacy" }],
            // [{ text: "Aloqa", callback_data: "contact" }],
            [{ text: "Admin menu", callback_data: "adminMenu" }],
          ],
        },
      }
    );
  }



edubot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;  // This gets the callback data
  const chatId = ctx.chat.id;
  // let subscriptionType, durationInMonths, price;

  // Handle the callback data
  if (callbackData === 'profile') {
    profile(ctx);
  } else if (callbackData === 'mybots') {
    myBots(ctx);
  } else if (callbackData === 'back') {
    backCheck(ctx);
  } else if (callbackData === 'controllBot') {
    controllBot(ctx);
  } else if (callbackData === 'userSendMessage') {
    userSendMessage(ctx);
  } else if (callbackData === 'usersList') {
    userLists(ctx);
  } else if (callbackData === 'userCount') {
    userCount(ctx);
  } else if (callbackData === 'botCount') {
    botCount(ctx);
  } else if (callbackData === 'botLists') {
    botLists(ctx);
  } else if (callbackData === 'userFile') {
    sendBotUsersToExcel(ctx);
  } else if (callbackData === 'botFile') {
    sendBotsToExcel(ctx);
  } else if (callbackData === 'privacy') {
    privacy(ctx);
  } else if (callbackData === 'adminMenu') {
    adminMenu(ctx);
  }  
  // else if (callbackData === 'contact') {
  //   phoneNumber(ctx);
  // } 

  // payment
const data = ctx.callbackQuery.data;
const [action, botId, subscriptionType] = data.split('_');

if (action === 'checksubscription') {
    try {
        const botData = await BotModel.findById(botId);
        if (!botData) {
            return ctx.reply("Bot ma'lumotlari topilmadi.");
        }

        const subscriptionType = botData.subscriptionType || "No subscription";
        const subscriptionEndDate = botData.subscriptionEndDate
            ? botData.subscriptionEndDate.toLocaleDateString("uz-UZ")
            : "No subscription end date";

        const payments = botData.payments.length > 0
            ? botData.payments.map(payment => `Amount: ${payment.amount} UZS\nDate: ${payment.date.toLocaleDateString("uz-UZ")}`).join('\n')
            : "No payments found";

        const botInfo = `Bot: ${botData.botName} (@${botData.botUsername})\nSubscription Type: ${subscriptionType}\nSubscription End Date: ${subscriptionEndDate}\nPayments:\n${payments}`;

        await ctx.reply(botInfo, { parse_mode: "HTML" });
    } catch (error) {
        console.error("Error fetching subscription data:", error);
        await ctx.reply("Obuna tekshiruvi davomida xatolik yuz berdi.");
    }
} else if (action === 'activate') {
    const subscriptionDetails = {
        '1-month': { duration: 30, price: 25000 },
        '6-month': { duration: 180, price: 150000 },
        '12-month': { duration: 365, price: 300000 },
        'demo': { duration: 1, price: 5000 },
    }[subscriptionType];

    if (!subscriptionDetails) {
        return ctx.reply("Obuna turini tanlashda xatolik yuz berdi.");
    }

    const { duration, price } = subscriptionDetails;
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + duration);

    try {
        function subscriptionTypeCheck(subscriptionType){
          if(subscriptionType == "1-month"){
              return "1 oylik"
          } else if(subscriptionType == '6-month'){
                return "6 oylik"
          }else if(subscriptionType == '12-month'){
              return "12 yillik"
        }else if(subscriptionType == 'demo'){
          return "1 kunlik"
       }
      }
        await ctx.replyWithInvoice({
          title: `Obuna: ${subscriptionType}`, // Title field, required
          description: `Botni faollashtirish uchun ${subscriptionTypeCheck(subscriptionType)} obuna to'lovi.`, // Description field, required
          payload: `subscription_${subscriptionType}_${botId}`, // Payload, must be unique for this invoice
          provider_token: process.env.PROVIDER_TOKEN, // Payment provider token
          currency: 'UZS', // Currency
          prices: [{ label: `Obuna: ${subscriptionType}`, amount: price * 100 }], // Prices
          start_parameter: `subscribe_${subscriptionType}`, // Start parameter
          need_name: true, // Optional: ask for name
          need_phone_number: true, // Optional: ask for phone number
          is_flexible: false, // Optional: flexibility
      });
  
      console.log(`To'lov bosqichiga o'tildi: ${subscriptionType}, Bot ID: ${botId}`);
    } catch (error) {
        console.log("To'lovni boshlashda xato:", error);
        await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
}
  // payment

});


  async function backCheck(ctx) {
    const chatId = ctx.msg.chat.id;
    const users = await User.findOne({ chatId });
    try {
      if ("5803698389" == chatId) {
        adminStartFunc(ctx);
        }else {
            startFunc(ctx); // Normal user functionality
      }
    } catch (error) {
      console.log(error);
    }
  }


    async function profile(ctx) {
      const chatId = ctx.msg.chat.id;
      try {
        const user = await User.findOne({ chatId });
        if (!user) {
          return ctx.reply("Foydalanuvchi topilmadi.");
        }
        const registerDate = user.createdAt ? user.createdAt.toLocaleDateString() : 'No registration date';
      //   const subscriptionEndDate = user.subscriptionEndDate ? user.subscriptionEndDate.toLocaleDateString() : 'No subscription';
      //   Subscription End Date: ${subscriptionEndDate}
      //   Subscription Type: ${user.subscriptionType || "null"}
    
        const userData = `
    Name: ${user.name || "null"}
    Status: ${user.status ? "faol" : "nofaol"}
    Is Active: ${user.isActive ? "faol" : "nofaol"}
    Bots: ${user.bots ? user.bots.length : "null"}
    Register Date: ${registerDate}`;

ctx.reply(userData);


      } catch (error) {
        console.error("Error fetching user profile:", error);
        ctx.reply("Xatolik yuz berdi.");
      }

  }
  
  
  // edubot.on('document', (ctx) =>{
  //   console.log(ctx.msg.document);
  // })
  const privacyData = {
    file_name: "LcServiceBot_Privacy_Policy.pdf",
    file_id: "BQACAgIAAxkBAAMQZ2LwgvxavLBehwsK_HGh3XjXB8YAArVgAAKzzxlLZLLQa-RucOk2BA",
    privacyUrl: "https://shorturl.at/ZetZV",
    privacyUrlUz: "https://shorturl.at/ONOcc",
  }

async function privacy(ctx) {
  const chatId = ctx.msg.chat.id;
  
  await edubot.telegram.sendDocument(chatId, privacyData.file_id, { caption: `<a href="${privacyData.privacyUrl}">Privacy Policy</a> \n<a href="${privacyData.privacyUrlUz}">Privacy Policy Uz</a>`, parse_mode: "HTML"}, );
}
function phoneNumber(ctx) {
  ctx.reply(`admin: @deltasoft_admin \ntel: +998330033953`);
}

function adminMenu(ctx) {
  const chatId = ctx.chat.id;  

  ctx.reply("Bo'limni tanlang admin", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Botlar statistikasi", callback_data: "botCount" },
          // { text: "So'rovlarni o'chrish", callback_data: "deleteReqStudent" },
        ],
        [
          { text: "Bot File List", callback_data: "botFile" },
          { text: "User File List", callback_data: "userFile" },
        ],
        [
          { text: "Foydalanuvchilar ruyxati", callback_data: "usersList" },
          { text: "Foydalanuvchilar statistikasi", callback_data: "userCount" },
        ],
        [
          {
            text: "Foydalanuvchilarga xabar yuborish",
            callback_data: "userSendMessage",
          },
        ],
        [{ text: "Asosiy menyuga qaytish ↩️", callback_data: "back" }],
      ],
    },
  });
}


async function botCount(ctx) {
  const chatId = ctx.chat.id;
  try {
    const bots = await botModel.find();
    if (!bots || bots.length === 0) {
      return ctx.reply("Bot topilmadi!");
    }
    
    // Count all bots and blocked bots
    const botLength = bots.length;
      // Count all bots and blocked bots
      const blockedBotBotsCount = bots.filter(
        (bot) => bot.status === false
      ).length;
      
      let botList = 'botlar ruyxati:\n';
      
      bots.forEach((bot, index) => {
         const adminId = `<a href="tg://user?id=${bot.adminId}">adminId:</a>`;
         botList += `${index + 1}. ${adminId}  ${bot.botName} (@${bot.botUsername}) \n`;
       });
        const message =
          `<b>Botlar: </b>\n` +
          `Barcha faol botlar: ${botLength} \n` +
          `Nofaol botlar: ${blockedBotBotsCount} \n\n` +
            botList +
          `\n\nBotni bloklagan foydalanuvchilarning hisoblagichi translyatsiya posti yuborilganda yangilanadi.`;

    // Send the message with user statistics
      await ctx.reply(message, { parse_mode: "HTML" });

  } catch (error) {
    console.log(error);
    await ctx.reply('Xatolik yuz berdi, statistika olinmadi.');
  }
}

async function userLists(ctx) {
  const chatId = ctx.chat.id;

  try {
    const users = await User.find();
    if (!users || users.length === 0) {
      return ctx.reply("User topilmadi!");
    }
    let userList = 'Foydalanuvchi ruyxati:\n\n';
    users.forEach(async (user, index) => {
const uid =   `<a href="tg://user?id=${user.chatId}">${user.chatId}</a>`;
userList += `${index + 1}. id: ${uid} 
Foydalanuvchi ismi: <a href="tg://user?id=${user.chatId}">${user.name}</a> 
Telefon: +${user.phoneNumber}
`;});
ctx.reply(userList, { parse_mode: "HTML" } )
  } catch (error) {
    console.log(error);
    ctx.reply("Xatolik yuz berdi, foydalanuvchilar ro'yxati olinmadi.");
  }
}

async function userCount(ctx) {
  try {
    const chatId = ctx.chat.id;
    const users = await User.find();
    
    const userLength = users.length;
      const blockedBotUsersCount = users.filter(
        (user) => user.status === false
      ).length;

      let userList = 'Foydalanuvchilar ruyxati:\n';
      
      users.forEach((user, index) => {
        const userId = `<a href="tg://user?id=${user.chatId}">${user.name}:</a>`;
        const bots = user.bots; // Foydalanuvchining botlari massivini oling
      
        const botCount = bots.length;
        const botNames = bots.map(bot => bot.botName).join(', '); // Botlar nomlarini vergul bilan ajratib ro'yxatlash
        const botId = bots.map(bot => bot.botId).join(' '); // Botlar nomlarini vergul bilan ajratib ro'yxatlash
        const botMentions = bots.map(bot => `<a href="https://t.me/${bot.botUsername}">${bot.botName}</a>`).join(', ');

        userList += `${index + 1}. ${userId} \n Status: ${user.status} \n Botlar (${botCount}): ${botMentions || 'Hech qanday bot yo\'q'} \n\n`;
      });
      
    const message =
      `\`@lc_edubot\` uchun statistika: \n\n` +
      `Foydalanuvchilar: \n` +
      `Barcha foydalanuvchilar: ${userLength} \n` +
      `Bot bloklangan: ${blockedBotUsersCount} \n\n` +
        userList +
      `\n\nBotni bloklagan foydalanuvchilarning hisoblagichi translyatsiya posti yuborilganda yangilanadi.`;

    // Send the message with user statistics
    await ctx.reply(message, { parse_mode: "HTML" });

  } catch (error) {
    console.log(error);
    await ctx.reply('Xatolik yuz berdi, statistika olinmadi.');
  }
}



async function userSendMessage(ctx) {
  try {
    const chatId = ctx.chat.id;

    // Check if the user is an admin (replace with your admin chatId)
    if (chatId.toString() !== "5803698389") {
      return ctx.reply("Uzr, siz bu amaliyotni bajarish uchun ruxsatga ega emassiz.");
    }

    // Get all users
    const users = await User.find();

    // Ask the admin to enter a message
    await ctx.reply("Xabar matnini kiriting:", { parse_mode: "Markdown" });

    // Wait for the admin's message
    const textMessage = await new Promise((resolve, reject) => {
      const onText = (messageCtx) => {
        if (messageCtx.chat.id === chatId) {
          resolve(messageCtx.message.text);  // Resolve the promise with the admin's message text
          edubot.removeListener('text', onText);  // Remove the listener after getting the message
        }
      };
      edubot.on('text', onText);
    });

    // Ask for a photo from the admin
    await ctx.reply("Rasmni yuboring:");

    // Wait for the admin's photo
    const photoMessage = await new Promise((resolve, reject) => {
      const onPhoto = (photoCtx) => {
        if (photoCtx.chat.id === chatId) {
          resolve(photoCtx.message.photo[0].file_id);  // Resolve the promise with the photo file_id
          edubot.removeListener('photo', onPhoto);  // Remove the listener after getting the photo
        }
      };
      edubot.on('photo', onPhoto);
    });

    // Send the message and photo to all users
    for (const user of users) {
      try {
        await edubot.telegram.sendPhoto(user.chatId, photoMessage, { caption: textMessage });
      } catch (error) {
        console.log(`Xabar ${user.chatId} ga yuborishda xato yuz berdi:`, error);
      }
    }

    // Notify the admin
    await ctx.reply("Xabar muvaffaqiyatli yuborildi.");
  } catch (error) {
    console.log("Foydalanuvchilarga xabar yuborishda xatolik yuz berdi:", error);
  }
}

async function  botLists(ctx) {
  const chatId = ctx.chat.id;
  const bots = await BotModel.find({ adminId: chatId });
  if (bots.length === 0) {
     return ctx.reply( "Siz hali hech qanday bot ulamadingiz.");
  }

  let botList = 'Siz ulagan botlar:\n';
  bots.forEach((botD, index) => {
    botList += `${index + 1}. ${botD.botName} (@${botD.botUsername})\n`;
  });

   ctx.reply(botList, {
      reply_markup: {
          inline_keyboard: [
            [{ text: "Obunalar", callback_data: "mybots" }]
          ]
        }
  });
}




edubot.command('support', async (ctx) => {
  phoneNumber(ctx)
});
edubot.command('menu', async (ctx) => {
  backCheck(ctx)
});
edubot.command('mybots', async (ctx) => {
  const chatId = ctx.msg.chat.id;
  const users = await User.findOne({ chatId });

  const bots = await BotModel.find({ adminId: ctx.from.id });
  if (bots.length === 0) {
    return ctx.reply('Siz hali hech qanday bot ulamadingiz.');
  }
  let botList = 'Siz ulagan botlar:\n';
  bots.forEach((bot, index) => {
    botList += `${index + 1}. ${bot.botName}\n`;
  });
  await ctx.reply(botList);
});
edubot.command('help', async (ctx) => {
  const chatId = ctx.msg.chat.id;
  const contlollInfo =  "<b>Botni ishga tushirish: </b> /start \n " + 
    "<b>Komandalar bo'yicha yordam(free): </b> /help \n " + 
    "<b>Menyular: </b> /menu \n " + 
    "<b>Botlar ro'yxati: </b> /listbots - Botlar ro'yxati\n " + 
    "<b>Bot Qo'shish: </b> /addbot <code>token</code>\n " + 
    "<b>Botni o'chirish: </b> /removebot <code>botId</code> yoki /removebot <code>token</code>";
  
  await ctx.reply(contlollInfo, { parse_mode: "HTML" });
});



edubot.on('text', async (ctx) => {
  const chatId = ctx.msg.chat.id;
  const users = await User.findOne({ chatId });

  const message = ctx.message.text.trim();
  if (message.startsWith('/addbot ')) {
    const parts = message.split(' ');
    if (parts.length < 2) {
      return ctx.reply('Token kiritilmagan. Iltimos, /addbot <token> koʻrinishida tokenni kiriting.');
    }
    const token = parts[1].trim();
    try {
      const botClient = new Telegraf(token);
      const botInfo = await botClient.telegram.getMe();
      
      // Tekshiruv: Bot allaqachon tizimga ulanganmi?
      const existingBot = await BotModel.findOne({ token });
      if (existingBot) {
        return ctx.reply('Ushbu bot allaqachon tizimga ulangan.');
      }
  
      // Foydalanuvchini bazadan olish yoki yaratish
      let user = await User.findOne({ chatId: ctx.from.id });
      if (!user) {
        user = new User({
          name: ctx.from.first_name,
          chatId: ctx.from.id,
          phoneNumber: '', // Assuming phone number is optional at the moment
          createdAt: new Date(),
          bots: [],
        });
      }
  
      // Yangi botni Bot modelga qo'shish
      const newBot = new BotModel({
        adminId: chatId,
        botId: botInfo.id,
        token: token,
        botName: botInfo.first_name,
        botUsername: botInfo.username,
        botusers: [],
        isActive: false, // Default
        subscriptionType: null,
        subscriptionEndDate: null,
        payments: [],
      });
     // Update the user's bot list (add the new bot or update if it exists)
     const existingBotIndex = user?.bots.findIndex((bot) => bot.token === token);
     if (existingBotIndex !== -1) {
       user.bots[existingBotIndex] = {
         botName: botInfo.first_name,
         token: token,
         botId: newBot._id,
         botUsername: botInfo.username,
       };
     } else {
       // If bot doesn't exist in the list, add it
       user.bots.push({
           adminId: chatId,
           botId: botInfo.id,
           token: token,
           botName: botInfo.first_name,
           botUsername: botInfo.username,
           botusers: [],
           isActive: false, // Default
           subscriptionType: null,
           subscriptionEndDate: null,
           payments: [],
       });
     }
      // Botni saqlash
      await newBot.save();
  
      await user.save();
  
      await ctx.reply(`<a href="t.me/${botInfo.username}">${botInfo.first_name}</a> bot muvaffaqiyatli ulandi!`, {parse_mode: "HTML"});
  
      // Launch the sub-bot using the imported function
      // await launchSubBot(newBot);
    } catch (err) {
      console.log('Xatolik:', err.message);
      await ctx.reply('Notoʻgʻri token yoki botni ulab boʻlmadi.');
    }
  }
  
  // Botni o'chirish (botId yoki token orqali)
  if (message.startsWith('/removebot ')) {
    const parts = message.split(' ').filter((part) => part.trim() !== '');
    if (parts.length < 2) {
        return ctx.reply(
            'Iltimos, o\'chirmoqchi bo\'lgan botning ID yoki tokenini kiriting: /removebot <botId> yoki /removebot <token>'
        );
    }

    const botIdentifier = parts[1].trim();

    try {
        let botToRemove;
        if (mongoose.Types.ObjectId.isValid(botIdentifier)) {
            botToRemove = await BotModel.findOne({ _id: botIdentifier });
        } else {
            botToRemove = await BotModel.findOne({ token: botIdentifier });
        }

        if (!botToRemove) {
            return ctx.reply('Bunday bot topilmadi.');
        }

        if (!botToRemove.token) {
            return ctx.reply('Botda token mavjud emas.');
        }

        const user = await User.findOne({ chatId: ctx.from.id });
        if (!user) {
            return ctx.reply('Siz tizimda ro\'yxatdan o\'tmagan ekansiz.');
        }

        // Adminlikni tekshirish
        if (botToRemove.adminId.toString() !== ctx.from.id.toString()) {
            return ctx.reply('Siz bunday so\'rov ruxsatiga ega emassiz. Faqat botning admini botni o\'chira oladi.');
        }

        // Remove the bot from the user's bots array
        user.bots = user.bots.filter(
            (bot) => bot.botId.toString() !== botToRemove._id.toString()
        );
        await user.save();

        // Remove the bot from the BotModel
        await BotModel.deleteOne({ _id: botToRemove._id });

        // Remove associated users from BotUsers
        const botusers = await BotUsers.find({ botId: botToRemove._id });
        if (botusers.length > 0) {
            await BotUsers.deleteMany({ botId: botToRemove._id });
        }
        const cources = await Course.find({ botId: botToRemove._id });
        if (cources.length > 0) {
            await Course.deleteMany({ botId: botToRemove._id });
        }
        const restudent = await reqStudent.find({ botId: botToRemove._id });
        if (restudent.length > 0) {
            await reqStudent.deleteMany({ botId: botToRemove._id });
        }
        const defaultB = await defaultBot.find({ botId: botToRemove._id });
        if (defaultB.length > 0) {
            await defaultBot.deleteMany({ botId: botToRemove._id });
        }

        await ctx.reply(
            `${botToRemove.botName} bot va unga tegishli barcha foydalanuvchilar muvaffaqiyatli o'chirildi!`
        );
    } catch (err) {
        console.log('Xatolik:', err.message);
        await ctx.reply('Botni o\'chirishda xatolik yuz berdi.');
    }
}


  
  // Botlarni ro'yxatlash
  // Handle /listbots command
    
    const text = ctx.message.text.trim();
    if (text === '/listbots') {
      try {
        const bots = await BotModel.find({ adminId: ctx.from.id });
  
        if (bots.length === 0) {
          return ctx.reply('Siz hali hech qanday bot ulamadingiz.');
        }
  
        let botList = 'Siz ulagan botlar:\n';
        bots.forEach((bot, index) => {
          const uid = `<code>${bot._id}</code>`;  // Corrected the use of `bot.id` to `bot._id`
          const uidtoken = `<code>${bot.token}</code>`;
          botList += `${index + 1}. <a href="https://t.me/${bot.botUsername}">${bot.botName}</a>\n(ID: ${uid})\nToken: ${uidtoken}\n\n`;
        });
  
        await ctx.reply(botList, { parse_mode: "HTML" });
      } catch (err) {
        console.error('Error fetching bots:', err.message);
        await ctx.reply('Botlarni ro\'yxatlashda xatolik yuz berdi.');
      }
    }
  
  // }
  })








// Botlar ro'yxatini ko'rsatish
async function myBots(ctx) {
  const chatId = ctx.chat.id;
    try {
      const bots = await BotModel.find({ adminId: chatId });

      if (!bots || bots.length === 0) {
          return ctx.reply("Sizda hali birorta bot ulanmadi.");
      }

      for (const botdata of bots) {
          const uid = `${botdata.adminId}`;
          const subDate = botdata.subscriptionEndDate
              ? botdata.subscriptionEndDate.toLocaleString("uz-UZ")
              : "Obuna mudati tugagan";

          const botList = `Admin ID: ${uid}
Bot: ${botdata.botName}  @${botdata.botUsername}
Bot Foydalanuvchilari: ${botdata.botusers.length}
Is Active: ${botdata.isActive ? "faol (ishlamoqda)" : "nofaol (bot to'xtatilgan)"}
Subscription Type: ${botdata.subscriptionType || "Obuna mavjud emas"}
Subscription End Date: ${subDate}

Obunani o'zgartish yoki faollashtirish uchun quyidagi menulardan birini tanlang:`;

          const keyboard = botdata.subscriptionType && botdata.subscriptionEndDate && new Date() <= botdata.subscriptionEndDate
              ? [
                  [{ text: "Chekni tekshirish", callback_data: `checksubscription_${botdata._id}` }],
              ]
              : [
                  [{ text: "1 Oylik - 25,000 so'm", callback_data: `activate_${botdata._id}_1-month` }],
                  [{ text: "6 Oylik - 150,000 so'm", callback_data: `activate_${botdata._id}_6-month` }],
                  [{ text: "12 Oylik - 300,000 so'm", callback_data: `activate_${botdata._id}_12-month` }],
                  [{ text: "1 Kunlik Demo", callback_data: `activate_${botdata._id}_demo` }],
              ];

          await ctx.reply(botList, {
              reply_markup: { inline_keyboard: keyboard },
              parse_mode: "HTML",
          });
      }
  } catch (error) {
      console.log("Xatolik:", error);
      ctx.reply("Xatolik yuz berdi, botlar ro'yxati olinmadi.");
  }
};

// To'lov muvaffaqiyati uchun boshqarish
edubot.on('successful_payment', async (ctx) => {
  const { provider_payment_charge_id, telegram_payment_charge_id, total_amount, invoice_payload } = ctx.message.successful_payment;
  const [_, subscriptionType, botId] = invoice_payload.split('_');

  const duration = {
      '1-month': 30,
      '6-month': 180,
      '12-month': 365,
      'demo': 1,
  }[subscriptionType];

  const subscriptionEndDate = new Date();
  subscriptionEndDate.setDate(subscriptionEndDate.getDate() + duration);

  try {
      await BotModel.findByIdAndUpdate(botId, {
          isActive: true,
          subscriptionType,
          subscriptionEndDate,
          $push: {
              payments: {
                  providerPaymentChargeId: provider_payment_charge_id,
                  telegramPaymentChargeId: telegram_payment_charge_id,
                  amount: total_amount / 100,
                  date: new Date(),
              },
          },
      });

      await ctx.reply(`To'lov muvaffaqiyatli amalga oshirildi! Obuna turi: ${subscriptionType}. Obuna muddati: ${subscriptionEndDate.toLocaleDateString("uz-UZ")}. \nBirozdan so'ng botingiz faollashadi.`);
      await edubot.telegram.sendMessage("5803698389", `Bot uchun to'lov muvaffaqiyatli amalga oshirildi! \nObuna turi: ${subscriptionType}. \nObuna muddati: ${subscriptionEndDate.toLocaleDateString("uz-UZ")}.`);
  } catch (error) {
      console.error("Error updating subscription:", error);
      await ctx.reply("Xatolik yuz berdi. Obuna yangilashda muammo paydo bo'ldi.");
  }
});









  


// Start the main bot
edubot.launch().then(() => {
  console.log('EduBot launched successfully!');
}).catch(err => {
  console.log('Error launching EduBot:', err);
});


// auto user bots update
const updateUserBots = async () => {
  try {
    // Fetch all users
    const users = await User.find();
    if (!users || users.length === 0) {
      console.log("No users found to update.");
      return;
    }

    // Iterate through each user to update their bots
    for (const user of users) {
      const chatId = user.chatId;

      // Find all bots associated with this user's chatId as `adminId`
      const userBots = await BotModel.find({ adminId: chatId });

      // Map the bot details to match the expected structure in User's `bots` field
      const updatedBots = userBots.map((bot) => ({
        botId: bot._id,
        botName: bot.botName,
        botUsername: bot.botUsername,
        token: bot.token,
        isActive: bot.isActive
      }));

      // Update the user document with the new bots array
      await User.findByIdAndUpdate(
        user._id,
        { bots: updatedBots }, // Update the `bots` field
        { new: true }
      );

      // console.log(`Updated bots for user: ${user.name} (${chatId})`);
    }
  } catch (error) {
    console.error("Error updating user bots:", error);
  }
};

// Schedule the update function to run periodically (e.g., every 5 minutes)
setInterval(updateUserBots, 5 * 60 * 1000); // 5 minutes in milliseconds
// Optional: Run the function immediately on server start
updateUserBots();

// auto








async function sendBotsToExcel(ctx) {
  const chatId = ctx.chat.id;
  try {
    // 1. BotUsers ro'yxatini olish
    const bots = await BotModel.find();  // Agar kerak bo'lsa, shartlarni qo'shing
    const users = await User.find();

    // 2. Excel faylini yaratish
    const Userdata = bots.map(botD => {

      return {
        id: botD._id.toString(),
        adminId: botD.adminId,
        botId: botD.botId,
        botName: botD.botName,
        botUsername: botD.botUsername,
        token: botD.token,
        isActive: botD.isActive ? "true" : "false",
        subscriptionType: botD.subscriptionType,
        subscriptionEndDate: botD.subscriptionEndDate,
        botusers:  botD.botusers.length,
        payments:  botD.payments.length,
        createdAt: botD.createdAt,
      };
    });

    // Excel faylini yaratish
    const ws = XLSX.utils.json_to_sheet(Userdata); // JSON ma'lumotlarni Excelga aylantirish
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bots');

    // Excel faylini Buffer sifatida yaratish
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // 3. Telegram bot orqali yuborish
    await edubot.telegram.sendDocument(chatId, {
      source: excelBuffer,
      filename: 'botslist.xlsx',
    }, { caption: 'Bots list' });

    console.log('Fayl yuborildi');
  } catch (error) {
    console.error('Xatolik yuz berdi:', error);
  }
}


async function sendBotUsersToExcel(ctx) {
  const chatId = ctx.chat.id;
  try {
    // 1. BotUsers ro'yxatini olish
    const botusers = await BotUsers.find();  // Agar kerak bo'lsa, shartlarni qo'shing
    const users = await User.find();

    // 2. Excel faylini yaratish
    const Userdata = users.map(user => {
      const botData = user.bots.map(bot => ({ botName: bot.botName  }));

      return {
        id: user._id.toString(),
        firstName: user.name,
        chatId: user.chatId,
        phoneNumber: user.phoneNumber,
        admin: user.admin ? "true" : "false",
        status: user.status ? "true" : "false",
        bots:  user.bots.length,
        isActive: user.isActive ? "active" : "noactive",
        createdAt: user.createdAt,
      };
    });

    // Excel faylini yaratish
    const ws = XLSX.utils.json_to_sheet(Userdata); // JSON ma'lumotlarni Excelga aylantirish
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    // Excel faylini Buffer sifatida yaratish
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // 3. Telegram bot orqali yuborish
    await edubot.telegram.sendDocument(chatId, {
      source: excelBuffer,
      filename: 'bot_users.xlsx',
    }, { caption: 'Bot users list' });

    console.log('Fayl yuborildi');
  } catch (error) {
    console.error('Xatolik yuz berdi:', error);
  }
}




// auto obuna check
// const updateBotStatusBasedOnSubscription = async () => {
//   try {
//     // Fetch all bots from the database
//     const allBots = await BotModel.find();
//     if (allBots.length === 0) {
//       console.log('No bots found.');
//       return;
//     }

//     console.log(`Checking subscription status for ${allBots.length} bots...`);

//     for (const botData of allBots) {
//       const adminId = botData.adminId; // Botning adminId sini olamiz

//       // // Foydalanuvchi ma'lumotlarini tekshirish
//       // const user = await User.findOne({ chatId: adminId });

//       // if (!user) {
//       //   console.log(`Admin with chatId ${adminId} not found.`);
//       //   continue;
//       // }

//       // Foydalanuvchining obuna holatini tekshirish
//       const subscriptionExpired = !botData.subscriptionType ||
//         !botData.subscriptionEndDate || new Date() > botData.subscriptionEndDate;

//       if (subscriptionExpired) {
//         await stopSubBot(botData); // Botni to'xtatish
//         // Obuna tugagan bo'lsa, botni nofaol qilish
//         await BotModel.findByIdAndUpdate(botData._id, { isActive: false });
//         console.log(`${botData.botName} (ID: ${botData._id}) bot obunasi tugaganligi sababli to'xtatildi.`);
//         // await edubot.telegram.sendMessage(adminId, `<a href="t.me/${botData.botUsername}">${botData.botName}</a> bot obunasi tugaganligi sababli to'xtatildi.`, {parse_mode: "HTML"})
//       } else {
//         await launchSubBot(botData); // Botni ishga tushirish
//         // Obuna amalda bo'lsa, botni faol holatga keltirish
//         await BotModel.findByIdAndUpdate(botData._id, { isActive: true });
//         console.log(`${botData.botName} (ID: ${botData._id}) bot faol holatda.`);
//         // await edubot.telegram.sendMessage(adminId, `<a href="t.me/${botData.botUsername}">${botData.botName}</a> bot faollashtirildi.`,{parse_mode: "HTML"})
       
//       }
//     }

//     console.log('Subscription status check completed.');
//   } catch (err) {
//     console.log('Error checking bot subscription status:', err.message);
//   }
// };

// // Call the function periodically (e.g., every 5 minutes)
// setInterval(updateBotStatusBasedOnSubscription, 1 * 60 * 1000); // Har 5 daqiqada tekshirish


// auto obuna check








process.once('SIGINT', () => edubot.stop('SIGINT'));
process.once('SIGTERM', () => edubot.stop('SIGTERM'));




// // Function to start the bot
// function startBot() {
//   edubot.launch()
//     .then(() => {
//       console.log('Bot is running!');
//     })
//     .catch((error) => {
//       console.error('Error starting bot:', error);
//       restartBot();
//     });
// }

// // Restart the bot function
// function restartBot() {
//   console.log('Restarting bot...');
//   edubot.stop();  // Stop the bot before restarting
//   startBot();     // Restart the bot
// }

// // Set up basic bot logic (commands, event handlers, etc.)
// edubot.on('text', (ctx) => {
//   ctx.reply('Hello, I am running!');
// });

// // Start the bot initially
// startBot();

// // Handle uncaught exceptions
// process.on('uncaughtException', (error) => {
//   console.error('Uncaught exception:', error);
//   restartBot();  // Restart the bot after an uncaught exception
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (error) => {
//   console.error('Unhandled rejection:', error);
//   restartBot();  // Restart the bot after an unhandled rejection
// });

// // Monitor the bot and restart every 3 minutes (if needed)
// setInterval(() => {
//   console.log('Checking if bot is running...');
//   if (!edubot) {
//     restartBot();  // Restart the bot if it's not running
//   }
// }, 180000); // 180000 ms = 3 minutes