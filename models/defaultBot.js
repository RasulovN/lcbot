const { Schema, model } = require('mongoose');

const defaultBotSchema = new Schema({
    phone: {
        type: String,
    },
    enterMessage: {
        type: String
    },
    about: {
        type: String
    },
    address: {
        type: String
    },
    botName: {
        type: String
    },
    botId: {
        type: String,
    },
    socails: {
        instagram: {
            type: String,
        },
        telegram: {
            type: String,
        },
        site: {
            type: String,
        },
    },
    geolocation: {
        latitude: {
            type: Number,
        },
        longitude: {
            type: Number,
        },
    },
    imageModel: [
        {
            chatId: { type: Number, required: true },
            fileId: { type: String, required: true },
            messageId: { type: String },
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = model('defaultBot', defaultBotSchema);

