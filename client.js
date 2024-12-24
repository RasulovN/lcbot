const TelegramBot = require('node-telegram-bot-api');
const { InlineKeyboardMarkup } = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const reqStudent = require("./models/reqStudent.js");
const Course = require("./models/kurslar.js");
const BotUsers = require("./models/botusers.js");
const User = require('./models/users.js'); 
const BotModel = require("./models/botModel.js")
const defaultBot = require('./models/defaultBot.js');


dotenv.config();

// MongoDB ga ulanish
// mongoose
  // .connect(process.env.MONGODB_URI, {})
  // .then(() => console.log('Connected to MongoDB'))
  // .catch((err) => console.error('Error connecting to MongoDB:', err));


  const activeBots = {}; // Faol botlar ro'yxati
// Function to launch sub-bot with updated commands
// module.exports = async function launchSubBot(botData) {
  const launchSubBot = async (botData) => {
  // Initialize the sub-bot using the token from the database
  const subBot = new TelegramBot(botData.token, {polling: true});

  subBot.deleteWebHook()
  .then(() => {
    console.log('Existing webhook removed');
    // Now set the new webhook URL
    const webhookUrl = 'https://beige-spies-study.loca.lt';  // Replace with your public URL
    return subBot.setWebHook(webhookUrl);
  })
  .then(() => {
    console.log('Webhook set successfully!');
  })
  .catch((err) => {
    console.error('Error setting webhook:', err);
  });

  // if (activeBots[botData._id]) {
  //   await activeBots[botData._id].stopPolling();
  // }
  if (!botData._id) {
    console.error('Bot ID is missing.');
    return;
  }


  activeBots[botData._id] = subBot; // Botni saqlaymiz


// Start komandasi
subBot.onText('/start', (msg) => {
  const chatId = msg.chat.id
  startContact(msg)
  updateBotUsers();
  });
subBot.onText('/menu', (msg) => {
  const chatId = msg.chat.id
  backCheck(msg) 
});

async function startContact(msg) {
    const chatId = msg.chat.id;
    const opts = {
      reply_markup: JSON.stringify({
        keyboard: [
          [
            {
              text: "Mening kontaktimni baham ko'ring",
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      }),
    };
    subBot.sendMessage(
      chatId,
      "Assalomu alaykum! Telefon raqamingizni yuboring:",
      opts
    );
}




subBot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.chat.first_name;
  const phoneNumber = msg.contact.phone_number;

  try {
    // Fetch all bots
    const bots = await BotModel.find();
    if (!bots || bots.length === 0) {
        return subBot.sendMessage(chatId, "Bot topilmadi!");
    }

    // Determine the specific bot for the current request using the bot's token
    const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
    if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Get the bot's ObjectId
    const botName = currentbot.botName; // Get the bot's name

    // Fetch all users associated with this bot
    const botusers = await BotUsers.find({ botId }); // Find users where botId matches the current bot

    // Update the bot document with its associated botusers
    await BotModel.findByIdAndUpdate(
        botId,
        { botusers }, // Update the botusers field in the Bot document
        { new: true }
    );

    // Check if the user already exists for this bot
    let botuser = await BotUsers.findOne({ chatId, botId }).lean(); // Add botId to filter users for this bot
    if (botuser) {
        // If the user exists, update the user information
        await BotUsers.findByIdAndUpdate(
            botuser._id,
            { name, phoneNumber, isActive: true, chatId, botId, botName }, // Include botName here
            { new: true }
        );
    } else {
        // If the user does not exist, create a new BotUsers entry
        const newBotUsers = new BotUsers({
            botId, // Save botId from the Bot model
            botName, // Save botName to categorize the user
            name: msg.from.first_name,
            chatId,
            phoneNumber,
            admin: false,
            status: true,
            isActive: true,
            createdAt: new Date(),
        });
        await newBotUsers.save();
    }

    // Send success message
    subBot.sendMessage(chatId, "Telefon raqamingiz muvaffaqiyatli saqlandi!", {
        reply_markup: JSON.stringify({
            remove_keyboard: true,
        }),
    });

    // Handle admin and user functionality
    const adminId = currentbot.adminId;

    // Handle admin functionality
    if (chatId == adminId) {
        await BotUsers.findOneAndUpdate(
            { phoneNumber, botId }, // Ensure this update is for the current bot
            { admin: true },
            { new: true }
        );
        adminStartFunc(msg); // Admin-specific functionality
    } else {
        startFunc(msg); // Normal user functionality
    }
} catch (error) {
    console.log("Error:", error);
}


});



// auto update

const updateBotUsers = async () => {
  try {
      // Fetch all bots
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
          console.log("No bots found to update.");
          return;
      }

      for (const bot of bots) {
          const botId = bot._id.toString();
          const botName = bot.botName;

          const botusers = await BotUsers.find({ botId });

          await BotModel.findByIdAndUpdate(
              botId,
              { botusers }, // Update the botusers field in the Bot document
              { new: true }
          );

          // console.log(`Updated botusers for bot: ${botName} (${botId})`);
      }
  } catch (error) {
      console.error("Error updating bot users:", error);
  }
};

// Schedule the update function to run periodically (e.g., every 5 minutes)
setInterval(updateBotUsers, 5 * 60 * 1000); // 5 minutes in milliseconds

// Optional: Run the function immediately on server start
updateBotUsers();

//auto



 async function startFunc(msg) {
    const chatId = msg.chat.id;
    const name = msg.chat.first_name;

    subBot.sendMessage(
      chatId,
      ` Assalomu alaykum! ${name} xush kelibsiz.`,
      {
        reply_markup: {
          remove_keyboard: true,
          resize_keyboard: true,
          inline_keyboard: [
            [{ text: "Biz haqimizda", callback_data: "about" }],
            [{ text: "Kurslar ro'yxati", callback_data: "listcourse" }],
            [{ text: "Ro'yxatdan o'tish", callback_data: "register" }],
            [{ text: "Contact", callback_data: "contact" }],
            [{ text: "Manzil", callback_data: "address" }],
          ],
        },
      }
    );
  }
  function adminStartFunc(msg) {
    const chatId = msg.chat.id;
    const name = msg.chat.first_name;
    subBot.sendMessage(
      chatId,
      `Xush kelibsiz!  ${name} Sizning so'rovlariz va takliflaringizni qabul qilamiz. Iltimos, quyidagi bo'limlardan birini tanlang yoki xabar jo'nating, biz tez orada sizga javob beramiz.  \n bo'limni tanlang  admin`,
      {
        reply_markup: {
          remove_keyboard: true,
          resize_keyboard: true,
            inline_keyboard: [
                [{ text: "Biz haqimizda", callback_data: "about" }],
                [{ text: "Kurslar ro'yxati", callback_data: "listcourse" }],
                [{ text: "Ro'yxatdan o'tish", callback_data: "register" }],
                [{ text: "Contact", callback_data: "contact" }],
                [{ text: "Manzil", callback_data: "address" }],
              [
                  { text: "Admin menu", callback_data: "adminMenu" },
              ]
            ],
          },
      }
    );
  }

  subBot.on("callback_query", async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
  
    switch (action) {
      case "menu":
        backCheck(msg);
        break;
      case "adminMenu":
        adminMenu(msg);
        break;
      case "usersList":
        userLists(msg);
        break;
      case "userCount":
        userCount(msg);
        break;
      case "contact":
        contactFun(msg);
        break;
      case "phone":
        phoneNumber(msg);
        break;
      case "about":
        aboutFun(msg);
        break;
      case "address":
        sendLocation(msg);
        break;
      case "listcourse":
        courseList(msg);
        break;
      case "register":
        register(msg);
        break;
      case "getStudent":
        studentreg(msg);
        break;
      case "userSendMessage":
        userSendMessage(msg);
        break;
      case "addcourse":
        addCourse(msg);
        break;
      case "editcourse":
        editCourse(msg);
        break;
      case "deletecourse":
        deleteCourse(msg);
        break;
      // case "images":
      //   allimages(msg);
      //   break;
      case "deleteReqStudent":
        deleteReqStudent(msg);
        break;
        // edit
      case "settingbot":
        settingbot(msg);
        break;
      case "editLocation":
        handleGeolocation(msg);
        break;
        // image
        case "allImages":
        viewImageFunc(msg);
        break;
      case "addimage":
        addImageFunc(msg);
        break;
      case "adminImagemenu":
        adminImagemenu(msg);
        break;
      case "adminViewImage":
        adminViewImage(msg);
        break;
      case "deleteAdminPhoto":
        deleteAdminPhoto(msg);
        break;
    }
  })

  async function backCheck(msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    try {
      await subBot.deleteMessage(chatId, messageId);
  
      // Handle admin and user functionality
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token);

    const adminId = currentbot.adminId;
    // Handle admin functionality
    if (chatId == adminId) {
        adminStartFunc(msg); // Admin-specific functionality
    } else {
        startFunc(msg); // Normal user functionality
    }
    } catch (error) {
      console.log(error);
    }
  }
  

  async function contactFun(msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    try {
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
  
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
      const existingBot = await defaultBot.findOne({ botId: botId });
  
      // If bot data is not found
      if (!existingBot) {
        return subBot.sendMessage(chatId, "Bot ma'lumotlari topilmadi!");
      }
  
      // If the bot exists and we have its details, send the contact information
      subBot.deleteMessage(chatId, messageId);
      subBot.sendMessage(chatId, "Contact information", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Phone", callback_data: "phone" }],
            [
              {   text: "Instagram",  url: existingBot.socails.instagram ? `https://instagram.com/${existingBot.socails.instagram}` : "https://defaultinstagram.com" },
              { text: "Telegram",  url: existingBot.socails.telegram ? `https://t.me/${existingBot.socails.telegram}` : "https://defaulttelegram.com" }
            ],            
            [{ text: "Return to main menu ↩️", callback_data: "menu" }],
          ],
        },
      });
  
    } catch (error) {
      console.error('Error fetching bot data or sending contact information:', error);
      subBot.sendMessage(chatId, 'Bot ma\'lumotlarini olishda xatolik yuz berdi.');
    }
  }
  
  
  async function phoneNumber(msg) {
    const chatId = msg.chat.id;
  
    try {
      // Fetch the list of bots from the database
      const bots = await BotModel.find();
      
      // Find the current bot based on the bot's token
      const currentbot = bots.find(bot => bot.token === subBot.token);
      
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
  
      // Fetch the bot's details from the defaultBot collection using the botId
      const existingBot = await defaultBot.findOne({ botId: botId });
  
      // Check if bot exists and has a phone number
      const phoneNumber = existingBot ? existingBot.phone : '+998901234567';
  
      // Send the phone number to the user
      subBot.sendMessage(chatId, `Phone number: ${phoneNumber}`);
      
    } catch (error) {
      console.log('Error fetching bot information:', error);
      subBot.sendMessage(chatId, 'Error occurred while fetching bot information.');
    }
  }
  
  
  async function sendLocation(msg) {
    const chatId = msg.chat.id;
  
    try {
      // Get the bot information using its token
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token);
  
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
  
      // Fetch the bot's details from the defaultBot collection using the botId
      const existingBot = await defaultBot.findOne({ botId: botId });
      if (!existingBot || !existingBot.geolocation) {
        return subBot.sendMessage(chatId, "Geolocation information is not available for this bot.");
      }
      
      const predefinedAddress = existingBot.address;
      // Extract the latitude and longitude from the geolocation field
      const latitude = existingBot.geolocation?.latitude || 38.806498; // Default latitude
      const longitude = existingBot.geolocation?.longitude || 66.450998; // Default longitude
      
  
      // Send the location
      const caption = 'This is a location with a caption!';
      subBot.sendLocation(chatId, latitude, longitude, { caption })
        .then(sentMessage => {
          subBot.sendMessage(chatId, `Manzil: ${predefinedAddress}`);
          // console.log('Location sent:', sentMessage.location);
        })
        .catch(error => {
          console.error('Error sending location:', error);
        });
    } catch (error) {
      console.error('Error in sendLocation function:', error);
      subBot.sendMessage(chatId, 'Error occurred while sending location.');
    }
  }
  

