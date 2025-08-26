const express = require('express');
const { param, query, body } = require('express-validator');
const UserJourneyController = require('../controllers/userJourneyController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * User Journey Routes
 * Base path: /api/journey
 */

/**
 * @route   GET /api/journey/me
 * @desc    Get complete user journey status for authenticated user
 * @access  Private
 */
router.get('/me', [
  authenticateToken
], UserJourneyController.getCurrentUserJourneyStatus);

/**
 * @route   GET /api/journey/:userId
 * @desc    Get complete user journey status
 * @access  Public
 */
router.get('/:userId', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], UserJourneyController.getUserJourneyStatus);

/**
 * @route   GET /api/journey/stats
 * @desc    Get user journey statistics
 * @access  Public
 */
router.get('/stats', [
  query('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], UserJourneyController.getJourneyStats);

/**
 * @route   GET /api/journey/:userId/next-actions
 * @desc    Get recommended next actions for user
 * @access  Public
 */
router.get('/:userId/next-actions', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], UserJourneyController.getNextActions);

/**
 * @route   PUT /api/journey/:userId/suspend
 * @desc    Suspend user account (Admin only)
 * @access  Admin
 */
router.put('/:userId/suspend', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
], UserJourneyController.suspendUser);

/**
 * @route   PUT /api/journey/:userId/ban
 * @desc    Permanently ban user account (Admin only)
 * @access  Admin
 */
router.put('/:userId/ban', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
], UserJourneyController.banUser);

/**
 * @route   PUT /api/journey/:userId/unsuspend
 * @desc    Remove suspension from user account (Admin only)
 * @access  Admin
 */
router.put('/:userId/unsuspend', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], UserJourneyController.unsuspendUser);

module.exports = router;