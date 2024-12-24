const { Schema, model } = require('mongoose');
const BotUserSchema = require('./botusers');

const BotSchema = new Schema({
    adminId: {
        type: String,
        required: true,
    },
    botId: {
        type: String,
        required: true,
    },
    isActive:{ type: Boolean, default: false}, 
    token: {
        type: String,
        required: true,
    },
    botName: {
        type: String,
        required: true,
    },
    botUsername: {
        type: String,
    },
    // botusers: [BotUserSchema], // Sub-users for this bot
    botusers: {
      type: Array, // Array to hold user data dynamically
      default: [],
  },
  subscriptionType: { type: String, enum: ['1-month','6-month', 'demo',  '12-month', "full"], default: null },
  subscriptionEndDate: { type: Date, default: null },
  payments: [
      {
          providerPaymentChargeId: String,
          telegramPaymentChargeId: String,
          amount: Number,
          date: { type: Date, default: Date.now }
      }
  ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = model('BotModel', BotSchema);