async function aboutFun(msg) {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  // Delete the original message
  subBot.deleteMessage(chatId, messageId);

  try {
    // Fetch the list of bots from the database
    const bots = await BotModel.find();
    
    // Find the current bot based on the bot's token
    const currentbot = bots.find(bot => bot.token === subBot.token);

    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Get the bot's ObjectId

    // Fetch the bot's details from the defaultBot collection using the botId
    const existingBot = await defaultBot.findOne({ botId: botId });

    // Set the about message. If the about message exists, use it; otherwise, use the default message
    const aboutMessage = existingBot && existingBot.about
      ? existingBot.about
      : `Welcome message`;

    // Send the about message
    subBot.sendMessage(chatId, aboutMessage, {
      reply_markup: {
        inline_keyboard: [
            [{ text: "Video va rasmlar", callback_data: "allImages" }],
            [{ text: "Asosiy menyuga qaytish ↩️", callback_data: "menu" }],
        ],
      }, parse_mode: "HTML",
    }
    );
  } catch (error) {
    console.log('Error fetching bot information:', error);
    subBot.sendMessage(chatId, 'Error occurred while fetching bot information.');
  }
}

  
  async function userLists(msg) {
    const chatId = msg.chat.id;
  
    try {
      // Fetch all bots to find the specific bot
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
        return subBot.sendMessage(chatId, "Bot topilmadi!");
      }
  
      // Find the bot that matches the current token
      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
  
      // Fetch all users associated with this bot
      const botusers = await BotUsers.find({ botId });
  
      // Send user details
      if (botusers.length === 0) {
        return subBot.sendMessage(chatId, "Bu bot uchun foydalanuvchilar topilmadi.");
      }
      let botuserList = 'Foydalanuvchi ruyxati:\n\n';
      botusers.forEach(async (bot, index) => {
  const uid =   `<a href="tg://user?id=${bot.chatId}">${bot.chatId}</a>`;
  botuserList += `${index + 1}. id: ${uid} 
  Foydalanuvchi ismi: <a href="tg://user?id=${bot.chatId}">${bot.name}</a> 
  Telefon: +${bot.phoneNumber}
  `;});
      subBot.sendMessage( chatId, botuserList,  { parse_mode: "HTML" } );
    } catch (error) {
      console.log(error);
      subBot.sendMessage(chatId, "Xatolik yuz berdi, foydalanuvchilar ro'yxati olinmadi.");
    }
  }
  

  async function userCount(msg) {
    try {
      const chatId = msg.chat.id;
      
      // Fetch all bots to find the specific bot
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
        return subBot.sendMessage(chatId, "Bot topilmadi!");
      }
  
      // Find the bot that matches the current token
      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
      const botName = currentbot.botName; // Get the bot's name
      const botUsername = currentbot.botUsername; 
      // Fetch all users associated with this bot
      const botusers = await BotUsers.find({ botId });
  
      if(botusers.length == 0){
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun foydalanuvchilar topilmadi!");
      }
      // Count all users and blocked users
      const userLength = botusers.length;
      const blockedBotUserssCount = botusers.filter(
        (user) => user.status === false
      ).length;
  
      const message =
        `@${botUsername}  uchun statistika: \n` +
        `Foydalanuvchilar: \n` +
        `Barcha foydalanuvchilar: ${userLength} \n` +
        `Bot bloklangan: ${blockedBotUserssCount} \n\n` +
        `Botni bloklagan foydalanuvchilarning hisoblagichi translyatsiya posti yuborilganda yangilanadi.`;
  
      // Send the message with user statistics
      await subBot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
  
    } catch (error) {
      console.log(error);
      subBot.sendMessage(msg.chat.id, 'Xatolik yuz berdi, statistika olinmadi.');
    }
  }
  
  

  const register = async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Fetch all bots to check the current bot's existence
        const bots = await BotModel.find();
        if (!bots || bots.length === 0) {
            return subBot.sendMessage(chatId, "Bot topilmadi!");
        }

        // Find the current bot using the bot's token
        const currentbot = bots.find(bot => bot.token === subBot.token);
        if (!currentbot) {
            return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
        }
        
        const botId = currentbot._id.toString(); // Get the bot's ObjectId
            // Fetch courses associated with the current bot
            const courses = await Course.find({ botId });
            if (courses.length === 0) {
              backCheck(msg)
                return subBot.sendMessage(chatId, "Hozirda ushbu bot uchun kurslar mavjud emas.");
            }



        // Ask for user's full name
        subBot.sendMessage(chatId, 'Ism Familiyangizni kiriting:');
        subBot.once('text', async (msg) => {
            const fullname = msg.text.trim();

            const buttons = courses.map(course => ({
                text: `${course.title}`,
            }));

            const opts = {
                reply_markup: JSON.stringify({
                    keyboard: buttons.map(button => [{ ...button }]),
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    remove_keyboard: true,
                }),
            };

            // Ask which course the user wants to join
            subBot.sendMessage(chatId, "Qaysi kursda o'qimoqchisiz?:", opts);
            subBot.once('text', async (msg) => {
                const course = msg.text.trim();

                // Ask for user's phone number
                subBot.sendMessage(chatId, 'Telefon raqamingizni kiriting:', {
                  reply_markup: JSON.stringify({
                    remove_keyboard: true,
                }),
                });
                subBot.once('text', async (msg) => {
                    const phoneNumber = msg.text.trim();

                    // Save the student's details to the database
                    try {
                        const newStudent = new reqStudent({
                            chatId: chatId,
                            fullName: fullname,
                            course: course,
                            phoneNumber: phoneNumber,
                            botId: botId, // Add botId to associate this student with the current bot
                        });

                        await newStudent.save();
                        subBot.sendMessage(chatId, "So'rovingiz muvaffaqiyatli yuborildi, adminmiz tez orada siz bilan bog'lanadi.");
                    } catch (error) {
                        console.log("So'rov qo'shishda xatolik yuz berdi:", error);
                        subBot.sendMessage(chatId, "So'rov yuborishda xatolik yuz berdi.");
                    }
                });
            });
        });
    } catch (error) {
        console.log("Xatolik yuz berdi:", error);
        subBot.sendMessage(chatId, "Xatolik yuz berdi, iltimos qayta urinib ko'ring.");
    }
};

  


