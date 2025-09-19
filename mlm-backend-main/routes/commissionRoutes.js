const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
    getTodayCommissionSummary, 
    getTodayDetailedCommissions,
    getCommissionsByDateRange,
    getWeeklyCommissions
} = require('../controllers/commissionController');

const router = express.Router();

// Get today's commission summary for dashboard box
router.get('/today-summary', protect, getTodayCommissionSummary);

// Get detailed commission analytics for today (for the detailed page)
router.get('/today-detailed', protect, getTodayDetailedCommissions);

// Get commission data for specific date range
router.get('/date-range', protect, getCommissionsByDateRange);
router.get('/summary', protect, getWeeklyCommissions);


module.exports = router;