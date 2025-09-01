    const express = require("express");
    const router = express.Router();
    const {
    registerUser,
    authUser,
    getUserProfile,
    // addBalance,
    // getAddAmountHistory
    } = require("../controllers/userController");
    const { protect } = require("../middleware/authMiddleware");

    // Auth
    router.post("/signup", registerUser);
    router.post("/login", authUser);
    router.get("/profile", protect, getUserProfile);

    // // Balance
    // router.post("/addbalance", protect, addBalance);
    // router.get("/getAddAmountHistory", protect, getAddAmountHistory); // ✅ add this

    module.exports = router;