function adminMenu(msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    subBot.deleteMessage(chatId, messageId);
    subBot.sendMessage(chatId, "Bo'limni tanlang  admin", {
      reply_markup: {
        inline_keyboard: [
            [{ text: "Botni sozlash", callback_data: "settingbot" },],
            [{ text: "Joylashuvni tahrirlash", callback_data: "editLocation" },
              { text: "Image Menu", callback_data: "adminImagemenu" }  ],
            [{ text: "Kurs qo'shish", callback_data: "addcourse" },],
            [{ text: "Kurslar ro'yxati", callback_data: "listcourse" },],
            [
              { text: "Kursga ro'yxatdan o'tganlar", callback_data: "getStudent" },
              { text: "So'rovlarni o'chrish", callback_data: "deleteReqStudent" },
            ],
            [  
              { text: "Kursni tahrirlash", callback_data: "editcourse" },
              { text: "Kursni o'chirish", callback_data: "deletecourse" },
            ],


          [
            { text: "Foydalanuvchilar ro'yxati", callback_data: "usersList" },
            { text: "Foydalanuvchilar statistikasi", callback_data: "userCount" },
          ],
          [
            {
              text: "Foydalanuvchilarga xabar yuborish",
              callback_data: "userSendMessage",
            },
          ],
          [{ text: "Asosiy menyuga qaytish ↩️", callback_data: "menu" }],
        ],
      },
    });
  }

    
  async function userSendMessage(msg) {
    try {
        const chatId = msg.chat.id;

        // Fetch all bots to check the current bot's existence
        const bots = await BotModel.find();
        if (!bots || bots.length === 0) {
            return subBot.sendMessage(chatId, "Bot topilmadi!");
        }

        // Determine the specific bot for the current request using the bot's token
        const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
        if (!currentbot) {
            return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
        }

        const botId = currentbot._id.toString(); // Get the bot's ObjectId
        const adminId = currentbot.adminId; // Get the bot's admin ID

        // MongoDB da status true bo'lgan foydalanuvchilarni tanlash
        const users = await BotUsers.find({ botId, status: true });

        if (chatId.toString() !== adminId) {
            return subBot.sendMessage(chatId, "Uzr, siz bu amaliyotni bajarish uchun ruxsatga ega emassiz.");
        }

        // Foydalanuvchidan xabar matnini so'rash
        await subBot.sendMessage(adminId, `Xabar matnini kiriting: `, {
            parse_mode: "Markdown",
        });
        const messageResponse = await new Promise((resolve) => {
            subBot.once("message", resolve);
        });
        const textMessage = messageResponse.text;

        // Foydalanuvchidan rasmni so'rash
        await subBot.sendMessage(adminId, `Rasmni yuboring: `, {
            parse_mode: "Markdown",
        });
        const photoMessage = await new Promise((resolve) => {
            subBot.once("photo", (msg) => {
                if (msg.photo) {
                    resolve(msg.photo[0].file_id);
                }
            });
        });

        // Foydalanuvchilarga rasm va matnni yuborish
        for (const user of users) {
            try {
                await subBot.sendPhoto(user.chatId, photoMessage, {
                    caption: textMessage,
                });
            } catch (error) {
                // Xatolikni tekshirish va uni qaytarish
                console.log(`Xabar ${user.chatId} ga yuborishda xato yuz berdi:`, error);
            }
        }

        subBot.sendMessage(adminId, "Xabar muvaffaqiyatli yuborildi.");
    } catch (error) {
        console.log("Foydalanuvchilarga xabar yuborishda xatolik yuz berdi:", error);
    }
}


