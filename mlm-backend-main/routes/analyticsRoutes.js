const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getDashboardAnalytics, getSalesAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// Dashboard analytics route
router.get('/dashboard', protect, getDashboardAnalytics);

// Detailed sales analytics route
router.get('/sales', protect, getSalesAnalytics);

module.exports = router;