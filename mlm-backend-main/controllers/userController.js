const User = require('../models/User');
const Transaction = require('../models/Transaction'); // ✅ Import Transaction model
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


// Generate unique 6-digit referral code
const generateReferralCode = (length = 6) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const allChars = letters + numbers;

    let result = [];
    result.push(letters[Math.floor(Math.random() * letters.length)]);
    result.push(numbers[Math.floor(Math.random() * numbers.length)]);

    for (let i = result.length; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allChars.length);
        result.push(allChars[randomIndex]);
    }

    result = result.sort(() => Math.random() - 0.5);

    return result.join('');
};

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '2d',
    });
};

// @desc    Register a new user
// @route   POST /api/users/signup
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, referredBy } = req.body;

    try {
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Handle referral validation
        let validReferrerId = null;
        
        // Only check for referrer if referredBy is provided and not empty
        if (referredBy && referredBy.trim() !== '') {
            const validReferrer = await User.findOne({ referralCode: referredBy.trim() });
            if (!validReferrer) {
                return res.status(400).json({ message: 'Invalid referral code!' });
            }
            validReferrerId = validReferrer._id; // Store the ObjectId, not the referral code
        }

        // Generate unique referral code for the new user
        let referralCode;
        let isCodeUnique = false;
        while (!isCodeUnique) {
            referralCode = generateReferralCode();
            const existingUser = await User.findOne({ referralCode });
            if (!existingUser) {
                isCodeUnique = true;
            }
        }

        // Create user data object
        const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            referralCode,
            balance: 0,
        };

        // Only add referredBy if we have a valid referrer
        if (validReferrerId) {
            userData.referredBy = validReferrerId;
        }
        // If no referrer, don't set referredBy field at all (it will default to null)

        // Create the user
        const user = await User.create(userData);

        if (user) {
            // Populate the referredBy field to get referral code for response
            const populatedUser = await User.findById(user._id).populate('referredBy', 'referralCode');

            res.status(201).json({
                _id: populatedUser._id,
                name: populatedUser.name,
                email: populatedUser.email,
                referredBy: populatedUser.referredBy ? populatedUser.referredBy.referralCode : null,
                referralCode: populatedUser.referralCode,
                balance: populatedUser.balance,
                token: generateToken(populatedUser._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() }).populate('referredBy', 'referralCode');

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                referredBy: user.referredBy ? user.referredBy.referralCode : null,
                referralCode: user.referralCode,
                balance: user.balance,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('referredBy', 'referralCode');

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                referredBy: user.referredBy ? user.referredBy.referralCode : null,
                referralCode: user.referralCode,
                balance: user.balance,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: error.message });
    }
};

// // @desc    Add balance to user account + create transaction
// // @route   POST /api/users/addbalance
// // @access  Private
// const addBalance = async (req, res) => {
//   const { amount } = req.body;

//   if (!amount || amount <= 0) {
//     res.status(400);
//     throw new Error("Please provide a valid amount");
//   }

//   const user = await User.findById(req.user._id);

//   if (!user) {
//     res.status(404);
//     throw new Error("User not found");
//   }

//   // ✅ Update balance
//   user.balance += amount;
//   await user.save();

//   // ✅ Create a new transaction
//   const transaction = await Transaction.create({
//     user: req.user._id,
//     type: "add_balance",
//     amount,
//   });

//   // ✅ Fetch last 4 add-balance transactions for UI
//   const lastTransactions = await Transaction.find({
//     user: req.user._id,
//     type: "add_balance",
//   })
//     .sort({ createdAt: -1 })
//     .limit(4);

//   res.status(201).json({
//     message: "Balance added successfully",
//     newBalance: user.balance,
//     transaction,
//     lastTransactions,
//   });
// };

// // If you want a separate endpoint for add-balance history specifically:
// const getAddAmountHistory = async (req, res) => {
//     try {
//         const addAmountHistory = await Transaction.find({ 
//             user: req.user._id,
//             type: "add-balance"
//         })
//             .sort({ createdAt: -1 })
//             .limit(4)
//             .select('amount createdAt')
//             .lean();

//         res.json(addAmountHistory);
//     } catch (error) {
//         console.error("Error fetching add amount history:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// };

module.exports = { registerUser, authUser, getUserProfile };