// Course
const courseList = async (msg) => {
  const chatId = msg.chat.id;

  try {
      // Fetch all bots and verify the current bot
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
          return subBot.sendMessage(chatId, "Bot topilmadi!");
      }

      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot) {
          return subBot.sendMessage(chatId, "Ushbu so'rov uchun bot topilmadi!");
      }

      const botId = currentbot._id.toString(); // Get the bot's ObjectId

      // Fetch courses specific to the current bot
      const courses = await Course.find({ botId });
      if (courses.length === 0) {
          return subBot.sendMessage(chatId, "Bu bot uchun kurslar mavjud emas.");
      }

      const buttons = courses.map(course => ({
          text: `${course.title}`,
          callback_data: `COURSE_${course._id}`
      }));

      const keyboard = {
          inline_keyboard: buttons.map(button => [{ ...button }]),
      };

      subBot.sendMessage(chatId, 'Kursni tanlang:', {
          reply_markup: keyboard,
      });

  } catch (error) {
      console.log('Kurslarni olishda xatolik yuz berdi:', error);
      subBot.sendMessage(chatId, 'Kurslarni olishda xatolik yuz berdi.');
  }
};

// Callback query yordamida kurs haqida ma'lumotlarni olish
subBot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;

  if (data.startsWith('COURSE_')) {
      const courseId = data.split('_')[1];

      try {
          // Fetch the bot ID for verification
          const bots = await BotModel.find();
          if (!bots || bots.length === 0) {
              return subBot.sendMessage(callbackQuery.message.chat.id, "Bot topilmadi!");
          }

          const currentbot = bots.find(bot => bot.token === subBot.token);
          if (!currentbot) {
              return subBot.sendMessage(callbackQuery.message.chat.id, "Ushbu so'rov uchun bot topilmadi!");
          }

          const botId = currentbot._id.toString();

          // Fetch the course details only if it matches the bot ID
          const course = await Course.findOne({ _id: courseId, botId });

          if (course) {
              const message = `Kurs nomi: ${course.title}\nKurs haqida: ${course.description}\nKurs muddati: ${course.period}`;

              subBot.sendMessage(callbackQuery.message.chat.id, message);
          } else {
              subBot.sendMessage(callbackQuery.message.chat.id, 'Kurs topilmadi yoki ushbu botga tegishli emas.');
          }
      } catch (error) {
          console.error('Kursni olishda xatolik yuz berdi:', error);
          subBot.sendMessage(callbackQuery.message.chat.id, 'Kursni olishda xatolik yuz berdi.');
      }
  }
});


  async function studentreg(msg) {
    const chatId = msg.chat.id;

    try {
        // Fetch all bots to check the current bot's existence
        const bots = await BotModel.find();
        if (!bots || bots.length === 0) {
            return subBot.sendMessage(chatId, "Bot topilmadi!");
        }

        // Determine the specific bot for the current request using the bot's token
        const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
        if (!currentbot) {
            return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
        }

        const botId = currentbot._id.toString(); // Get the bot's ObjectId
        const adminId = currentbot.adminId; // Fetch adminId associated with this bot

        // Check if the user is the admin of the bot
        if (msg.chat.id.toString() !== adminId) {
            return subBot.sendMessage(chatId, "Uzr, siz bunday so'rov ruxsatiga ega emassiz.");
        }

        // Fetch all students associated with this bot
        const students = await reqStudent.find({ botId });
        if (students.length === 0) {
            return subBot.sendMessage(adminId, "Ushbu bot uchun talabalar ro'yxati bo'sh.");
        }

        // Send student information to the admin
        students.forEach(async (student) => {
            const uid = `<a href="tg://user?id=${student.chatId}">${student.chatId}</a>`;
            subBot.sendMessage(
                adminId,
                `id: ${uid} \nO'quvchi ismi familiyasi: ${student.fullName} \nQaysi kurs: ${student.course} \nTelefon: ${student.phoneNumber}`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Delete", callback_data: `DELETE_REQSTUDENT_${student._id}` }],
                        ],
                    },
                    parse_mode: "HTML",
                }
            );
        });
    } catch (error) {
        console.log("Xatolik yuz berdi:", error);
        subBot.sendMessage(chatId, "Xatolik yuz berdi, iltimos qayta urinib ko'ring.");
    }
}

  

  const addCourse = async (msg) => {
    const chatId = msg.chat.id;
  
    try {
      // Fetch all bots to check the current bot's existence
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
        return subBot.sendMessage(chatId, "Bot topilmadi!");
      }
  
      // Find the current bot using the bot's token
      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
      const adminId = currentbot.adminId;

      // Check if the user is authorized to add courses (only for a specific user)
      const infoCourse = `Kurs haqida ma'lumotlarni kiriting: 
Kimlar uchun mo'ljallangan: (Kurs kimlarga qaratilgan: boshlovchilar, o'rtacha darajadagilar yoki professional daraja uchunmi?)
Format: (Online, offline yoki aralashmi?)
O'qituvchilar: (Kim dars beradi?)
Dastur mazmuni: (Kursda o'rgatiladigan asosiy mavzularni sanab o'ting.)
Narxi: (Kurs narxi qancha?)
Aloqa ma'lumotlari: (Qo'shimcha ma'lumot uchun telefon, email yoki Telegram.)
`;
      if (msg.chat.id.toString() === adminId) { // Foydalanuvchi chat ID si tekshiriladi
        subBot.sendMessage(chatId, 'Kurs nomini kiriting:');
        subBot.once('text', async (msg) => {
          const title = msg.text.trim();
          subBot.sendMessage(chatId, infoCourse);
  
          subBot.once('text', async (msg) => {
            const description = msg.text.trim();
            subBot.sendMessage(chatId, 'Kurs mudatini kiriting:');
  
            subBot.once('text', async (msg) => {
              const period = msg.text.trim();
  
              try {
                const newCourse = new Course({
                  title: title,
                  description: description,
                  period: period,
                  botId: botId, // Associate this course with the current bot
                });
  
                await newCourse.save();
                subBot.sendMessage(chatId, 'Kurs muvaffaqiyatli qo\'shildi.');
                adminMenu(msg)
              } catch (error) {
                console.log('Kurs qo\'shishda xatolik yuz berdi:', error);
                subBot.sendMessage(chatId, 'Kurs qo\'shishda xatolik yuz berdi.');
              }
            });
          });
        });
      } else {
        subBot.sendMessage(chatId, 'Uzr, siz xizmatni qo\'shish uchun ruxsatga ega emassiz.');
      }
    } catch (error) {
      console.log("Xatolik yuz berdi:", error);
      subBot.sendMessage(chatId, "Xatolik yuz berdi, iltimos qayta urinib ko'ring.");
    }
  };
  
  
  // Xizmatni tahrirlash komandasi
  const editCourse = async (msg) => {
    const chatId = msg.chat.id;
  
    try {
      // Fetch all bots to check the current bot's existence
      const bots = await BotModel.find();
      if (!bots || bots.length === 0) {
        return subBot.sendMessage(chatId, "Bot topilmadi!");
      }
  
      // Find the current bot using the bot's token
      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot) {
        return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
  
      // Fetch courses that are associated with the current bot
      const courses = await Course.find({ botId });
      // console.log(courses._id);
      
      if (courses.length === 0) {
        return subBot.sendMessage(chatId, "Bu bot uchun kurslar mavjud emas.");
      }
  
      const buttons = courses.map(course => ({
        text: `${course.title}`,
        callback_data: `EDIT_COURCE_${course._id}`,
      }));
  
      const keyboard = {
        inline_keyboard: [buttons], // Each item is in an array to format as inline buttons
      };
  
      subBot.sendMessage(chatId, 'Kursni tanlang va tahrirlang:', { reply_markup: keyboard });
    } catch (error) {
      console.log('Kursni olishda xatolik yuz berdi:', error);
      subBot.sendMessage(chatId, 'Kursni olishda xatolik yuz berdi.');
    }
  
    // Listening for callback_query to edit the course
    subBot.on('callback_query', async (callbackQuery) => {
      const data = callbackQuery.data;
   
      if (data.startsWith('EDIT_COURCE_')) {
        const courseId = data.split('_')[2]; // Extract courseId from the callback data
  
        subBot.sendMessage(chatId, `Kurs nomini kiriting: `);
        subBot.once('text', async (msg) => {
          const title = msg.text.trim();
          subBot.sendMessage(chatId, `Kurs haqida ma'lumotlarni kiriting: `);
  
          subBot.once('text', async (msg) => {
            const description = msg.text.trim();
            subBot.sendMessage(chatId, `Kurs mudatini kiriting: `);
  
            subBot.once('text', async (msg) => {
              const period = msg.text.trim();
  
              // Updating course data
              try {
                const updatedCourse = await Course.findByIdAndUpdate(courseId, {
                  title: title,
                  description: description,
                  period: period,
                }, { new: true });
  
                if (updatedCourse) {
                  subBot.sendMessage(callbackQuery.message.chat.id, 'Kurs ma\'lumotlari muvaffaqiyatli yangilandi.');
                } else {
                  subBot.sendMessage(callbackQuery.message.chat.id, 'Kurs topilmadi.');
                }
              } catch (error) {
                console.log('Kursni yangilashda xatolik yuz berdi:', error);
                subBot.sendMessage(callbackQuery.message.chat.id, 'Kursni yangilashda xatolik yuz berdi.');
              }
            });
          });
        });
      }
    });
  };
  
