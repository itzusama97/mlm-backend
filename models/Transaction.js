const mongoose = require("mongoose")


const transactionSchema = new mongoose.Schema({
    receiver: {
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
    // commissions and totalCommission moved to Commission collection
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;   