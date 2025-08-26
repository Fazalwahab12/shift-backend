const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// OMANTEL OTP SERVICE - Comment out for testing
// const omantelOTPService = require('../services/omantelOTPService');
const logger = require('./logger');

// Store authentication IDs temporarily (use Redis in production)
const otpStore = new Map();
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



// OMANTEL OTP VERIFICATION - Commented out for testing
/*
const verifyOTP = async (phoneNumber, otp, countryCode = '+968') => {
  try {
    const storeKey = `${countryCode}${phoneNumber}`;
    const storedData = otpStore.get(storeKey);
    
    if (!storedData) {
      logger.warn('OTP verification failed - no stored data', { phoneNumber: storeKey });
      return {
        valid: false,
        error: 'No OTP request found or expired'
      };
    }
    
    // Check attempts limit
    if (storedData.attempts >= 3) {
      otpStore.delete(storeKey);
      logger.warn('OTP verification failed - too many attempts', { phoneNumber: storeKey });
      return {
        valid: false,
        error: 'Too many verification attempts'
      };
    }
    
    // Increment attempts
    storedData.attempts += 1;
    otpStore.set(storeKey, storedData);
    
    // Verify with Omantel
    logger.info('Verifying OTP with Omantel', { 
      phoneNumber: storeKey, 
      attempt: storedData.attempts,
      authenticationId: storedData.authenticationId
    });
    
    const result = await omantelOTPService.verifyOTP(storedData.authenticationId, otp);
    
    // Clean up on success
    if (result.valid) {
      otpStore.delete(storeKey);
      logger.info('OTP verified successfully', { phoneNumber: storeKey });
    }
    
    return result;
  } catch (error) {
    logger.error('Verify OTP error', { error: error.message, phoneNumber: `${countryCode}${phoneNumber}` });
    return {
      valid: false,
      error: error.message
    };
  }
};
*/

/**
 * MOCK OTP VERIFICATION - For testing purposes
 * Remove this and uncomment Omantel version above for production
 */
const verifyOTP = async (phoneNumber, otp, countryCode = '+968') => {
  try {
    const storeKey = `${countryCode}${phoneNumber}`;
    const storedData = otpStore.get(storeKey);
    
    if (!storedData) {
      logger.warn('MOCK OTP verification failed - no stored data', { phoneNumber: storeKey });
      return {
        valid: false,
        error: 'No OTP request found or expired'
      };
    }
    
    // Check attempts limit
    if (storedData.attempts >= 3) {
      otpStore.delete(storeKey);
      logger.warn('MOCK OTP verification failed - too many attempts', { phoneNumber: storeKey });
      return {
        valid: false,
        error: 'Too many verification attempts'
      };
    }
    
    // Increment attempts
    storedData.attempts += 1;
    otpStore.set(storeKey, storedData);
    
    // MOCK: Accept any 4-digit code or '1234' for testing
    logger.info('MOCK OTP verification', { 
      phoneNumber: storeKey, 
      attempt: storedData.attempts,
      otp: otp
    });
    
    const isValidOTP = /^\d{4}$/.test(otp) || otp === '1234';
    
    if (isValidOTP) {
      otpStore.delete(storeKey);
      logger.info('MOCK OTP verified successfully', { phoneNumber: storeKey });
      return {
        valid: true,
        success: true
      };
    }
    
    return {
      valid: false,
      error: 'Invalid OTP code'
    };
  } catch (error) {
    logger.error('MOCK Verify OTP error', { error: error.message, phoneNumber: `${countryCode}${phoneNumber}` });
    return {
      valid: false,
      error: error.message
    };
  }
};

// OMANTEL OTP SEND - Commented out for testing
/*
const sendOTP = async (phoneNumber, countryCode = '+968') => {
  try {
    logger.info('Sending OTP via Omantel', { phoneNumber: `${countryCode}${phoneNumber}` });
    
    const result = await omantelOTPService.sendOTP(phoneNumber, countryCode);
    
    if (result.success) {
      // Store authenticationId temporarily
      const storeKey = `${countryCode}${phoneNumber}`;
      otpStore.set(storeKey, {
        authenticationId: result.authenticationId,
        timestamp: Date.now(),
        attempts: 0
      });
      
      // Clean up after 10 minutes
      setTimeout(() => {
        otpStore.delete(storeKey);
        logger.debug('OTP store cleaned up', { phoneNumber: storeKey });
      }, 10 * 60 * 1000);

      return {
        success: true,
        message: 'OTP sent successfully via Omantel'
      };
    }
    
    return result;
  } catch (error) {
    logger.error('Send OTP error', { error: error.message, phoneNumber: `${countryCode}${phoneNumber}` });
    return {
      success: false,
      error: error.message
    };
  }
};
*/

/**
 * MOCK OTP SEND - For testing purposes
 * Remove this and uncomment Omantel version above for production
 */
const sendOTP = async (phoneNumber, countryCode = '+968') => {
  try {
    logger.info('MOCK Sending OTP', { phoneNumber: `${countryCode}${phoneNumber}` });
    
    // Simulate successful OTP send
    const storeKey = `${countryCode}${phoneNumber}`;
    const mockAuthId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    otpStore.set(storeKey, {
      authenticationId: mockAuthId,
      timestamp: Date.now(),
      attempts: 0
    });
    
    // Clean up after 10 minutes
    setTimeout(() => {
      otpStore.delete(storeKey);
      logger.debug('MOCK OTP store cleaned up', { phoneNumber: storeKey });
    }, 10 * 60 * 1000);

    logger.info('MOCK OTP sent successfully', { 
      phoneNumber: `${countryCode}${phoneNumber}`,
      mockAuthId: mockAuthId 
    });

    return {
      success: true,
      message: 'MOCK OTP sent successfully (use any 4-digit code or 1234)'
    };
  } catch (error) {
    logger.error('MOCK Send OTP error', { error: error.message, phoneNumber: `${countryCode}${phoneNumber}` });
    return {
      success: false,
      error: error.message
    };
  }
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
  verifyOTP,
  sendOTP,
  authenticateToken,
  optionalAuth,
  extractTokenFromHeader,
  JWT_CONFIG
};
