const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const InstantHireController = require('../controllers/instantHireController');

const router = express.Router();

/**
 * InstantHire Routes
 * Handles instant hire transactions, payments, matching, and completion
 */

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/instant-hires
 * @desc    Create new instant hire transaction
 * @access  Private (Company)
 */
router.post('/instant-hires', [
  body('jobId')
    .optional()
    .isString()
    .withMessage('Job ID must be a valid string'),
  body('applicationId')
    .optional()
    .isString()
    .withMessage('Application ID must be a valid string'),
  body('payPerHour')
    .isFloat({ min: 0 })
    .withMessage('Pay per hour must be a positive number'),
  body('hoursPerDay')
    .isInt({ min: 1, max: 24 })
    .withMessage('Hours per day must be between 1 and 24'),
  body('totalDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total days must be a positive integer'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  body('shiftType')
    .optional()
    .isIn(['Morning', 'Afternoon', 'Evening', 'Night'])
    .withMessage('Shift type must be Morning, Afternoon, Evening, or Night'),
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('workLocation')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Work location must be a string with max 255 characters'),
  body('paymentTerms')
    .optional()
    .isIn(['end_of_shift', 'weekly', 'monthly'])
    .withMessage('Payment terms must be end_of_shift, weekly, or monthly'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('dressCode')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Dress code must be a string with max 500 characters')
], InstantHireController.createInstantHire);

/**
 * @route   GET /api/instant-hires/:instantHireId
 * @desc    Get instant hire by ID
 * @access  Private (Company or matched Seeker)
 */
router.get('/instant-hires/:instantHireId', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required')
], InstantHireController.getInstantHireById);

/**
 * @route   GET /api/companies/:companyId/instant-hires
 * @desc    Get company's instant hire history
 * @access  Private (Company)
 */
router.get('/companies/:companyId/instant-hires', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  query('status')
    .optional()
    .isIn(['pending_payment', 'paid', 'matched', 'started', 'in_progress', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status filter'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], InstantHireController.getCompanyInstantHires);

/**
 * @route   GET /api/seekers/:seekerId/instant-hires
 * @desc    Get seeker's instant hire history
 * @access  Private (Seeker)
 */
router.get('/seekers/:seekerId/instant-hires', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  query('status')
    .optional()
    .isIn(['pending_payment', 'paid', 'matched', 'started', 'in_progress', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status filter'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], InstantHireController.getSeekerInstantHires);

/**
 * @route   PUT /api/instant-hires/:instantHireId/payment
 * @desc    Process payment for instant hire
 * @access  Private (Company)
 */
router.put('/instant-hires/:instantHireId/payment', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('paymentMethod')
    .isIn(['card', 'bank_transfer', 'wallet'])
    .withMessage('Payment method must be card, bank_transfer, or wallet'),
  body('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('paymentReference')
    .optional()
    .isString()
    .withMessage('Payment reference must be a string'),
  body('serviceFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Service fee must be a positive number')
], InstantHireController.processPayment);

/**
 * @route   PUT /api/instant-hires/:instantHireId/match
 * @desc    Match instant hire with seeker
 * @access  Private (Company or System)
 */
router.put('/instant-hires/:instantHireId/match', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], InstantHireController.matchWithSeeker);

/**
 * @route   PUT /api/instant-hires/:instantHireId/accept
 * @desc    Accept instant hire (seeker)
 * @access  Private (Seeker)
 */
router.put('/instant-hires/:instantHireId/accept', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required')
], InstantHireController.acceptInstantHire);

/**
 * @route   PUT /api/instant-hires/:instantHireId/decline
 * @desc    Decline instant hire (seeker)
 * @access  Private (Seeker)
 */
router.put('/instant-hires/:instantHireId/decline', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Decline reason must be a string with max 500 characters')
], InstantHireController.declineInstantHire);

/**
 * @route   PUT /api/instant-hires/:instantHireId/start-work
 * @desc    Start work for instant hire
 * @access  Private (Company or Seeker)
 */
router.put('/instant-hires/:instantHireId/start-work', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required')
], InstantHireController.startWork);

/**
 * @route   POST /api/instant-hires/:instantHireId/attendance
 * @desc    Record daily attendance
 * @access  Private (Company or Seeker)
 */
router.post('/instant-hires/:instantHireId/attendance', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  body('checkInTime')
    .notEmpty()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Check-in time is required and must be in HH:MM format'),
  body('checkOutTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Check-out time must be in HH:MM format'),
  body('hoursWorked')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Hours worked must be between 0 and 24'),
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with max 500 characters')
], InstantHireController.recordAttendance);

/**
 * @route   PUT /api/instant-hires/:instantHireId/complete
 * @desc    Complete work and provide feedback
 * @access  Private (Company)
 */
router.put('/instant-hires/:instantHireId/complete', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('companyFeedback')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Company feedback must be a string with max 2000 characters'),
  body('companyRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Company rating must be between 1 and 5'),
  body('finalPaymentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Final payment amount must be a positive number')
], InstantHireController.completeWork);

/**
 * @route   PUT /api/instant-hires/:instantHireId/cancel
 * @desc    Cancel instant hire
 * @access  Private (Company or Seeker)
 */
router.put('/instant-hires/:instantHireId/cancel', [
  param('instantHireId')
    .notEmpty()
    .withMessage('Instant hire ID is required'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must be a string with max 500 characters')
], InstantHireController.cancelInstantHire);

/**
 * @route   GET /api/companies/:companyId/instant-hire-stats
 * @desc    Get company instant hire statistics
 * @access  Private (Company)
 */
router.get('/companies/:companyId/instant-hire-stats', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], InstantHireController.getCompanyStats);

/**
 * @route   GET /api/seekers/:seekerId/instant-hire-stats
 * @desc    Get seeker instant hire statistics
 * @access  Private (Seeker)
 */
router.get('/seekers/:seekerId/instant-hire-stats', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], InstantHireController.getSeekerStats);

/**
 * @route   GET /api/instant-hires/status/:status
 * @desc    Get instant hires by status (admin/system use)
 * @access  Private (Admin/System)
 */
router.get('/instant-hires/status/:status', [
  param('status')
    .isIn(['pending_payment', 'paid', 'matched', 'started', 'in_progress', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
], InstantHireController.getByStatus);

module.exports = router;