// import botmodel from './model/botmodel';

const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// import model
const BotModel = require('./models/botModel.js');
const User = require('./models/users.js');
const BotUser = require('./models/botusers.js');
// import model

// import botfile
// const launchSubBot = require('./client.js');
const launchSubBot = require('./client.js').launchSubBot; // Botni ishga tushiruvchi funksiya
const stopSubBot = require('./client.js').stopSubBot; // Botni to'xtatuvchi funksiya

// import botfile

// Token va botni sozlash
// const eduBotToken = process.env.TOKEN;
const eduBot = new TelegramBot(process.env.TOKEN, { polling: true });


mongoose.connect(process.env.MONGODB_URI,  console.log(`mongodb connected`));

async function launchAllBots() {
    try {
      const allBots = await BotModel.find();
      if (!allBots.length) {
        console.log('Hech qanday bot topilmadi.');
        return;
      }
  
      for (const botData of allBots) {
        const now = new Date();
        const subscriptionExpired = 
          !botData.subscriptionType || 
          !botData.subscriptionEndDate || 
          now > new Date(botData.subscriptionEndDate);
  
        if (subscriptionExpired) {
          await stopSubBot(botData); // Botni to'xtatish
          await BotModel.findByIdAndUpdate(botData._id, { isActive: false });
          console.log(`\nBot ${botData.botName} obunasi tugaganligi sababli to'xtatildi.`);
        } else {
          // await launchSubBot(botData); // Botni ishga tushirish
          await BotModel.findByIdAndUpdate(botData._id, { isActive: true });
          console.log(`\nBot ${botData.botName} faol holatda.`);
        }
      }
    } catch (error) {
      console.error('Botlarni ishga tushirishda xatolik:', error.message);
    }
  }



