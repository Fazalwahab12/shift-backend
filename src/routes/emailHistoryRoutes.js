const express = require('express');
const { param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const EmailHistoryController = require('../controllers/emailHistoryController');

const router = express.Router();

/**
 * Email History Routes
 * View and manage email history for debugging and auditing
 */

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/email-history
 * @desc    Get email history with filtering options
 * @access  Private (Admin)
 */
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'sent', 'failed', 'bounced', 'delivered'])
    .withMessage('Invalid status filter'),
  query('notificationType')
    .optional()
    .isString()
    .withMessage('Notification type must be a string'),
  query('recipient')
    .optional()
    .isEmail()
    .withMessage('Recipient must be a valid email'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
], EmailHistoryController.getEmailHistory);

/**
 * @route   GET /api/email-history/stats
 * @desc    Get email statistics for a date range
 * @access  Private (Admin)
 */
router.get('/stats', [
  query('startDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Start date is required and must be valid'),
  query('endDate')
    .notEmpty()
    .isISO8601()
    .withMessage('End date is required and must be valid')
], EmailHistoryController.getEmailStats);

/**
 * @route   GET /api/email-history/:emailId
 * @desc    Get specific email details by email ID
 * @access  Private (Admin)
 */
router.get('/:emailId', [
  param('emailId').notEmpty().withMessage('Email ID is required')
], EmailHistoryController.getEmailById);

/**
 * @route   GET /api/email-history/recipient/:email
 * @desc    Get email history for specific recipient
 * @access  Private (Admin)
 */
router.get('/recipient/:email', [
  param('email').isEmail().withMessage('Valid email is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], EmailHistoryController.getEmailsByRecipient);

/**
 * @route   GET /api/email-history/type/:notificationType
 * @desc    Get email history by notification type
 * @access  Private (Admin)
 */
router.get('/type/:notificationType', [
  param('notificationType').notEmpty().withMessage('Notification type is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], EmailHistoryController.getEmailsByType);

/**
 * @route   GET /api/email-history/failed/retry
 * @desc    Get failed emails that can be retried
 * @access  Private (Admin)
 */
router.get('/failed/retry', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], EmailHistoryController.getFailedEmailsForRetry);

/**
 * @route   POST /api/email-history/:emailHistoryId/retry
 * @desc    Retry sending a failed email
 * @access  Private (Admin)
 */
router.post('/:emailHistoryId/retry', [
  param('emailHistoryId').notEmpty().withMessage('Email history ID is required')
], EmailHistoryController.retryEmail);

/**
 * @route   DELETE /api/email-history/cleanup
 * @desc    Clean up old email history records
 * @access  Private (Admin)
 */
router.delete('/cleanup', [
  query('daysToKeep')
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage('Days to keep must be between 1 and 3650 (10 years)')
], EmailHistoryController.cleanupOldEmails);

module.exports = router;