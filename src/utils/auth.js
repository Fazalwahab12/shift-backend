const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Authentication Utilities
 * Handles JWT token generation, verification, and refresh token management
 */

// JWT configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m', // 15 minutes
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '365d', // 1 year (effectively never expires)
  ISSUER: 'shift-backend',
  AUDIENCE: 'shift-mobile-app'
};

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId, userType, userData = {}) => {
  const payload = {
    userId,
    userType,
    phoneNumber: userData.phoneNumber || '',
    countryCode: userData.countryCode || '+968',
    isPhoneVerified: userData.isPhoneVerified || false,
    onboardingCompleted: userData.onboardingCompleted || false,
    profileCompleted: userData.profileCompleted || false,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    iss: JWT_CONFIG.ISSUER,
    aud: JWT_CONFIG.AUDIENCE
  };

  return jwt.sign(payload, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY
  });
};

/**
 * Generate refresh token (long-lived, doesn't expire automatically)
 */
const generateRefreshToken = (userId, userType) => {
  const payload = {
    userId,
    userType,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    iss: JWT_CONFIG.ISSUER,
    aud: JWT_CONFIG.AUDIENCE
  };

  return jwt.sign(payload, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY
  });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      valid: true,
      payload: decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      valid: true,
      payload: decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = (userId, userType, userData = {}) => {
  const accessToken = generateAccessToken(userId, userType, userData);
  const refreshToken = generateRefreshToken(userId, userType);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = (refreshToken, userData = {}) => {
  const refreshResult = verifyRefreshToken(refreshToken);
  
  if (!refreshResult.valid) {
    return {
      success: false,
      error: 'Invalid refresh token'
    };
  }

  // Generate new access token
  // Use userType from userData if available, otherwise from refresh token
  const userType = userData.userType || refreshResult.payload.userType;
  const newAccessToken = generateAccessToken(
    refreshResult.payload.userId, 
    userType,
    userData
  );

  return {
    success: true,
    accessToken: newAccessToken,
    tokenType: 'Bearer',
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
};

/**
 * Generate OTP (for development/testing)
 */
const generateOTP = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

/**
 * Verify OTP (mock implementation - replace with actual SMS provider integration)
 * For development: Accept any 4-6 digit OTP
 * TODO: Replace with strict SMS provider verification in production
 */
const verifyOTP = async (phoneNumber, otp) => {
  // For development: Accept any 4-6 digit OTP
  // TODO: Replace with actual SMS provider verification in production
  
  if (!otp || otp.length < 4 || otp.length > 6 || !/^\d+$/.test(otp)) {
    return {
      valid: false,
      error: 'Invalid OTP format - must be 4-6 digits'
    };
  }

  // For development: Accept any valid format OTP
  // In production, this will verify with Oman SMS provider
  console.log(`🔧 DEV MODE: Accepting any OTP for ${phoneNumber}: ${otp}`);
  
  return {
    valid: true,
    message: 'OTP verified successfully (Dev Mode)'
  };
};

/**
 * Send OTP via SMS (mock implementation)
 */
const sendOTP = async (phoneNumber, countryCode = '+968') => {
  // TODO: Replace with actual SMS provider integration
  // For now, generate and return OTP for development
  
  const otp = generateOTP(6);
  
  // Mock SMS sending
  console.log(`📱 Mock SMS sent to ${countryCode}${phoneNumber}: Your OTP is ${otp}`);
  
  return {
    success: true,
    message: 'OTP sent successfully',
    otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only return OTP in development
  };
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

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
  const token = extractTokenFromHeader(authHeader);

  if (token) {
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
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  generateOTP,
  verifyOTP,
  sendOTP,
  authenticateToken,
  optionalAuth,
  extractTokenFromHeader,
  JWT_CONFIG
};