// MFY bot start xabari
eduBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    const opts = {
        reply_markup: JSON.stringify({
          keyboard: [[{ text: "Mening kontaktimni baham ko'ring", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }),
      };
    eduBot.sendMessage(chatId, "Assalomu alaykum! Telefon raqamingizni yuboring:", opts);
});

eduBot.onText('/help', (msg) => {

    const contlollInfo =  "<b>Bot ishga tushirish: </b> /start \n " + 
    "<b>Profile: </b> /profile \n " + 
    "<b>Komandalar buyicha yordam(free): </b> /help \n " + 
    "<b>Menular: </b> /menu \n " + 
    "<b>Botlar ro'yxati: </b> /listbots - Botlar ro'yxati\n " + 
    "<b>Bot Qo'shish: </b> /addbot <code>token</code>\n " + 
    "<b>Botni o'chirish: </b> /removebot <code>botId</code> yoki /removebot <code>token</code>";
  
    eduBot.sendMessage(msg.chat.id, contlollInfo, { parse_mode: "HTML" })
})
eduBot.onText('/menu', (msg) => {
    backCheck(msg)
})

eduBot.on('contact', async (msg) => {
    try {
      const chatId = msg.chat.id; // Chat ID
      const name = msg.chat.first_name || "Foydalanuvchi"; // Foydalanuvchi ismi
      const phoneNumber = msg.contact.phone_number; // Telefon raqami
  
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
      await eduBot.sendMessage(chatId, "Telefon raqamingiz muvaffaqiyatli saqlandi!", {
        reply_markup: { remove_keyboard: true },
      });
  
      // Mavjud foydalanuvchi bo'lsa, mos menyuni ko'rsatish
      if (chatId.toString() === "5803698389") {
        adminStartFunc(msg); // Admin uchun menyu
      } else {
        startFunc(msg); // Oddiy foydalanuvchi menyusi
      }
    } catch (error) {
      console.error("Error handling contact:", error);
      eduBot.sendMessage(msg.chat.id, "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  });
  
  

  function startFunc(msg) {
    const chatId = msg.chat.id;
    const name = msg.chat.first_name;
    // const messageId = msg.message_id;
    // eduBot.deleteMessage(chatId, messageId);
    
    eduBot.sendMessage(chatId,
      `Xush kelibsiz! ${name} Bu bot orqali o'z o'quv markazingiz botini ulab o'z botingizdan foydalanashingiz mumkin.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Profile", callback_data: "profile" }],
            [{ text: "Mening botlarim", callback_data: "myBots" }],
            [{ text: "Bot Lists", callback_data: "botLists" }],
            // [{ text: "Controll Bot", callback_data: "controllBot" }],
            [{ text: "Aloqa", callback_data: "contact" }],
            // [{ text: "Manzil", callback_data: "address" }],
          ],
        },
      }
    );
  }
  
    // Define the adminStartFunc for admins
    function adminStartFunc(msg) {
      const chatId = msg.chat.id;
      const name = msg.chat.first_name;
    // const messageId = msg.message_id;
    // eduBot.deleteMessage(chatId, messageId);
      eduBot.sendMessage(chatId, 
        `Xush kelibsiz! ${name} Bu bot orqali o'z o'quv markazingiz botini ulab o'z botingizdan foydalanashingiz mumkin.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Profile", callback_data: "profile" }],
              [{ text: "Mening botlarim", callback_data: "myBots" }], 
              [{ text: "Bot Lists", callback_data: "botLists" }],
            //   [{ text: "Controll Bot", callback_data: "controllBot" }],
              [{ text: "Aloqa", callback_data: "contact" }],
              [{ text: "Admin menu", callback_data: "adminMenu" }],
            ],
          },
        }
      );
    }
  

    async function backCheck(msg) {
        try {
          const chatId = msg.chat.id;
          if ("5803698389" == chatId) {
            adminStartFunc(msg);
            }else {
                startFunc(msg); // Normal user functionality
          }
        } catch (error) {
          console.log(error);
        }
      }




// Inline menyu callbacklarini boshqarish
eduBot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const msg = query.message;

  if (data === 'add_bot') {
    addBot(msg)
  } else if (data === 'profile') {
    profile(msg)
  } else if (data === 'adminMenu') {
    adminMenu(msg)
  } else if (data === 'userLists') {
    userLists(chatId)
  } else if (data === 'userCount') {
    userCount(chatId)
  } else if (data === 'userSendMessage') {
    userSendMessage(msg)
  } else if (data === 'contact') {
    phoneNumber(msg)
  } else if (data === 'myBots') {
    myBots(msg)
  } else if (data === 'botLists') {
    botLists(msg)
  } else if (data === 'back') {
    backCheck(msg)
  }
//   else if (data === 'controllBot') {
//     controllBot(chatId)
//   } 


});






function phoneNumber(msg) {
    const chatId = msg.chat.id;
    eduBot.sendMessage(chatId, `admin: @deltasoft_admin \ntel: +998330033953`);
  }



