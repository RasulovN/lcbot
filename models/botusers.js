const { Schema, model } = require('mongoose');

const BotUserSchema = new Schema({
    name: String,
    chatId: Number,
    phoneNumber: String,
    botName: String,
    botId: {
        type: String,
    },
    admin: {
        type: Boolean,
        default: false
    },
    action: String,
    status: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// module.exports = BotUserSchema;
module.exports = model('BotUser', BotUserSchema);
