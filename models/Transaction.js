const mongoose = require("mongoose")


const transactionSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: { // ✅ new field: transaction ka type
        type: String,
        enum: ["buy", "add-balance"], // dono cases cover
        required: true,
    },
    amount: { // ✅ new field: simple transaction amount
        type: Number,
        required: true,
    },
    totalCommission: {
        type: Number,
        default: 0, // add-balance case me commission nahi hoga
    },
    commissions: [{
        level: Number,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        commissionAmount: Number
    }],
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;   