// Profile Handler
async function profile(msg) {
    // console.log(msg);
    
    const chatId = msg.chat.id;
    try {
      const user = await User.findOne({ chatId });
      if (!user) {
        return eduBot.sendMessage(chatId, "Foydalanuvchi topilmadi.");
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
  
      eduBot.sendMessage(chatId, userData);
    } catch (error) {
      console.log("Error fetching user profile:", error);
      eduBot.sendMessage(chatId, "Xatolik yuz berdi.");
    }
  }

//   async function controllBot(chatId) {
//     try {
//       const user = await User.findOne({ chatId });
  
//       // Bot control instructions
//       const controllInfo = 
//       "<b>Bot ishga tushirish: </b> /start \n " + 
//       "<b>Komandalar buyicha yordam: </b>  \n " + 
//       "<b>Menu: </b> /menu \n " + 
//       "<b>Botlar ro'yxati: </b> /listbots - Botlar ro'yxati\n " + 
//       "<b>Bot Qo'shish: </b> /addbot <code>token</code>\n " + 
//       "<b>Botni o'chirish: </b> /removebot <code>botId</code> yoki /removebot <code>token</code>";
    
  
//       // Send the control information message
//       await eduBot.sendMessage(chatId, controllInfo, { parse_mode: "HTML" });
//     } catch (error) {
//       console.log("Error in controllBot:", error);
//       await eduBot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
//     }
//   }
  

  function adminMenu(msg) {
    const chatId = msg.chat.id;
    // const messageId = msg.message_id;
    // eduBot.deleteMessage(chatId, messageId);
    // Send the new message with buttons
    eduBot.sendMessage(chatId, "Bo'limni tanlang admin", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Foydalanuvchilar ruyxati", callback_data: "userLists" },
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
  

  async function userLists(chatId) {
    try {
      // Fetch all bots to find the specific bot
      const users = await User.find();
      if (!users || users.length === 0) {
        return eduBot.sendMessage(chatId, "User topilmadi!");
      }
  
      // Send user details
      if (users.length === 0) {
        return eduBot.sendMessage(chatId, "Bu bot uchun foydalanuvchilar topilmadi.");
      }
  
      let userList = 'Foydalanuvchi ruyxati:\n\n';
      users.forEach(async (user, index) => {
const uid =   `<a href="tg://user?id=${user.chatId}">${user.chatId}</a>`;
userList += `${index + 1}. id: ${uid} 
  Foydalanuvchi ismi: <a href="tg://user?id=${user.chatId}">${user.name}</a> 
  Telefon: ${user.phoneNumber}
  `;});
  eduBot.sendMessage(chatId, userList, { parse_mode: "HTML" } );
    } catch (error) {
      console.log(error);
      eduBot.sendMessage(chatId, "Xatolik yuz berdi, foydalanuvchilar ro'yxati olinmadi.");
    }
  }

  async function userCount(chatId) {
    try {
      const users = await User.find();
      // Count all users and blocked users
      const userLength = users.length;
        // Count all users and blocked users
        const blockedBotUsersCount = users.filter(
          (user) => user.status === false
        ).length;
  
        
      let userList = 'Foydalanuvchilar ruyxati:\n\n';
      
      users.forEach((user, index) => {
        const userId = `<a href="tg://user?id=${user.chatId}">${user.name}:</a>`;
        const bots = user.bots; // Foydalanuvchining botlari massivini oling
      
        // Agar botlar mavjud bo'lsa, sonini va nomlarini chiqarish
        const botCount = bots.length;
        const botMentions = bots.map(bot => `<a href="https://t.me/${bot.botUsername}">${bot.botName}</a>`).join('\n ');

        userList += `${index + 1}. ${userId} \n Status: ${user.status} \n Botlar (${botCount}): ${botMentions || "Hech qanday bot yo\'q"} \n`;
      });
      
      const message =
        `@lc_edubot uchun statistika: \n\n` +
        `Foydalanuvchilar: \n` +
        `Barcha foydalanuvchilar: ${userLength} \n` +
        `Bot bloklangan: ${blockedBotUsersCount} \n\n` +
         userList +
        `\n\nBotni bloklagan foydalanuvchilarning hisoblagichi translyatsiya posti yuborilganda yangilanadi.`;
  
      // Send the message with user statistics
      await eduBot.sendMessage(chatId, message, { parse_mode: "HTML" });
  
    } catch (error) {
      console.log(error);
      await eduBot.sendMessage(chatId, 'Xatolik yuz berdi, statistika olinmadi.');
    }
  }


async function userSendMessage(msg) {
    const chatId = msg.chat.id;
  try {
    const users = await User.find();
    if (users.length === 0) {
      return eduBot.sendMessage(chatId, "Hali foydalanuvchilar yo'q.");
    }

    eduBot.sendMessage(chatId, "Xabar matnini kiriting:");

    eduBot.once('message', async (msg) => {
      const textMessage = msg.text;

      eduBot.sendMessage(chatId, "Rasmni yuboring:");
      eduBot.once('photo', async (photoMsg) => {
        const photoId = photoMsg.photo[0].file_id;

        for (const user of users) {
          try {
            await eduBot.sendPhoto(user.chatId, photoId, { caption: textMessage });
          } catch (error) {
            console.log(`Error sending to ${user.chatId}:`, error);
          }
        }
        eduBot.sendMessage(chatId, "Xabar muvaffaqiyatli yuborildi.");
      });
    });
  } catch (error) {
    console.log("Error sending message:", error);
    eduBot.sendMessage(chatId, "Xabar yuborishda xatolik yuz berdi.");
  }
}
async function  botLists(msg) {
    const chatId = msg.chat.id;
    const bots = await BotModel.find({ adminId: chatId });
    if (bots.length === 0) {
      return eduBot.sendMessage(chatId, "Siz hali hech qanday bot ulamadingiz.");
    }
  
    let botList = 'Siz ulagan botlar:\n';
    bots.forEach((botD, index) => {
      botList += `${index + 1}. ${botD.botName} (@${botD.botUsername})\n`;
    });
  
    eduBot.sendMessage(chatId, botList, {
        reply_markup: {
            inline_keyboard: [
              [{ text: "Bot Controll", callback_data: "myBots" }]
            ]
          }
    });
  }





// Handling bot list and subscription
async function myBots(msg) {
    const chatId = msg.chat.id;

    try {
        // Bazadan barcha botlarni olish
        const bots = await BotModel.find({ adminId: chatId });

        if (!bots || bots.length === 0) {
            return eduBot.sendMessage(chatId, "Sizda hali birorta bot ulanmadi.");
        }

        // Har bir bot uchun obuna holatini tekshirish va tugmalarni ko'rsatish
        bots.forEach(async (botdata) => {
            const uid = `${botdata.adminId}`;
            const subDate = botdata.subscriptionEndDate
                ? botdata.subscriptionEndDate.toLocaleString("uz-UZ")
                : "Obuna mudati tugagan";

            // Bot haqida ma'lumot
            const botList = 
`Admin ID: ${uid}
  Bot: ${botdata.botName}  @${botdata.botUsername}
    Bot Foydalanuvchilari: ${botdata.botusers.length}
    Is Active: ${botdata.isActive ? "faol (ishlamoqda)" : "nofaol (bot to'xtatilgan)"}
    Subscription Type: ${botdata.subscriptionType || "Obuna mavjud emas"}
    Subscription End Date: ${subDate}
    
Obunani o'zgartish yoki faollashtirish uchun quyidagi menulardan birini tanlang:`;

            // Obuna holatini tekshirish
            if (!botdata.subscriptionType || // Obuna turi mavjud emas
                !botdata.subscriptionEndDate || new Date() > botdata.subscriptionEndDate // Obuna tugagan
            ) {
                // Obuna yo'q
                await eduBot.sendMessage(chatId, botList, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "1 Oylik - 25,000 so'm", callback_data: `activate_${botdata._id}_1-month` }], // 1 month button
                            [{ text: "6 Oylik - 150,000 so'm", callback_data: `activate_${botdata._id}_6-month` }], // 6 months button
                            [{ text: "12 Oylik - 300,000 so'm", callback_data: `activate_${botdata._id}_12-month` }], // 12 months button
                            [{ text: "1 Kunlik Demo", callback_data: `activate_${botdata._id}_demo` }] // 7-day demo button
                        ],
                    },
                    parse_mode: "HTML",
                });
            } else {
                // Obuna mavjud
                await eduBot.sendMessage(chatId, botList, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Chekni tekshirish", callback_data: `checksubscription_${botdata._id}` }],
                        ],
                    },
                    parse_mode: "HTML",
                });
            }
        });
    } catch (error) {
        console.error("Xatolik:", error);
        eduBot.sendMessage(chatId, "Xatolik yuz berdi, botlar ro'yxati olinmadi.");
    }
}

