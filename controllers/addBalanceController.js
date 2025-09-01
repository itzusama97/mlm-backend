const AddBalance = require("../models/AddBalance");
const User = require("../models/User");

// @desc    Add balance to user account + save history
// @route   POST /api/add-balance
// @access  Private
const addBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Please provide a valid amount." });
    }

    // ✅ Update user balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance += amount;
    await user.save();

    // ✅ Save AddBalance history
    const addBalanceRecord = new AddBalance({
      user: userId,
      amount,
    });
    await addBalanceRecord.save();

    res.status(201).json({
      message: "Balance added successfully",
      newBalance: user.balance,
      record: addBalanceRecord,
    });
  } catch (error) {
    console.error("Error adding balance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get recent add balance history (last 4 records)
// @route   GET /api/add-balance/recent
// @access  Private
const getRecentAddBalance = async (req, res) => {
  try {
    const history = await AddBalance.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(4);

    res.json(history);
  } catch (error) {
    console.error("Error fetching add balance history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addBalance, getRecentAddBalance };
