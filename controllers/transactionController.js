const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');

// Commission percentages for different levels
const COMMISSION_PERCENTAGES = {
    '1-3': 0.15,
    '4-7': 0.10,
    '8-10': 0.03,
};

// @desc    Create a new transaction and distribute commissions
// @route   POST /api/transactions/buy
// @access  Private (User should be logged in)
const createTransaction = async (req, res) => {
    // User ID who is making the transaction, this will come from auth middleware
    const buyerId = req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Please provide a valid transaction amount.' });
    }

    // Start a new Mongoose session for the transaction
    const session = await mongoose.startSession();

    try {
        // Use a transaction to ensure all database operations are atomic
        await session.withTransaction(async () => {
            // Step 1: Find the buyer and update their balance
            const buyer = await User.findById(buyerId).session(session);

            if (!buyer) {
                // If buyer is not found, throw an error to abort the transaction
                throw new Error('Buyer not found.');
            }

            if (buyer.balance < amount) {
                // If insufficient balance, throw an error
                throw new Error('Insufficient balance to complete the transaction.');
            }

            // Deduct the amount from the buyer's balance
            buyer.balance -= amount;
            await buyer.save({ session });

            // Step 2: Calculate and distribute commissions
            const totalCommission = amount * 0.20; // 20% commission on the total amount

            let commissionsArray = [];
            let currentUserId = buyerId;
            
            // Loop through the referral chain up to 10 levels
            for (let level = 1; level <= 10; level++) {
                const currentUser = await User.findById(currentUserId).session(session);
                if (!currentUser || !currentUser.referredBy) {
                    // If there's no user or no referrer, the chain ends
                    break;
                }

                const referrerUser = await User.findById(currentUser.referredBy).session(session);

                let levelCommissionPercentage;
                if (level >= 1 && level <= 3) {
                    levelCommissionPercentage = COMMISSION_PERCENTAGES['1-3'];
                } else if (level >= 4 && level <= 7) {
                    levelCommissionPercentage = COMMISSION_PERCENTAGES['4-7'];
                } else if (level >= 8 && level <= 10) {
                    levelCommissionPercentage = COMMISSION_PERCENTAGES['8-10'];
                }

                if (levelCommissionPercentage) {
                    const commissionAmount = totalCommission * levelCommissionPercentage;

                    // Update the referrer's balance
                    referrerUser.balance += commissionAmount;
                    await referrerUser.save({ session });

                    // Add commission details to the array
                    commissionsArray.push({
                        level: level,
                        user: referrerUser._id,
                        commissionAmount: commissionAmount,
                    });
                }

                // Move to the next level in the chain
                currentUserId = referrerUser._id;
            }

            // Step 3: Create a new transaction record
            const transaction = new Transaction({
                buyer: buyerId,
                type: "buy", // ✅ mark transaction as "buy"
                amount: -amount, // ✅ Negative amount since money is going out
                totalCommission,
                commissions: commissionsArray,
            });
            await transaction.save({ session });

            // Send a success response after the transaction is committed
            res.status(201).json({
                message: 'Transaction completed successfully and commissions have been distributed.',
                buyerBalance: buyer.balance,
                transaction,
            });
        });
    } catch (error) {
        // If an error occurs, the transaction will be aborted automatically
        res.status(500).json({ message: error.message });
    } finally {
        // End the session
        await session.endSession();
    }
};

// @desc    Get recent transaction history (last 4 transactions)
// @route   GET /api/transactions/recent
// @access  Private
const getRecentTransactions = async (req, res) => {
    try {
        // Fetch last 4 transactions for the logged-in user
        const transactions = await Transaction.find({ buyer: req.user._id })
            .sort({ createdAt: -1 })
            .limit(4) // ✅ Only show recent 4 transactions
            .select('type amount createdAt totalCommission') // Select only needed fields
            .lean(); // For better performance

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Server error" });
    }
};



module.exports = { createTransaction, getRecentTransactions };