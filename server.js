// This is the main server file that brings everything together.
const mongoose = require("mongoose")
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // Required for frontend-backend communication

// Import all routes
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const addBalanceRoutes = require("./routes/addBalanceRoutes");
const analyticsRoutes = require('./routes/analyticsRoutes');
const commissionRoutes = require('./routes/commissionRoutes'); // ✅ New commission routes

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Connect to the database
connectDB();

// Initialize the Express app
const app = express();

// Use CORS middleware to allow requests from your frontend
app.use(cors({
  origin: 'https://mlm-frontend-uxmz.vercel.app/',
  credentials: true
}));
// Body parser middleware to handle JSON data
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Main API routes
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use("/api/add-balance", addBalanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/commissions', commissionRoutes); // ✅ New commission routes

// Define the port from environment variables or default to 8000
const PORT = process.env.PORT || 8000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server running in mode on port ${PORT}`);
});