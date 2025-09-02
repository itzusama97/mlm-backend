const mongoose = require("mongoose");

// Stores one row per commission payout generated from a transaction
// sender: the user whose action generated the commission (previously buyer)
// receiver: the user who receives the commission (referrer at a given level)
const commissionSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
    },
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
}, { timestamps: true });

const Commission = mongoose.model('Commission', commissionSchema);
module.exports = Commission;