// Xodimni o'chirish komandasi
const deleteCourse = async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Fetch all bots to check the current bot's existence
    const bots = await BotModel.find();
    if (!bots || bots.length === 0) {
      return subBot.sendMessage(chatId, "Bot topilmadi!");
    }

    // Find the current bot using the bot's token
    const currentbot = bots.find(bot => bot.token === subBot.token);
    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Get the bot's ObjectId

    // Fetch only the courses associated with the current bot
    const courses = await Course.find({ botId });
    if (courses.length === 0) {
      return subBot.sendMessage(chatId, "Bu bot uchun kurslar mavjud emas.");
    }

    // Create inline buttons for the courses
    const buttons = courses.map(course => ({
      text: `${course.title}`,
      callback_data: `DELETE_COURSE_${course._id}`,
    }));

    const keyboard = {
      inline_keyboard: [buttons], // Each item is an array to format as inline buttons
    };

    subBot.sendMessage(chatId, 'Kursni tanlang va o\'chiring:', { reply_markup: keyboard });
  } catch (error) {
    console.log('Kurslarni olishda xatolik yuz berdi:', error);
    subBot.sendMessage(chatId, 'Kurslarni olishda xatolik yuz berdi.');
  }
};

// Listening for callback_query to delete a course
subBot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  if (data.startsWith('DELETE_COURSE_')) {
    const courseId = data.split('_')[2]; // Extract courseId from the callback data

    try {
      // Verify that the course belongs to the current bot before deletion
      const courseToDelete = await Course.findById(courseId);
      
      if (!courseToDelete) {
        return subBot.sendMessage(callbackQuery.message.chat.id, 'Kurs topilmadi.');
      }

      // Fetch all bots to check the current bot's existence
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token);
      if (!currentbot || courseToDelete.botId.toString() !== currentbot._id.toString()) {
        return subBot.sendMessage(callbackQuery.message.chat.id, 'Ushbu kursni o\'chirishga ruxsat yo\'q.');
      }

      // Delete the course
      await Course.findByIdAndDelete(courseId);
      subBot.sendMessage(callbackQuery.message.chat.id, 'Kurs muvaffaqiyatli o\'chirildi.');
    } catch (error) {
      console.log('Kursni o\'chirishda xatolik yuz berdi:', error);
      subBot.sendMessage(callbackQuery.message.chat.id, 'Kursni o\'chirishda xatolik yuz berdi.');
    }
  }
});


  //  o'chirish komandasi
