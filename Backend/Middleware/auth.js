// For persistent session authentication

const jwt = require('jsonwebtoken'); //For token generation

// Token password
const JWT_SECRET = process.env.JWT_SECRET || 'StarWars-OldCodesButTheyllWork';

// Token authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization; // Grab authorization header

    // If authorization header doesn't exist, or if it doesn't start with 'Bearer'...
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // ... means no token was properly created
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Token is extracted from authorization header

    try { // Expected behaviors
        const decoded = jwt.verify(token, JWT_SECRET); // Retrieve initial payload
        req.user = decoded;  // Attach user info to request
        next(); // To pass to next middleware
    } catch (error) { // In case of error
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = authenticateToken;