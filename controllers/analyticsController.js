const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Commission = require('../models/Commission'); // Add this import
const moment = require('moment');

// @desc    Get user analytics data for personal dashboard
// @route   GET /api/analytics/dashboard
// @access  Private (User's personal data only)
const getDashboardAnalytics = async (req, res) => {
    try {
        const userId = req.user._id;

        // Ensure user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. User's Total Purchases (buy transactions by this user)
        const salesData = await Transaction.aggregate([
            { $match: { receiver: userId, type: "buy" } },
            { $group: { _id: null, totalSales: { $sum: { $abs: "$amount" } } } }
        ]);
        const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;

        // 2. User's Total Revenue (commissions earned by this user from referrals)
        // FIXED: Use Commission collection instead of Transaction.commissions
        const revenueData = await Commission.aggregate([
            { $match: { receiver: userId } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // 3. Today's Commission (for the clickable box)
        const startOfToday = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        // FIXED: Use Commission collection
        const todayCommissionData = await Commission.aggregate([
            { 
                $match: { 
                    receiver: userId,
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: null,
                    todayCommission: { $sum: "$amount" }
                }
            }
        ]);
        const todayCommission = todayCommissionData.length > 0 ? todayCommissionData[0].todayCommission : 0;

        // Calculate yesterday's commission for percentage change
        const startOfYesterday = moment().subtract(1, 'day').startOf('day').toDate();
        const endOfYesterday = moment().subtract(1, 'day').endOf('day').toDate();

        // FIXED: Use Commission collection
        const yesterdayCommissionData = await Commission.aggregate([
            { 
                $match: { 
                    receiver: userId,
                    createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }
                }
            },
            {
                $group: {
                    _id: null,
                    yesterdayCommission: { $sum: "$amount" }
                }
            }
        ]);
        const yesterdayCommission = yesterdayCommissionData.length > 0 ? yesterdayCommissionData[0].yesterdayCommission : 0;

        // Calculate today's commission percentage change
        let todayCommissionChange = '0%';
        let todayCommissionTrend = 'same';
        
        if (yesterdayCommission > 0) {
            const changePercent = ((todayCommission - yesterdayCommission) / yesterdayCommission * 100);
            todayCommissionChange = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
            todayCommissionTrend = todayCommission > yesterdayCommission ? 'up' : todayCommission < yesterdayCommission ? 'down' : 'same';
        } else if (todayCommission > 0) {
            todayCommissionChange = '+100%';
            todayCommissionTrend = 'up';
        }

        // 4. Current User Balance
        const currentBalance = user.balance || 0;

        // 5. User's Transaction Count
        const transactionCount = await Transaction.countDocuments({ receiver: userId, type: "buy" });

        // Weekly data ranges
        const startOfWeek = moment().startOf('isoWeek');
        const startOfLastWeek = moment().subtract(1, 'weeks').startOf('isoWeek');

        // Helper function to get weekly grouped data for purchases
        const getWeeklyPurchaseData = async (startDate, endDate) => {
            return Transaction.aggregate([
                { $match: { receiver: userId, type: "buy", createdAt: { $gte: startDate, $lt: endDate } } },
                {
                    $group: {
                        _id: { $dayOfWeek: "$createdAt" },
                        total: { $sum: { $abs: "$amount" } }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        day: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id", 1] }, then: "Sun" },
                                    { case: { $eq: ["$_id", 2] }, then: "Mon" },
                                    { case: { $eq: ["$_id", 3] }, then: "Tue" },
                                    { case: { $eq: ["$_id", 4] }, then: "Wed" },
                                    { case: { $eq: ["$_id", 5] }, then: "Thu" },
                                    { case: { $eq: ["$_id", 6] }, then: "Fri" },
                                    { case: { $eq: ["$_id", 7] }, then: "Sat" }
                                ],
                                default: "N/A"
                            }
                        },
                        total: 1
                    }
                }
            ]);
        };

        // Helper function to get weekly grouped data for commissions
        const getWeeklyCommissionData = async (startDate, endDate) => {
            return Commission.aggregate([
                { $match: { receiver: userId, createdAt: { $gte: startDate, $lt: endDate } } },
                {
                    $group: {
                        _id: { $dayOfWeek: "$createdAt" },
                        total: { $sum: "$amount" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        day: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$_id", 1] }, then: "Sun" },
                                    { case: { $eq: ["$_id", 2] }, then: "Mon" },
                                    { case: { $eq: ["$_id", 3] }, then: "Tue" },
                                    { case: { $eq: ["$_id", 4] }, then: "Wed" },
                                    { case: { $eq: ["$_id", 5] }, then: "Thu" },
                                    { case: { $eq: ["$_id", 6] }, then: "Fri" },
                                    { case: { $eq: ["$_id", 7] }, then: "Sat" }
                                ],
                                default: "N/A"
                            }
                        },
                        total: 1
                    }
                }
            ]);
        };

        // Purchases - Current Week
        const currentWeekPurchases = await getWeeklyPurchaseData(startOfWeek.toDate(), new Date());

        // Purchases - Last Week
        const lastWeekPurchases = await getWeeklyPurchaseData(startOfLastWeek.toDate(), startOfWeek.toDate());

        // Commissions - Current Week
        const currentWeekCommissions = await getWeeklyCommissionData(startOfWeek.toDate(), new Date());

        // Commissions - Last Week
        const lastWeekCommissions = await getWeeklyCommissionData(startOfLastWeek.toDate(), startOfWeek.toDate());

        // Merge data into chart-friendly format
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyData = days.map(day => {
            return {
                day,
                purchases: currentWeekPurchases.find(d => d.day === day)?.total || 0,
                prevPurchases: lastWeekPurchases.find(d => d.day === day)?.total || 0,
                commissions: currentWeekCommissions.find(d => d.day === day)?.total || 0,
                prevCommissions: lastWeekCommissions.find(d => d.day === day)?.total || 0,
            };
        });

        const responseData = {
            stats: {
                totalSales: {
                    value: totalSales,
                    change: '+12%', // static for now
                    trend: 'up'
                },
                totalRevenue: {
                    value: totalRevenue,
                    change: '+15%', // static for now
                    trend: 'up'
                },
                todayCommission: {
                    value: todayCommission,
                    change: todayCommissionChange,
                    trend: todayCommissionTrend
                },
                currentBalance: {
                    value: currentBalance,
                    change: '+5%', // static for now
                    trend: 'up'
                },
                transactionCount: {
                    value: transactionCount,
                    change: '+8%', // static for now
                    trend: 'up'
                }
            },
            weeklyData,
            userInfo: {
                name: user.name || '',
                email: user.email || '',
                referralCode: user.referralCode || '',
                joinDate: user.createdAt || new Date()
            }
        };

        console.log('Sending analytics data:', JSON.stringify(responseData, null, 2));
        res.json(responseData);

    } catch (error) {
        console.error('User analytics fetch error:', error);
        res.status(500).json({
            message: 'Server error while fetching user analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Get detailed sales analytics
// @route   GET /api/analytics/sales
// @access  Private
const getSalesAnalytics = async (req, res) => {
    try {
        // Daily sales for last 30 days
        const dailySales = await Transaction.aggregate([
            {
                $match: {
                    type: "buy",
                    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdAt" },
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    totalSales: { $sum: { $abs: "$amount" } },
                    totalTransactions: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Top users by purchase amount
        const topUsers = await Transaction.aggregate([
            { $match: { type: "buy" } },
            {
                $group: {
                    _id: "$receiver", // FIXED: Changed from "buyer" to "receiver"
                    totalPurchases: { $sum: { $abs: "$amount" } },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { totalPurchases: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    userName: "$user.name",
                    userEmail: "$user.email",
                    totalPurchases: 1,
                    transactionCount: 1
                }
            }
        ]);

        res.json({
            dailySales: dailySales || [],
            topUsers: topUsers || []
        });

    } catch (error) {
        console.error('Sales analytics error:', error);
        res.status(500).json({
            message: 'Server error while fetching sales analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    } 
};

module.exports = {
    getDashboardAnalytics,
    getSalesAnalytics
};