// So'rovni o'chirish komandasi
const deleteReqStudent = async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Fetch all bots to check the current bot's existence
    const bots = await BotModel.find();
    if (!bots || bots.length === 0) {
      return subBot.sendMessage(chatId, "Bot topilmadi!");
    }

    // Find the current bot using the bot's token
    const currentbot = bots.find(bot => bot.token === subBot.token);
    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Get the bot's ObjectId

    // Fetch only the reqStudents associated with the current bot
    const reqstudents = await reqStudent.find({ botId });
    if (reqstudents.length === 0) {
      return subBot.sendMessage(chatId, "Bu bot uchun so'rovlar mavjud emas.");
    }

    // Create inline buttons for the reqStudents
    const buttons = reqstudents.map(reqstudent => ({
      text: `${reqstudent.fullName}`,
      callback_data: `DELETE_REQSTUDENT_${reqstudent._id}`,
    }));

    const keyboard = {
      inline_keyboard: [buttons], // Each item is an array to format as inline buttons
    };

    subBot.sendMessage(chatId, "So'rovni tanlang va o'chiring:", { reply_markup: keyboard });
  } catch (error) {
    console.log("So'rovlarni olishda xatolik yuz berdi:", error);
    subBot.sendMessage(chatId, "So'rovlarni olishda xatolik yuz berdi.");
  }
};

// O'chirish uchun callback_queryni eshitish
subBot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  if (data.startsWith('DELETE_REQSTUDENT_')) {
    const reqstudentId = data.split('_')[2]; // Extract reqStudent ID from callback data

    try {
      // Verify the reqStudent belongs to the current bot before deletion
      const reqstudentToDelete = await reqStudent.findById(reqstudentId);
      if (!reqstudentToDelete) {
        return subBot.sendMessage(callbackQuery.message.chat.id, "So'rov topilmadi.");
      }

      // Fetch all bots to check the current bot's existence
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token);

      if (!currentbot || reqstudentToDelete.botId.toString() !== currentbot._id.toString()) {
        return subBot.sendMessage(callbackQuery.message.chat.id, "Ushbu so'rovni o'chirishga ruxsat yo'q.");
      }

      // Delete the reqStudent
      await reqStudent.findByIdAndDelete(reqstudentId);
      subBot.sendMessage(callbackQuery.message.chat.id, "So'rov muvaffaqiyatli o'chirildi.");
    } catch (error) {
      console.log("So'rovni o'chirishda xatolik yuz berdi:", error);
      subBot.sendMessage(callbackQuery.message.chat.id, "So'rovni o'chirishda xatolik yuz berdi.");
    }
  }
});



// //settings
// function settingbot(msg) {
//   const chatId = msg.chat.id;
//   const messageId = msg.message_id;
//   subBot.deleteMessage(chatId, messageId);
//   subBot.sendMessage(chatId, "Sozlamani tanlang", {
//     reply_markup: {
//       inline_keyboard: [
//           [{ text: "Kirish xabari", callback_data: "enterMessage" },],
//           [{ text: "Tel raqami", callback_data: "phoneAdd" },],
//           [{ text: "About", callback_data: "aboutEdit" },],
//           [{ text: "Manzil", callback_data: "adressEdit" },],
//           // [{ text: "Kursga ro'yxatdan o'tganlar", callback_data: "getStudent" },
//           // { text: "So'rovlrni o'chrish", callback_data: "deleteReqStudent" },],
//         [{ text: "Asosiy menyuga qaytish ↩️", callback_data: "menu" }],
//       ],
//     },
//   });
// }


  // Xizmatni tahrirlash komandasi
  const settingbot = async (msg) => {
  const aboutExample = `<code>Bizning ta'lim markazimiz - zamonaviy ta'lim yondashuvlarini joriy etgan, bilim olishni oson va samarali qilishni maqsad qilgan muassasa. Biz talabalarga turli sohalarda malaka oshirish imkoniyatlari, sifatli o'quv dasturlari va amaliy tajribalar taqdim etamiz. O'quv markazimizda har bir talabaga individual yondashuv qo'llanilib, rivojlanish uchun barcha sharoitlar yaratiladi. </code>
<code>
Ish vaqti: haftada  6 kun 
    soat: 09:00-19:00 
    Yakshanba: dam olish
</code>
  (Yoki)
<code>
Ish vaqti: 
  Dusanba: 09:00-19:00
  Seshaanba: 09:00-19:00
  Chorshanba: 09:00-19:00
  Payshanba: 09:00-19:00
  Juma: 09:00-19:00
  Shanba: 09:00-19:00
  Yakshanba: dam olish kuni
</code>`
  const welcomeExample = `<code>Xush kelibsiz! Sizning so'rovlariz va takliflaringizni qabul qilamiz. Iltimos, quyidagi bo'limlardan birini tanlang yoki xabar jo'nating, biz tez orada sizga javob beramiz.  </code>`

    try {
      const bots = await BotModel.find();
      const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
      if (!currentbot) {
        return subBot.sendMessage(msg.chat.id, "Ushbu soʻrov uchun bot topilmadi!");
      }
  
      const botId = currentbot._id.toString(); // Get the bot's ObjectId
      const botName = currentbot.botName; // Get the bot's name
      const botUsername = currentbot.botUsername; // Get the bot's name
  
      // Start the process of adding or updating a bot by asking for the phone number
      subBot.sendMessage(msg.chat.id, 'Iltimos, yangi telefon raqamini kiriting: (example: +998XXXXXXXXX)');
  
      subBot.once('text', async (msg) => {
        const newPhoneNumber = msg.text.trim();
  
        // Validate phone number format (example: +998XXXXXXXXX)
        if (!/^(\+998)[0-9]{9}$/.test(newPhoneNumber)) {
          return subBot.sendMessage(msg.chat.id, `Telefon raqami formati noto‘g‘ri. Yaroqli telefon raqamini kiriting. tugmani bosib qaytadan urining`);
        }
  
        // Ask for other fields (enterMessage, about, address)
        subBot.sendMessage(msg.chat.id, `Iltimos, yangi "kirish" xabarini kiriting: \nexample: \n${welcomeExample}`, {parse_mode: "HTML"},);
        subBot.once('text', async (msg) => {
          const newEnterMessage = msg.text.trim();
          subBot.sendMessage(msg.chat.id, `Iltimos, "biznesingiz haqida"  yangi xabarini kiriting: \nmisol: \n${aboutExample}`, {parse_mode: "HTML"},);
          subBot.once('text', async (msg) => {
            const newAbout = msg.text.trim();
  
            subBot.sendMessage(msg.chat.id, `Iltimos, yangi "manzilni" kiriting: \nexample:  City, steet  123`);
            subBot.once('text', async (msg) => {
              const newAddress = msg.text.trim();
  
              // Ask for social media links (Instagram, Telegram)
              subBot.sendMessage(msg.chat.id, `Iltimos, yangi Instagram havolasini kiriting (yoki o'tkazib yuborish uchun "none" deb yozing): \n(example: <del>https://instagram.com/</del>example)`,  {parse_mode: "HTML"},);
              subBot.once('text', async (msg) => {
                const newInstagram = msg.text.trim() !== "none" ? msg.text.trim() : null;
  
                subBot.sendMessage(msg.chat.id, `Iltimos, yangi Telegram havolasini kiriting (yoki o'tkazib yuborish uchun "none" ni kiriting): \n(example: <del>https://t.me/</del>example)`,  {parse_mode: "HTML"},);
                subBot.once('text', async (msg) => {
                  const newTelegram = msg.text.trim() !== "none" ? msg.text.trim() : null;
  
                  try {
                    // Check if a bot with the given botId already exists
                    const existingBot = await defaultBot.findOne({ botId: botId });
  
                    if (existingBot) {
                      // If bot record exists, update the bot's fields
                      const updatedBot = await defaultBot.findByIdAndUpdate(
                        existingBot._id,  // Update the existing bot by its ObjectId
                        { 
                          phone: newPhoneNumber,
                          enterMessage: newEnterMessage,
                          about: newAbout,
                          address: newAddress,
                          'socails.instagram': newInstagram,
                          'socails.telegram': newTelegram
                        },
                        { new: true }  // Return the updated bot
                      );
                      subBot.sendMessage(msg.chat.id, 'Bot information successfully updated!');
                    } else {
                      // If bot does not exist, create a new bot record with the new information
                      const newBotRecord = new defaultBot({
                        phone: newPhoneNumber,
                        enterMessage: newEnterMessage,
                        about: newAbout,
                        address: newAddress,
                        botName: botName,  // Using the current bot's name
                        botId: botId,  // Using the current bot's botId
                        socails: {
                          instagram: newInstagram,
                          telegram: newTelegram
                        }
                      });
  
                      // Save the new bot record to the database
                      await newBotRecord.save();
                      subBot.sendMessage(msg.chat.id, 'New bot information saved successfully!');
                      backCheck(msg)
                    }
                  } catch (error) {
                    console.log('Error processing bot information:', error);
                    subBot.sendMessage(msg.chat.id, 'Error processing bot information.');
                  }
                });
              });
            });
          });
        });
      });
    } catch (error) {
      console.log('Error starting the bot addition process:', error);
      subBot.sendMessage(msg.chat.id, 'Error occurred while starting the bot addition process.');
    }
  };
  
