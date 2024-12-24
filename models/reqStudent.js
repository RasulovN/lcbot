const { Schema, model } = require('mongoose')

const reqStudentSchema = new Schema({
    chatId: String,
    fullName: String,
    phoneNumber: String,
    course: {
        type: String,
    },
    botId: {
        type: Schema.Types.ObjectId, // Using ObjectId for proper referencing
        ref: 'Bot', // Optional: Reference to the Bot model
      },
      botName: {
        type: String
    },
    createdAt: Date,
})

module.exports = model("reqStudent", reqStudentSchema)