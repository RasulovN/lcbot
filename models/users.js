const { Schema, model, Types } = require('mongoose');

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    chatId: {
        type: Number,
        required: true
    },
    // subscriptionType: { type: String, enum: ['1-month','6-month', 'demo',  '12-month', "full"], default: null },
    // subscriptionEndDate: { type: Date, default: null },
    // payments: [
    //     {
    //         providerPaymentChargeId: String,
    //         telegramPaymentChargeId: String,
    //         amount: Number,
    //         date: { type: Date, default: Date.now }
    //     }
    // ],
    phoneNumber: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
        default: false
    },
    action: {
        type: String
    },
    status: {
        type: Boolean,
        default: true
    },
    bots: {
        type: Array,
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = model('User', UserSchema);