// Payment handling after selecting a subscription
eduBot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const parts = data.split('_');
    const botId = parts[1]; // Bot ID
    const subscriptionType = parts[2]; // Subscription type: 1-month, 6-month, 12-month, or demo

    // console.log("Bot ID:", botId);
    // console.log("Subscription Type:", subscriptionType);

    let durationInDays;
    let price;

    if (data.startsWith('checksubscription')) {
        try {
            // Bot ma'lumotlarini olish
            const botData = await BotModel.findById(botId);
            if (!botData) {
                return eduBot.sendMessage(chatId, "Bot ma'lumotlari topilmadi.");
            }

            // Obuna turi va tugash sanasi
            const subscriptionType = botData.subscriptionType || "No subscription";
            const subscriptionEndDate = botData.subscriptionEndDate
                ? botData.subscriptionEndDate.toLocaleDateString("uz-UZ")
                : "No subscription end date";

            // To'lov ma'lumotlari
            const payments = botData.payments.length > 0
                ? botData.payments.map(payment => `
                    Amount: ${payment.amount} UZS
                    Date: ${payment.date.toLocaleDateString("uz-UZ")}
                `).join('\n')
                : "No payments found";

            // Bot haqidagi ma'lumotlarni foydalanuvchiga yuborish
            const botInfo = `
            Bot: ${botData.botName} (@${botData.botUsername})
            Subscription Type: ${subscriptionType}
            Subscription End Date: ${subscriptionEndDate}
            Payments: 
            ${payments}
            `;

            await eduBot.sendMessage(chatId, botInfo, { parse_mode: "HTML" });
        } catch (error) {
            console.error("Error fetching subscription data:", error);
            await eduBot.sendMessage(chatId, "Obuna tekshiruvi davomida xatolik yuz berdi.");
        }
    }

    // Define duration and price based on subscription type
    switch (subscriptionType) {
        case '1-month':
            durationInDays = 30;
            price = 25000; // 25,000 UZS
            break;
        case '6-month':
            durationInDays = 180;
            price = 150000; // 150,000 UZS
            break;
        case '12-month':
            durationInDays = 365;
            price = 300000; // 300,000 UZS
            break;
        case 'demo':
            durationInDays = 1;
            price = 5000; // 5000 UZS
            break;
        default:
            // await eduBot.sendMessage(chatId, "Obuna turini tanlashda xatolik yuz berdi.");
            return;
    }

    
    // console.log("Price:", price, "Duration:", durationInDays);

    // If price is null or invalid, return an error message
    // if (!price || isNaN(price)) {
    //     await eduBot.sendMessage(chatId, "Xatolik yuz berdi: to'lov summasi noto'g'ri.");
    //     return;
    // }

    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + durationInDays);

    try {
        // Sending the invoice to Telegram payment system
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

        await eduBot.sendInvoice(
            chatId,
            // `Bot Name: ${bots.botName}`,
            `Obuna: ${subscriptionType}`,
            `Botni faollashtirish uchun ${subscriptionTypeCheck(subscriptionType) } obuna to'lovi.`,
            `subscription_${subscriptionType}_${botId}`, // Unique payload
            process.env.PROVIDER_TOKEN, // Payment provider token
            "UZS", // Currency code
            [
                {
                    label: `Obuna: ${subscriptionType}`,
                    amount: price * 100, // Convert to the smallest unit (so'm -> tanga)
                },
            ],
            {
                need_name: true,
                need_phone_number: true,
                is_flexible: false,
            }
        );

        console.log(`To'lov bosqichiga o'tildi: ${subscriptionType}, Bot ID: ${botId}`);
    } catch (err) {
        console.error(`To'lovni boshlashda xato: ${err.message}`);
        await eduBot.sendMessage(chatId, "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
});