// Separate function to handle geolocation
const handleGeolocation = async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Get the bot info using its token
    const bots = await BotModel.find();
    const currentbot = bots.find(bot => bot.token === subBot.token); // Use the bot's token to identify it
    
    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }
  
    const botId = currentbot._id.toString(); // Get the bot's ObjectId

    subBot.sendMessage(chatId, 'Please share your location with me.');

    // Listen for the user's location
    subBot.once('location', async (msg) => {
      const latitude = msg.location.latitude;
      const longitude = msg.location.longitude;

      try {
        // Check if the bot already exists in the database
        const existingBot = await defaultBot.findOne({ botId: botId });

        if (existingBot) {
          // Update the existing bot with the geolocation
          await defaultBot.findByIdAndUpdate(
            existingBot._id,
            {
              'geolocation': {
                latitude: latitude,
                longitude: longitude
              },
            },
            { new: true }  // Return the updated bot
          );
          subBot.sendMessage(chatId, 'Geolocation updated successfully!');
        } else {
          // If bot doesn't exist, create a new bot record with geolocation
          const newBotRecord = new defaultBot({
            botId: botId,
            geolocation: {
              latitude: latitude,
              longitude: longitude
            },
          });

          // Save the new bot record to the database
          await newBotRecord.save();
          subBot.sendMessage(chatId, 'New bot record with geolocation created successfully!');
        }
      } catch (error) {
        console.log('Error processing geolocation:', error);
        subBot.sendMessage(chatId, 'Error occurred while processing the geolocation.');
      }
    });
  } catch (error) {
    console.log('Error in handleGeolocation function:', error);
    subBot.sendMessage(msg.chat.id, 'Error occurred while requesting geolocation.');
  }
};

//

// image


async function addImageFunc(msg) {
  const chatId = msg.chat.id;
  const name = msg.chat.first_name;

  // Barcha botlarni olish
  const bots = await BotModel.find();
  if (!bots || bots.length === 0) {
      return subBot.sendMessage(chatId, "Bot topilmadi!");
  }

  // Joriy botni aniqlash
  const currentbot = bots.find(bot => bot.token === subBot.token); // Token orqali botni aniqlash
  if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
  }

  const botId = currentbot._id.toString(); // Joriy botning ObjectId

  // `defaultBot` modelidan joriy botni topish
  const existingBot = await defaultBot.findOne({ botId: botId });
  if (!existingBot) {
      return subBot.sendMessage(chatId, "Ushbu bot uchun sozlamalar topilmadi!");
  }

  // Foydalanuvchidan rasmni yuborishni so'rash
  subBot.sendMessage(chatId, "Rasmni yuboring");

  // Rasm yuborilganini kutish
  subBot.once("photo", async (msg) => {
      try {
          if (!msg.photo || msg.photo.length === 0) {
              return subBot.sendMessage(chatId, "Rasmni yuborishda xatolik! Iltimos, qayta urinib ko'ring.");
          }

          const fileId = msg.photo[msg.photo.length - 1].file_id; // Eng katta o'lchamli rasmni olish
          const messageId = msg.message_id;

          // Ma'lumotni saqlash
          if (!Array.isArray(existingBot.imageModel)) {
              existingBot.imageModel = []; // Agar imageModel massiv bo'lmasa, yangi massiv yaratish
          }

          existingBot.imageModel.push({
              chatId: chatId,
              fileId: fileId,
              messageId: messageId
          });

          await existingBot.save();

          subBot.sendMessage(chatId, `Rasm saqlandi!`, {
              parse_mode: "Markdown",
          });
          adminImagemenu(msg)
          // console.log('Rasm defaultBot modeliga saqlandi:', existingBot);
      } catch (error) {
          console.error('Rasmni saqlashda xatolik yuz berdi:', error);
          subBot.sendMessage(chatId, "Rasmni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }
  });
}


async function adminImagemenu(msg) {
  const chatId = msg.chat.id;
  const name = msg.chat.first_name;

  try {
    // Botni aniqlash
    const bots = await BotModel.find();
    if (!bots || bots.length === 0) {
      return subBot.sendMessage(chatId, "Bot topilmadi!");
    }

    const currentbot = bots.find(bot => bot.token === subBot.token);
    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Joriy botning ID si

    // Menyuni yuborish
    subBot.sendMessage(
      chatId,
      `Xush kelibsiz! ${name}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Hamma rasmlarni ko'rish", callback_data: `adminViewImage` }],
            [{ text: "Rasm qo'shish", callback_data: `addimage` }],
            [{ text: "Rasm o'chirish", callback_data: `deleteAdminPhoto` }],
            [{ text: "Admin menyuga qaytish ↩️", callback_data: "adminMenu" }],
          ],
        },
      }
    );
  } catch (error) {
    console.error("Admin menyuni yaratishda xatolik yuz berdi:", error);
    subBot.sendMessage(chatId, "Xatolik yuz berdi, iltimos qayta urinib ko'ring.");
  }
}

const viewImageFunc = async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Botlarni aniqlash va tekshirish
    const bots = await BotModel.find();
    const currentbot = bots.find(bot => bot.token === subBot.token); // Joriy botni token asosida topish

    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Joriy botning ID si
    const botName = currentbot.botName;
    // Joriy botga tegishli hujjatni topish
    const existingBot = await defaultBot.findOne({ botId: botId });

    if (!existingBot || !existingBot.imageModel || existingBot.imageModel.length === 0) {
      return subBot.sendMessage(chatId, "Hozircha rasm mavjud emas.");
    }

    // imageModel massividagi har bir rasmni foydalanuvchiga yuborish
    for (const image of existingBot.imageModel) {
      await subBot.sendPhoto(chatId, image.fileId, {
        caption: `Markaz rasmlari`,
      });
    }

    // Menyu tugmasini qo'shish
    subBot.sendMessage(chatId, `Asosiy menyuga qaytishingiz mumkin:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Asosiy menyuga qaytish ↩️", callback_data: "menu" }],
        ],
      },
    });
  } catch (error) {
    console.log('Rasmlarni olishda yoki yuborishda xatolik yuz berdi:', error);
    subBot.sendMessage(chatId, 'Rasmlarni ko‘rsatishda xatolik yuz berdi.');
  }
};


