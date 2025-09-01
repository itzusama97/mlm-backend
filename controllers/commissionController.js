const User = require('../models/User');
const Transaction = require('../models/Transaction');
const moment = require('moment');

// @desc    Get today's commission summary for dashboard
// @route   GET /api/commissions/today-summary
// @access  Private
const getTodayCommissionSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get today's start and end
        const startOfToday = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        // Calculate today's total commission
        const todayCommissionData = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 }
                }
            }
        ]);

        const todayCommission = todayCommissionData.length > 0 ? todayCommissionData[0].totalCommission : 0;
        const todayTransactionCount = todayCommissionData.length > 0 ? todayCommissionData[0].transactionCount : 0;

        // Calculate yesterday's commission for comparison
        const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
        const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

        const yesterdayCommissionData = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: "$commissions.commissionAmount" }
                }
            }
        ]);

        const yesterdayCommission = yesterdayCommissionData.length > 0 ? yesterdayCommissionData[0].totalCommission : 0;

        // Calculate percentage change
        let changePercentage = 0;
        let trend = 'same';
        
        if (yesterdayCommission > 0) {
            changePercentage = ((todayCommission - yesterdayCommission) / yesterdayCommission * 100).toFixed(1);
            trend = todayCommission > yesterdayCommission ? 'up' : todayCommission < yesterdayCommission ? 'down' : 'same';
        } else if (todayCommission > 0) {
            changePercentage = 100;
            trend = 'up';
        }

        res.json({
            todayCommission,
            changePercentage: `${changePercentage > 0 ? '+' : ''}${changePercentage}%`,
            trend,
            transactionCount: todayTransactionCount
        });

    } catch (error) {
        console.error('Today commission summary error:', error);
        res.status(500).json({
            message: 'Server error while fetching today commission summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Get detailed commission analytics for today
// @route   GET /api/commissions/today-detailed
// @access  Private
const getTodayDetailedCommissions = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get today's start and end
        const startOfToday = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        // 1. Get today's total commission
        const todayCommissionData = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 }
                }
            }
        ]);

        const totalTodayCommission = todayCommissionData.length > 0 ? todayCommissionData[0].totalCommission : 0;
        const totalTransactions = todayCommissionData.length > 0 ? todayCommissionData[0].transactionCount : 0;

        // 2. Get commission breakdown by user (who made the purchase that generated commission)
        const commissionByUsers = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: "$buyer", // Group by the buyer who made the purchase
                    totalCommissionFromUser: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 },
                    levels: { $push: "$commissions.level" } // Track which levels
                }
            },
            { $sort: { totalCommissionFromUser: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "buyerInfo"
                }
            },
            { $unwind: "$buyerInfo" },
            {
                $project: {
                    buyerId: "$_id",
                    buyerName: "$buyerInfo.name",
                    buyerEmail: "$buyerInfo.email",
                    buyerReferralCode: "$buyerInfo.referralCode",
                    totalCommissionFromUser: 1,
                    transactionCount: 1,
                    levels: 1,
                    averageLevel: { $avg: "$levels" }
                }
            }
        ]);

        // 3. Get hourly breakdown for chart
        const hourlyCommissions = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    totalCommission: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    _id: 0,
                    hour: "$_id",
                    totalCommission: 1,
                    transactionCount: 1,
                    hourLabel: {
                        $concat: [
                            { $toString: "$_id" },
                            ":00"
                        ]
                    }
                }
            }
        ]);

        // 4. Get commission breakdown by level
        const commissionByLevel = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: "$commissions.level",
                    totalCommission: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 5. Get recent transactions that generated commission
        const recentCommissionTransactions = await Transaction.find({
            "commissions.user": userId,
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        })
        .populate('buyer', 'name email referralCode')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('buyer amount totalCommission commissions createdAt type')
        .lean();

        // Filter to show only the commission relevant to this user
        const processedRecentTransactions = recentCommissionTransactions.map(transaction => {
            const userCommission = transaction.commissions.find(comm => comm.user.toString() === userId.toString());
            return {
                _id: transaction._id,
                buyer: transaction.buyer,
                purchaseAmount: Math.abs(transaction.amount),
                myCommission: userCommission ? userCommission.commissionAmount : 0,
                level: userCommission ? userCommission.level : 0,
                createdAt: transaction.createdAt,
                type: transaction.type
            };
        });

        res.json({
            summary: {
                totalTodayCommission,
                totalTransactions,
                date: moment().format('YYYY-MM-DD'),
                dateFormatted: moment().format('MMMM Do, YYYY')
            },
            commissionByUsers,
            hourlyCommissions,
            commissionByLevel,
            recentTransactions: processedRecentTransactions
        });

    } catch (error) {
        console.error('Today detailed commissions error:', error);
        res.status(500).json({
            message: 'Server error while fetching today detailed commissions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Get commission analytics for a specific date range
// @route   GET /api/commissions/date-range
// @access  Private
const getCommissionsByDateRange = async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.query;

        // Default to today if no dates provided
        const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('day').toDate();
        const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();

        const commissionData = await Transaction.aggregate([
            { $unwind: "$commissions" },
            { 
                $match: { 
                    "commissions.user": userId,
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalCommission: { $sum: "$commissions.commissionAmount" },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        }
                    },
                    totalCommission: 1,
                    transactionCount: 1,
                    _id: 0
                }
            }
        ]);

        res.json({
            dateRange: {
                start: moment(start).format('YYYY-MM-DD'),
                end: moment(end).format('YYYY-MM-DD')
            },
            commissionData
        });

    } catch (error) {
        console.error('Commission date range error:', error);
        res.status(500).json({
            message: 'Server error while fetching commission date range',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};


// controllers/commissionController.js
const getWeeklyCommissions = async (req, res) => {
  try {
    const userId = req.user._id;

    const last7Days = moment().subtract(6, "days").startOf("day").toDate();

    const data = await Transaction.aggregate([
      { $unwind: "$commissions" },
      {
        $match: {
          "commissions.user": userId,
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalCommission: { $sum: "$commissions.commissionAmount" },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (error) {
    console.error("Weekly commission error:", error);
    res.status(500).json({ message: "Failed to fetch weekly commissions" });
  }
};


module.exports = {
    getTodayCommissionSummary,
    getTodayDetailedCommissions,
    getCommissionsByDateRange,
    getWeeklyCommissions
};