// payent verfy
// To'lov tasdiqlash
eduBot.on('successful_payment', async (msg) => {
    const chatId = msg.chat.id;
    const providerPaymentChargeId = msg.successful_payment.provider_payment_charge_id;
    const telegramPaymentChargeId = msg.successful_payment.telegram_payment_charge_id;
    const amount = msg.successful_payment.total_amount / 100; // Convert from tanga (smallest unit) to so'm
    const subscriptionType = msg.successful_payment.invoice_payload.split('_')[1]; // Extract subscription type
    const botId = msg.successful_payment.invoice_payload.split('_')[2]; // Extract Bot ID

    // console.log(`Payment successful for Bot ID: ${botId}`);
    // console.log(`Subscription Type: ${subscriptionType}`);
    // console.log(`Amount: ${amount} UZS`);

    // Calculate subscription end date based on subscription type
    let durationInDays;
    if (subscriptionType === "1-month") {
        durationInDays = 30;
    } else if (subscriptionType === "6-month") {
        durationInDays = 180;
    } else if (subscriptionType === "12-month") {
        durationInDays = 365;
    } else if (subscriptionType === "demo") {
        durationInDays = 1;
    }

    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + durationInDays);

    try {
        // Update the bot's subscription data in the database
        await BotModel.findByIdAndUpdate(botId, {
            isActive: true,
            subscriptionType,
            subscriptionEndDate,
            $push: {  // Use push to add a new entry to the payments array
                payments: {
                    providerPaymentChargeId: msg.successful_payment.provider_payment_charge_id,
                    telegramPaymentChargeId: msg.successful_payment.telegram_payment_charge_id,
                    amount: msg.successful_payment.total_amount / 100,  // Convert from tanga (smallest unit) to so'm
                    date: new Date(),
                },
            },
        });
        

        // Notify the user that the payment was successful and the subscription is now active
        await eduBot.sendMessage(chatId, `To'lov muvaffaqiyatli amalga oshirildi! Obuna turi: ${subscriptionType}. Obuna muddati: ${subscriptionEndDate.toLocaleDateString("uz-UZ")}.`);
        await eduBot.sendMessage("5803698389", `Bot uchun to'lov amalga oshirildi: ${subscriptionType}. Obuna muddati: ${subscriptionEndDate.toLocaleDateString("uz-UZ")}.`);
        // console.log(`Bot ID: ${botId} subscription updated successfully.`);
        // await launchSubBot(botdata)
    } catch (error) {
        console.error(`Error updating subscription: ${error.message}`);
        await eduBot.sendMessage(chatId, "Xatolik yuz berdi. Obuna yangilashda muammo paydo bo'ldi.");
    }
});

