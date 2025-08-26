const express = require('express');
const { body, param, query } = require('express-validator');
const PhoneController = require('../controllers/phoneController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Phone Number Routes
 * Base path: /api/phone
 */

/**
 * @route   POST /api/phone/register
 * @desc    Register a new phone number
 * @access  Public
 */
router.post('/register', [
  body('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  body('countryCode')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Country code must be between 2 and 5 characters')
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers'),
  body('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], PhoneController.registerPhone);

/**
 * @route   GET /api/phone/check/:phoneNumber
 * @desc    Check if phone number exists
 * @access  Public
 */
router.get('/check/:phoneNumber', PhoneController.checkPhone);

/**
 * @route   POST /api/phone/check-status
 * @desc    Check user suspension status by phone number
 * @access  Public
 */
router.post('/check-status', [
  body('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  body('countryCode')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Country code must be between 2 and 5 characters')
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers')
], PhoneController.checkStatus);

/**
 * @route   POST /api/phone/send-otp
 * @desc    Send OTP to existing user
 * @access  Public
 */
router.post('/send-otp', [
  body('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  body('countryCode')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Country code must be between 2 and 5 characters')
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers')
], PhoneController.sendOTP);

/**
 * @route   POST /api/phone/verify-otp
 * @desc    Verify OTP and generate JWT tokens
 * @access  Public
 */
router.post('/verify-otp', [
  body('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  body('countryCode')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Country code must be between 2 and 5 characters')
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers'),
  body('otp')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be between 4 and 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
], PhoneController.verifyOTP);

/**
 * @route   POST /api/phone/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], PhoneController.refreshToken);

/**
 * @route   GET /api/phone/user/:phoneNumber
 * @desc    Get user by phone number
 * @access  Public
 */
router.get('/user/:phoneNumber', [
  param('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  query('countryCode')
    .optional()
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers')
], PhoneController.getUserByPhone);

/**
 * @route   PUT /api/phone/user-type
 * @desc    Update user type (token-based)
 * @access  Private
 */
router.put('/user-type', [
  authenticateToken,
  body('userType')
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], PhoneController.updateUserType);

/**
 * @route   GET /api/phone/stats
 * @desc    Get phone registration statistics
 * @access  Public
 */
router.get('/stats', [
  query('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], PhoneController.getStats);

/**
 * @route   POST /api/phone/logout
 * @desc    Logout user and update last activity
 * @access  Private
 */
router.post('/logout', [
  authenticateToken
], PhoneController.logout);

/**
 * @route   DELETE /api/phone/delete/:userId
 * @desc    Delete/deactivate phone registration
 * @access  Admin (for now public for testing)
 */
router.delete('/delete/:userId', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], PhoneController.deletePhone);

module.exports = router;