const { verifyAccessToken } = require('../utils/auth');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Extracts userId from JWT token and adds it to request object
 */

const authenticateToken = async (req, res, next) => {
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

  try {
    // Check if user is suspended
    const user = await User.findById(result.payload.userId);
    if (user && user.isSuspended()) {
      return res.status(403).json({
        success: false,
        message: user.isPermanentlyBanned 
          ? 'Account permanently banned' 
          : 'Account suspended',
        error: 'ACCOUNT_SUSPENDED',
        data: {
          isSuspended: true,
          isPermanentlyBanned: user.isPermanentlyBanned,
          suspendedUntil: user.suspendedUntil
        }
      });
    }

    // Add user info to request
    req.user = {
      userId: result.payload.userId,
      userType: result.payload.userType
    };

    next();
  } catch (error) {
    console.error('Error checking user suspension in auth middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
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