// payent verfy







eduBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text; // Foydalanuvchining yuborgan matni
    const user = await User.findOne({ chatId });
  
      // Tekshirish: faqat matnli xabarlar uchun ishlov berish
      if (!text) {
          return; // Agar xabar matn bo'lmasa, hech narsa qilmaydi
        }
    try {
            // Handle `/addbot` command
     if (text.startsWith('/addbot ')) {
         const parts = text.split(' ');
         if (parts.length < 2) {
                return eduBot.sendMessage(chatId, 'Token kiritilmagan. Iltimos, /addbot <token> koʻrinishida tokenni kiriting.');
         }
        
        const token = parts[1].trim();
          const botClient = new TelegramBot(token, { polling: false });
          const botInfo = await botClient.getMe();
  
          // Check if bot is already linked
          const existingBot = await BotModel.findOne({ token });
          if (existingBot) {
            return eduBot.sendMessage(chatId, 'Ushbu bot allaqachon tizimga ulangan.');
          }
  
          // Create a new bot entry if not found
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
          await newBot.save();
  
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
  
          await user.save();
  
          eduBot.sendMessage(chatId, `<a href="https://t.me/${botInfo.username}">${botInfo.first_name}</a> bot muvaffaqiyatli ulandi!`, { parse_mode: 'HTML' });
  
          // Launch the sub-bot
          await launchSubBot(newBot);
      }
  
      // Handle `/removebot` command
      if (text.startsWith('/removebot ')) {
        const parts = text.split(' ').filter((part) => part.trim() !== '');
        if (parts.length < 2) {
          return eduBot.sendMessage(chatId, 'Iltimos, o\'chirmoqchi bo\'lgan botning ID yoki tokenini kiriting: /removebot <botId> yoki /removebot <token>');
        }
  
        const botIdentifier = parts[1].trim();
        try {
          let botToRemove;
          if (mongoose.Types.ObjectId.isValid(botIdentifier)) {
            botToRemove = await BotModel.findById(botIdentifier);
          } else {
            botToRemove = await BotModel.findOne({ token: botIdentifier });
          }
  
          if (!botToRemove) {
            return eduBot.sendMessage(chatId, 'Bunday bot topilmadi.');
          }
  
          if (!user) {
            return eduBot.sendMessage(chatId, 'Siz tizimda ro\'yxatdan o\'tmagan ekansiz.');
          }
  
          // Remove the bot from the user's bots array
          user.bots = user.bots.filter((bot) => bot.botId.toString() !== botToRemove._id.toString());
          await user.save();
  
          // Remove associated bot users from BotUsers collection
          const botusers = await BotUser.find({ botId: botToRemove._id });
          if (botusers.length > 0) {
            await BotUser.deleteMany({ botId: botToRemove._id });
          }
  
          // Remove the bot from BotModel
          await BotModel.deleteOne({ _id: botToRemove._id });
  
          eduBot.sendMessage(chatId, `${botToRemove.botName} bot va unga tegishli barcha foydalanuvchilar muvaffaqiyatli o'chirildi!`);
        } catch (err) {
          console.error('Error:', err.message);
          eduBot.sendMessage(chatId, 'Botni o\'chirishda xatolik yuz berdi.');
        }
      }
  
      // Handle `/listbots` command
      if (text === '/listbots') {
        const bots = await BotModel.find({ adminId: chatId });
        if (bots.length === 0) {
          return eduBot.sendMessage(chatId, 'Siz hali hech qanday bot ulamadingiz.');
        }
  
        let botList = 'Siz ulagan botlar:\n';
        bots.forEach((botL, index) => {
          const botId = `<code>${botL._id}</code>`;
          const botToken = `<code>${botL.token}</code>`;
          botList += `${index + 1}. <a href="https://t.me/${botL.botUsername}">${botL.botName}</a>\n(ID: ${botId})\nToken: ${botToken}\n\n`;
        });
  
        eduBot.sendMessage(chatId, botList, { parse_mode: 'HTML' });
      }
    } catch (err) {
      console.error('Error handling message:', err.message);
      eduBot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
  });
  













  const updateBotStatusBasedOnSubscription = async () => {
    try {
      // Bazadan barcha botlarni olish
      const allBots = await BotModel.find();
      if (allBots.length === 0) {
        console.log('Hech qanday bot topilmadi.');
        return;
      }
  
      console.log(`Obuna holati tekshirilmoqda: ${allBots.length} ta bot ...`);
  
      for (const botdata of allBots) {
        // Obuna holatini tekshirish
        const subscriptionExpired = 
          !botdata.subscriptionType || // Obuna turi mavjud emas
          !botdata.subscriptionEndDate || // Obuna muddati mavjud emas
          new Date() > botdata.subscriptionEndDate; // Obuna muddati tugagan
  
          if (subscriptionExpired) {
            await BotModel.findByIdAndUpdate(botdata._id, { isActive: false });
            console.log(`Bot ${botdata.botName} nofaol holatga o'tkazildi.`);
            await stopSubBot(botdata);
          } else {
            await BotModel.findByIdAndUpdate(botdata._id, { isActive: true });
            console.log(`Bot ${botdata.botName} faol holatda qoldi.`);
            await launchSubBot(botdata);
          }
      }
  
      console.log('Obuna holati tekshiruvi tugadi.');
    } catch (err) {
      console.error('Obuna holatini tekshirishda xatolik:', err.message);
    }
  };
  
  // Har 6 soatda ishga tushadigan intervalni sozlash
//   setInterval(updateBotStatusBasedOnSubscription, 6 * 60 * 60 * 1000); // Har 6 soatda (6 soat * 60 min * 60 sec * 1000 ms)
  setInterval(updateBotStatusBasedOnSubscription, 1 * 60 * 1000); // Har 5 daqiqada tekshirish

  // Dastur ishga tushganda bir marta ishga tushirish
  updateBotStatusBasedOnSubscription();
  



  
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
  
        console.log(`Updated bots for user: ${user.name} (${chatId})`);
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





launchAllBots().then(() => console.log('All bots launched successfully!'));

process.once('SIGINT', () => {
    eduBot.stopPolling();
    eduBot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    eduBot.stopPolling();
    eduBot.stop('SIGTERM');
  });
  
  console.log('EduBot all code launched successfully!');
  eduBot.stopPolling();

// eduBot.on('polling_error', (error) => {
//   console.log('edu pollling error: ' + error);  // Print the error to the console
//   eduBot.startPolling();
// });
