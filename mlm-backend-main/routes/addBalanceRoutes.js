const express = require("express");
const { addBalance, getRecentAddBalance } = require("../controllers/addBalanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, addBalance);
router.get("/recent", protect, getRecentAddBalance);

module.exports = router;
