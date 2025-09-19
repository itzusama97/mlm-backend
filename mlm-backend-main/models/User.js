const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,  
        ref: 'User',                           // ✅ Added reference to User model
        default: null,
    },
    referralCode: {
        type: String,
        unique: true,
    },
      balance: {
        type: Number,
        default: 0, // Shuru mein balance 0 hoga
    },
}, {
    timestamps: true,  // ✅ Optional: adds createdAt and updatedAt fields
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;