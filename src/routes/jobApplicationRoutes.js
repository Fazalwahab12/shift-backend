const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const JobApplicationController = require('../controllers/jobApplicationController');

const router = express.Router();

/**
 * Job Application Routes
 * Handles job applications and triggers chat creation
 */

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/jobs/:jobId/apply
 * @desc    Apply to a job (seeker only)
 * @access  Private (Seeker)
 */
router.post('/jobs/:jobId/apply', [
  body('coverLetter')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Cover letter must be a string with max 1000 characters'),
  body('expectedSalary')
    .optional()
    .isNumeric()
    .withMessage('Expected salary must be a number'),
  body('availability')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Availability must be a string with max 500 characters')
], JobApplicationController.applyToJob);

/**
 * @route   GET /api/jobs/:jobId/applications
 * @desc    Get job applications for a job (company view)
 * @access  Private (Company)
 */
router.get('/jobs/:jobId/applications', JobApplicationController.getJobApplications);

/**
 * @route   GET /api/applications
 * @desc    Get seeker's job applications
 * @access  Private (Seeker)
 */
router.get('/applications', JobApplicationController.getSeekerApplications);

/**
 * @route   GET /api/applications/:applicationId
 * @desc    Get application details by ID
 * @access  Private
 */
router.get('/applications/:applicationId', JobApplicationController.getApplicationById);

/**
 * @route   PUT /api/applications/:applicationId/accept
 * @desc    Accept job application (company only) - TRIGGERS CHAT CREATION
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/accept', JobApplicationController.acceptApplication);

/**
 * @route   PUT /api/applications/:applicationId/reject
 * @desc    Reject job application (company only)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/reject', [
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be a string with max 500 characters')
], JobApplicationController.rejectApplication);

/**
 * @route   PUT /api/applications/:applicationId/shortlist
 * @desc    Shortlist job application (company only)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/shortlist', JobApplicationController.shortlistApplication);

/**
 * @route   PUT /api/applications/:applicationId/interview
 * @desc    Schedule interview (company only) - TRIGGERS CHAT CREATION
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/interview', [
  body('interviewDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Interview date is required and must be a valid date'),
  body('interviewTime')
    .notEmpty()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Interview time is required and must be in HH:MM format')
], JobApplicationController.scheduleInterview);

/**
 * @route   PUT /api/applications/:applicationId/withdraw
 * @desc    Withdraw application (seeker only)
 * @access  Private (Seeker)
 */
router.put('/applications/:applicationId/withdraw', JobApplicationController.withdrawApplication);

module.exports = router;
router.use(authenticateToken);