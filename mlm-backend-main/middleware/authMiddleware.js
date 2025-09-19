const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    console.log('🔐 Auth middleware started');
    console.log('📋 Request headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log('🎫 Token extracted:', token ? 'Present' : 'Missing');

            if (!token) {
                console.error('❌ No token found in authorization header');
                return res.status(401).json({ message: 'Not authorized, no token' });
            }

            // Check if JWT_SECRET exists
            if (!process.env.JWT_SECRET) {
                console.error('❌ JWT_SECRET not found in environment variables');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            // Verify token
            console.log('🔍 Verifying token...');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('✅ Token verified, user ID:', decoded.id);

            // Get user from the token
            console.log('👤 Looking up user in database...');
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.error('❌ User not found in database for ID:', decoded.id);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            console.log('✅ User found:', req.user.name, '(', req.user.email, ')');
            console.log('💰 User balance:', req.user.balance);

            next();
        } catch (error) {
            console.error('💥 Token verification failed:', error.message);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }

            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        console.error('❌ No Bearer token in authorization header');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };