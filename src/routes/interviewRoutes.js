const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const InterviewController = require('../controllers/interviewController');

const router = express.Router();

/**
 * Interview Scheduling Routes
 * Advanced interview management with duration, conflicts, and scheduling
 */

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/interviews
 * @desc    Create/Schedule a new interview
 * @access  Private (Company)
 */
router.post('/interviews', [
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('applicationId')
    .notEmpty()
    .withMessage('Application ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('interviewDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Interview date is required and must be a valid date'),
  body('startTime')
    .notEmpty()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time is required and must be in HH:MM format'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes'),
  body('interviewType')
    .optional()
    .isIn(['in-person', 'phone', 'video', 'group'])
    .withMessage('Interview type must be in-person, phone, video, or group'),
  body('location')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Location must be a string with max 255 characters'),
  body('interviewer')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Interviewer must be a string with max 255 characters'),
  body('instructions')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Instructions must be a string with max 1000 characters')
], InterviewController.createInterview);

/**
 * @route   GET /api/interviews/:interviewId
 * @desc    Get interview details by ID
 * @access  Private
 */
router.get('/interviews/:interviewId', InterviewController.getInterviewById);

/**
 * @route   GET /api/applications/:applicationId/interviews
 * @desc    Get all interviews for an application
 * @access  Private
 */
router.get('/applications/:applicationId/interviews', InterviewController.getApplicationInterviews);

/**
 * @route   GET /api/company/:companyId/interviews
 * @desc    Get company interviews with date filtering
 * @access  Private (Company)
 */
router.get('/company/:companyId/interviews', [
  param('companyId').notEmpty().withMessage('Company ID is required')
], InterviewController.getCompanyInterviews);

/**
 * @route   GET /api/interviews/available-slots
 * @desc    Get available time slots for scheduling
 * @access  Private (Company)
 */
router.get('/interviews/available-slots', [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('date')
    .notEmpty()
    .isISO8601()
    .withMessage('Date is required and must be valid'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes')
], InterviewController.getAvailableSlots);

/**
 * @route   PUT /api/interviews/:interviewId/reschedule
 * @desc    Reschedule an interview
 * @access  Private
 */
router.put('/interviews/:interviewId/reschedule', [
  body('newDate')
    .notEmpty()
    .isISO8601()
    .withMessage('New date is required and must be valid'),
  body('newTime')
    .notEmpty()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('New time is required and must be in HH:MM format'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reason must be a string with max 500 characters')
], InterviewController.rescheduleInterview);

/**
 * @route   PUT /api/interviews/:interviewId/confirm
 * @desc    Confirm interview attendance (seeker)
 * @access  Private (Seeker)
 */
router.put('/interviews/:interviewId/confirm', InterviewController.confirmInterview);

/**
 * @route   PUT /api/interviews/:interviewId/cancel
 * @desc    Cancel an interview
 * @access  Private
 */
router.put('/interviews/:interviewId/cancel', [
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must be a string with max 500 characters')
], InterviewController.cancelInterview);

/**
 * @route   PUT /api/interviews/:interviewId/complete
 * @desc    Mark interview as completed with feedback (company)
 * @access  Private (Company)
 */
router.put('/interviews/:interviewId/complete', [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Feedback must be a string with max 2000 characters'),
  body('result')
    .optional()
    .isIn(['pass', 'fail', 'pending'])
    .withMessage('Result must be pass, fail, or pending'),
  body('nextSteps')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Next steps must be a string with max 1000 characters')
], InterviewController.completeInterview);

/**
 * @route   PUT /api/interviews/:interviewId/no-show
 * @desc    Mark interview as no-show
 * @access  Private (Company)
 */
router.put('/interviews/:interviewId/no-show', InterviewController.markNoShow);

/**
 * @route   PUT /api/interviews/:interviewId/add-dates
 * @desc    Add additional date options for interview scheduling
 * @access  Private (Company)
 */
router.put('/interviews/:interviewId/add-dates', [
  body('additionalDates')
    .isArray({ min: 1 })
    .withMessage('Additional dates must be an array with at least one date'),
  body('additionalDates.*.date')
    .isISO8601()
    .withMessage('Each date must be valid ISO date'),
  body('additionalDates.*.startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Each start time must be in HH:MM format')
], InterviewController.addAdditionalDates);

/**
 * @route   GET /api/seeker/:seekerId/interviews
 * @desc    Get seeker's interviews
 * @access  Private (Seeker)
 */
router.get('/seeker/:seekerId/interviews', [
  param('seekerId').notEmpty().withMessage('Seeker ID is required')
], InterviewController.getSeekerInterviews);

/**
 * @route   PUT /api/interviews/:interviewId/preparation
 * @desc    Add preparation materials and instructions
 * @access  Private (Company)
 */
router.put('/interviews/:interviewId/preparation', [
  body('preparationMaterials')
    .optional()
    .isArray()
    .withMessage('Preparation materials must be an array'),
  body('requiredDocuments')
    .optional()
    .isArray()
    .withMessage('Required documents must be an array'),
  body('instructions')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Instructions must be a string with max 2000 characters')
], InterviewController.updatePreparation);

/**
 * @route   POST /api/interviews/:interviewId/reminder
 * @desc    Send interview reminder
 * @access  Private (Company)
 */
router.post('/interviews/:interviewId/reminder', InterviewController.sendReminder);

/**
 * @route   GET /api/interviews/conflicts
 * @desc    Check for scheduling conflicts
 * @access  Private (Company)
 */
router.get('/interviews/conflicts', [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('date')
    .notEmpty()
    .isISO8601()
    .withMessage('Date is required and must be valid'),
  body('startTime')
    .notEmpty()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time is required and must be in HH:MM format'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes')
], InterviewController.checkConflicts);

module.exports = router;