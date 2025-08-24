const { verifyAccessToken } = require('../utils/auth');

/**
 * Authentication Middleware
 * Extracts userId from JWT token and adds it to request object
 */

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const result = verifyAccessToken(token);
  
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    });
  }

  // Add user info to request
  req.user = {
    userId: result.payload.userId,
    userType: result.payload.userType
  };

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = verifyAccessToken(token);
    
    if (result.valid) {
      req.user = {
        userId: result.payload.userId,
        userType: result.payload.userType
      };
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};
