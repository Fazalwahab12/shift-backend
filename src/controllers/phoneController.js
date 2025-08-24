const User = require('../models/User');
const { validationResult } = require('express-validator');
const { sendOTP, verifyOTP, generateTokenPair } = require('../utils/auth');

/**
 * Phone Number Controller
 * Handles phone number registration and verification
 */
class PhoneController {
  
  /**
   * Register a new phone number
   * POST /api/phone/register
   */
  static async registerPhone(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phoneNumber, countryCode, userType } = req.body;

      // Handle URL encoding issue where + becomes space
      let cleanCountryCode = (countryCode || '+968').trim();
      // If countryCode starts with space followed by digits, replace space with +
      if (cleanCountryCode.match(/^\s\d+$/)) {
        cleanCountryCode = '+' + cleanCountryCode.trim();
      }
      // Ensure it starts with +
      if (cleanCountryCode && !cleanCountryCode.startsWith('+')) {
        cleanCountryCode = '+' + cleanCountryCode;
      }

      // Check if phone number already exists
      const existingUser = await User.findByPhone(phoneNumber, cleanCountryCode);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already registered',
          data: {
            userId: existingUser.id,
            userType: existingUser.userType,
            onboardingCompleted: existingUser.onboardingCompleted,
            profileCompleted: existingUser.profileCompleted
          }
        });
      }

      // Create new user with phone number
      const newUser = await User.createWithPhone({
        phoneNumber,
        countryCode: cleanCountryCode,
        userType: userType || null // Allow null userType, will be set later in onboarding
      });

      // Send OTP to the phone number
      const otpResult = await sendOTP(phoneNumber, cleanCountryCode);

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP',
          error: otpResult.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Phone number registered and OTP sent successfully',
        data: {
          userId: newUser.id,
          phoneNumber: newUser.phoneNumber,
          countryCode: newUser.countryCode,
          userType: newUser.userType,
          isPhoneVerified: newUser.isPhoneVerified,
          onboardingCompleted: newUser.onboardingCompleted,
          profileCompleted: newUser.profileCompleted,
          createdAt: newUser.createdAt,
          nextStep: 'otp_verification',
          otpSent: true
        }
      });

    } catch (error) {
      console.error('Error in registerPhone:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if phone number exists
   * GET /api/phone/check/:phoneNumber
   */
  static async checkPhone(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { countryCode } = req.query;

      // Handle URL encoding issue where + becomes space
      let cleanCountryCode = (countryCode || '+968').trim();
      // If countryCode starts with space followed by digits, replace space with +
      if (cleanCountryCode.match(/^\s\d+$/)) {
        cleanCountryCode = '+' + cleanCountryCode.trim();
      }
      // Ensure it starts with +
      if (cleanCountryCode && !cleanCountryCode.startsWith('+')) {
        cleanCountryCode = '+' + cleanCountryCode;
      }

      console.log('🔍 Checking phone:', { 
        phoneNumber, 
        originalCountryCode: countryCode,
        cleanCountryCode: cleanCountryCode 
      });

      const user = await User.findByPhone(phoneNumber, cleanCountryCode);
      
      console.log('🔍 User found:', user ? 'YES' : 'NO');
      if (user) {
        console.log('🔍 User details:', {
          id: user.id,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
          userType: user.userType
        });
      }
      
      if (user) {
        res.status(200).json({
          success: true,
          message: 'Phone number found',
          data: {
            exists: true,
            userId: user.id,
            userType: user.userType,
            onboardingCompleted: user.onboardingCompleted,
            profileCompleted: user.profileCompleted,
            isActive: user.isActive
          }
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Phone number not found',
          data: {
            exists: false
          }
        });
      }

    } catch (error) {
      console.error('Error in checkPhone:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }



  /**
   * Send OTP to existing user
   * POST /api/phone/send-otp
   */
  static async sendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phoneNumber, countryCode } = req.body;

      // Handle URL encoding issue where + becomes space
      let cleanCountryCode = (countryCode || '+968').trim();
      if (cleanCountryCode.match(/^\s\d+$/)) {
        cleanCountryCode = '+' + cleanCountryCode.trim();
      }
      if (cleanCountryCode && !cleanCountryCode.startsWith('+')) {
        cleanCountryCode = '+' + cleanCountryCode;
      }

      // Check if user exists
      const user = await User.findByPhone(phoneNumber, cleanCountryCode);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Send OTP
      const otpResult = await sendOTP(phoneNumber, cleanCountryCode);

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP',
          error: otpResult.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
          otpSent: true
        }
      });

    } catch (error) {
      console.error('Error in sendOTP:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verify OTP and generate JWT tokens
   * POST /api/phone/verify-otp
   */
  static async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phoneNumber, countryCode, otp } = req.body;

      // Handle URL encoding issue where + becomes space
      let cleanCountryCode = (countryCode || '+968').trim();
      if (cleanCountryCode.match(/^\s\d+$/)) {
        cleanCountryCode = '+' + cleanCountryCode.trim();
      }
      if (cleanCountryCode && !cleanCountryCode.startsWith('+')) {
        cleanCountryCode = '+' + cleanCountryCode;
      }

      // Verify OTP
      const otpResult = await verifyOTP(phoneNumber, otp);
      if (!otpResult.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP',
          error: otpResult.error
        });
      }

      // Get user
      const user = await User.findByPhone(phoneNumber, cleanCountryCode);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user verification status
      await user.update({ 
        isPhoneVerified: true,
        lastLoginAt: new Date().toISOString()
      });

      // Generate JWT tokens with user data
      const tokens = generateTokenPair(user.id, user.userType, {
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        isPhoneVerified: user.isPhoneVerified,
        onboardingCompleted: user.onboardingCompleted,
        profileCompleted: user.profileCompleted
      });

      // Determine next step based on completion status
      let nextStep = 'onboarding';
      if (user.onboardingCompleted && !user.profileCompleted) {
        nextStep = 'profile_creation';
      } else if (user.onboardingCompleted && user.profileCompleted) {
        nextStep = 'complete';
      }

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
          userType: user.userType,
          isPhoneVerified: true,
          onboardingCompleted: user.onboardingCompleted,
          profileCompleted: user.profileCompleted,
          nextStep: nextStep,
          // JWT tokens
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn
        }
      });

    } catch (error) {
      console.error('Error in verifyOTP:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Refresh access token using refresh token
   * POST /api/phone/refresh-token
   */
  static async refreshToken(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token and generate new access token
      const { refreshAccessToken } = require('../utils/auth');
      
      // Get user data from refresh token to include in new access token
      const refreshResult = require('../utils/auth').verifyRefreshToken(refreshToken);
      if (!refreshResult.valid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
      
      // Get current user data to include in new token
      const user = await User.findById(refreshResult.payload.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const result = refreshAccessToken(refreshToken, {
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        userType: user.userType,
        isPhoneVerified: user.isPhoneVerified,
        onboardingCompleted: user.onboardingCompleted,
        profileCompleted: user.profileCompleted
      });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        message: 'Access token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn
        }
      });

    } catch (error) {
      console.error('Error in refreshToken:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user by phone number
   * GET /api/phone/user/:phoneNumber
   */
  static async getUserByPhone(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { countryCode } = req.query;

      // Handle URL encoding issue where + becomes space
      let cleanCountryCode = (countryCode || '+968').trim();
      // If countryCode starts with space followed by digits, replace space with +
      if (cleanCountryCode.match(/^\s\d+$/)) {
        cleanCountryCode = '+' + cleanCountryCode.trim();
      }
      // Ensure it starts with +
      if (cleanCountryCode && !cleanCountryCode.startsWith('+')) {
        cleanCountryCode = '+' + cleanCountryCode;
      }

      const user = await User.findByPhone(phoneNumber, cleanCountryCode);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User found',
        data: user.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in getUserByPhone:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update user type (token-based)
   * PUT /api/phone/user-type
   */
  static async updateUserType(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get userId from token (set by auth middleware)
      const { userId } = req.user;
      const { userType } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.update({ userType });

      res.status(200).json({
        success: true,
        message: 'User type updated successfully',
        data: {
          userId: user.id,
          userType: user.userType,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      console.error('Error in updateUserType:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get phone registration statistics
   * GET /api/phone/stats
   */
  static async getStats(req, res) {
    try {
      const { userType } = req.query;

      // Use the static method to get stats without complex queries
      const stats = await User.getStats(userType);

      res.status(200).json({
        success: true,
        message: 'Phone registration statistics',
        data: stats
      });

    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete phone registration (for testing/admin purposes)
   * DELETE /api/phone/delete/:userId
   */
  static async deletePhone(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // In a real app, you might want to soft delete or archive
      await user.deactivate();

      res.status(200).json({
        success: true,
        message: 'User account deactivated successfully',
        data: {
          userId: user.id,
          isActive: user.isActive
        }
      });

    } catch (error) {
      console.error('Error in deletePhone:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = PhoneController;