const adminViewImage = async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Joriy botni topish
    const bots = await BotModel.find();
    const currentbot = bots.find(bot => bot.token === subBot.token); // Joriy botni token asosida topish

    if (!currentbot) {
      return subBot.sendMessage(chatId, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const botId = currentbot._id.toString(); // Joriy botning ID si

    // Joriy bot uchun defaultBot'ni olish
    const existingBot = await defaultBot.findOne({ botId: botId });

    if (!existingBot || !existingBot.imageModel || existingBot.imageModel.length === 0) {
      return subBot.sendMessage(chatId, "Hozircha rasm mavjud emas.");
    }

    const { imageModel } = existingBot;

    // imageModel massivini travers qilish va har bir rasmni yuborish
    for (const image of imageModel) {
      const buttons = [
        { text: `O'chirish`, callback_data: `DELETE_IMAGE_${image._id}` }
      ];

      const keyboard = {
        inline_keyboard: [buttons],
      };

      await subBot.sendPhoto(chatId, image.fileId, { 
        caption: `O'chirish ${image.messageId}`, 
        reply_markup: keyboard 
      });
    }

  } catch (error) {
    console.log('Xabar yuborishda xato yuz berdi:', error);
    subBot.sendMessage(chatId, "Xato yuz berdi. Iltimos, qayta urinib ko'ring.");
  }
};

const deleteAdminPhoto = async (msg) => {
  const chatId = msg.chat.id;
  try {
    // Joriy botni topish
    const bots = await BotModel.find();
    const currentbot = bots.find(bot => bot.token === subBot.token); // Joriy botni token asosida topish

    if (!currentbot) {
      return subBot.sendMessage(msg.chat.id, "Ushbu soʻrov uchun bot topilmadi!");
    }

    const adminId = currentbot.adminId; // Admin IDni joriy botdan olish
    const botId = currentbot._id.toString(); // Joriy botning ID si

    // Joriy bot uchun defaultBot'ni olish
    const existingBot = await defaultBot.findOne({ botId: botId });

    if (!existingBot || !existingBot.imageModel || existingBot.imageModel.length === 0) {
      return subBot.sendMessage(chatId, "Hozircha rasm mavjud emas.");
    }

    const { imageModel } = existingBot; // Accessing the imageModel array properly

   // imageModel massivini travers qilish va har bir rasmni yuborish
   for (const image of imageModel) {
    const buttons = [
      { text: `O'chirish`, callback_data: `DELETE_IMAGE_${image._id}` }
    ];

    const keyboard = {
      inline_keyboard: [buttons],
    };

    await subBot.sendPhoto(chatId, image.fileId, { 
      caption: `O'chirish ${image.messageId}`, 
      reply_markup: keyboard 
    });
  }


  } catch (error) {
    console.error('Imageni olishda xatolik yuz berdi:', error);
    subBot.sendMessage(msg.chat.id, 'Imageni olishda xatolik yuz berdi.');
  }
};


subBot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  if (data.startsWith('DELETE_IMAGE_')) {
    const imageId = data.split('_')[2];  // Get the ObjectId passed in the callback data

    try {
      // Correctly instantiate ObjectId with the `new` keyword
      const objectId = new mongoose.Types.ObjectId(imageId);

      // Faqat kerakli rasmni o'chirish uchun `imageModel`dagi mos elementni $pull yordamida olib tashlash
      await defaultBot.findOneAndUpdate(
        { "imageModel._id": objectId },  // Image modeldagi _id bo'yicha qidirish
        { $pull: { "imageModel": { _id: objectId } } }  // O'chirish
      );

      subBot.sendMessage(callbackQuery.message.chat.id, 'Rasm muvaffaqiyatli o\'chirildi.');
    } catch (error) {
      console.error('Imageni o\'chirishda xatolik yuz berdi:', error);
      subBot.sendMessage(callbackQuery.message.chat.id, 'Imageni o\'chirishda xatolik yuz berdi.');
    }
  }
});







// image










  subBot.on('polling_error', (error) => {
    console.log(error);  // Print the error to the console
});
  console.log(`${botData.botName} launched successfully!`);
};



const stopSubBot = async (botData) => {
  try {
    const bot = activeBots[botData.id];
    if (activeBots[botData._id]) {
      await activeBots[botData._id].stopPolling();
    }
     else {
      console.log(`Bot ${botData.botName} topilmadi yoki allaqachon to'xtatilgan.`);
    }
  } catch (err) {
    console.error(`Botni to'xtatishda xatolik: ${err.message}`);
  }
};

module.exports = { activeBots, launchSubBot, stopSubBot };