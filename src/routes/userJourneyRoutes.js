const express = require('express');
const { param, query } = require('express-validator');
const UserJourneyController = require('../controllers/userJourneyController');
const router = express.Router();

/**
 * User Journey Routes
 * Base path: /api/journey
 */

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

module.exports = router;