// models/Subscription.js

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    botToken: { type: String, required: true },
    userId: { type: String, required: true },
    subscriptionType: { type: String, required: true }, // 'monthly', 'yearly'
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
