const { Schema, model } = require('mongoose');

const CourseSchema = new Schema({
  title: String,
  description: String,
  period: {
    type: String,
  },
  botId: {
    type: Schema.Types.ObjectId, // Using ObjectId for proper referencing
    ref: 'Bot', // Optional: Reference to the Bot model
  },
  botName: {
    type: String
},
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("Course", CourseSchema);
