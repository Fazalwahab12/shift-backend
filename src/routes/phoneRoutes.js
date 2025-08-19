const express = require('express');
const { body, param, query } = require('express-validator');
const PhoneController = require('../controllers/phoneController');
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
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], PhoneController.registerPhone);

/**
 * @route   GET /api/phone/check/:phoneNumber
 * @desc    Check if phone number exists
 * @access  Public
 */
router.get('/check/:phoneNumber', [
  param('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),
  query('countryCode')
    .optional()
    .matches(/^\+\d+$/)
    .withMessage('Country code must start with + followed by numbers')
], PhoneController.checkPhone);

/**
 * @route   PUT /api/phone/verify
 * @desc    Update phone verification status
 * @access  Public
 */
router.put('/verify', [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('verified')
    .isBoolean()
    .withMessage('Verified must be a boolean value')
], PhoneController.verifyPhone);

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
 * @desc    Update user type
 * @access  Public
 */
router.put('/user-type', [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
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