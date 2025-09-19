const mongoose = require("mongoose");

const addBalanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    }
}, {
    timestamps: true
});

const AddBalance = mongoose.model('AddBalance', addBalanceSchema);
module.exports = AddBalance;