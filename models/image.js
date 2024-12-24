const { Schema, model } = require('mongoose')

const ImageSchema = new Schema({
    chatId: { type: Number, required: true },
    fileId: { type: String, required: true },
    messageId: { type: String, },
    botId: {
        type: Schema.Types.ObjectId, // Using ObjectId for proper referencing
        ref: 'Bot', // Optional: Reference to the Bot model
      },
      botName: {
        type: String
    },
    date: { type: Date, default: Date.now }
});


module.exports = model("ImageModel", ImageSchema)