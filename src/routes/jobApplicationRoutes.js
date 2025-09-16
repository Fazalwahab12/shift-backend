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
  body('availability')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Availability must be a string with max 500 characters')
], JobApplicationController.applyToJob);

/**
 * @route   GET /api/jobs/:jobId/application-status
 * @desc    Check if seeker has applied to a job
 * @access  Private (Seeker)
 */
router.get('/jobs/:jobId/application-status', JobApplicationController.checkApplicationStatus);

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
 * @route   GET /api/applications/rateable-seekers
 * @desc    Get seekers who accepted hire/interview requests (for company rating)
 * @access  Private (Company)
 */
router.get('/applications/rateable-seekers', JobApplicationController.getRateableSeekers);

/**
 * @route   GET /api/applications/:applicationId
 * @desc    Get application details by ID
 * @access  Private
 */
router.get('/applications/:applicationId', JobApplicationController.getApplicationById);

/**
 * @route   GET /api/seekers/:seekerId/applications
 * @desc    Get applications for a specific seeker (company view)
 * @access  Private (Company)
 */
router.get('/seekers/:seekerId/applications', JobApplicationController.getSeekerApplicationsForCompany);

/**
 * @route   GET /api/jobs/:jobId/seekers/:seekerId/application
 * @desc    Check if seeker has application for specific job
 * @access  Private (Company)
 */
router.get('/jobs/:jobId/seekers/:seekerId/application', JobApplicationController.getSeekerJobApplication);

/**
 * @route   PUT /api/applications/:applicationId/accept
 * @desc    Accept job application (company only) - TRIGGERS CHAT CREATION
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/accept', JobApplicationController.acceptApplication);

/**
 * @route   PUT /api/applications/:applicationId/decline
 * @desc    Decline job application with specific reasons (company only)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/decline', [
  body('reason')
    .isIn(['Another candidate selected', 'Not the right fit', 'Limited experience', 'Position filled'])
    .withMessage('Decline reason must be one of: Another candidate selected, Not the right fit, Limited experience, Position filled')
], JobApplicationController.declineApplication);

/**
 * @route   PUT /api/applications/:applicationId/hire
 * @desc    Send hire request to seeker (company only)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/hire', JobApplicationController.sendHireRequest);

/**
 * @route   PUT /api/applications/:applicationId/shortlist
 * @desc    Shortlist job application (company only)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/shortlist', JobApplicationController.shortlistApplication);

/**
 * @route   PUT /api/applications/:applicationId/interview
 * @desc    Schedule interview with duration support (company only) - TRIGGERS CHAT CREATION
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
    .withMessage('Interview time is required and must be in HH:MM format'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Interview duration must be between 15 and 180 minutes'),
  body('interviewType')
    .optional()
    .isIn(['in-person', 'phone', 'video'])
    .withMessage('Interview type must be in-person, phone, or video'),
  body('location')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Location must be a string with max 255 characters'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with max 500 characters')
], JobApplicationController.scheduleInterview);

/**
 * @route   PUT /api/applications/:applicationId/withdraw
 * @desc    Withdraw application (seeker only)
 * @access  Private (Seeker)
 */
router.put('/applications/:applicationId/withdraw', JobApplicationController.withdrawApplication);

/**
 * @route   POST /api/jobs/:jobId/invite/:seekerId
 * @desc    Invite seeker to apply for job (company only)
 * @access  Private (Company)
 */
router.post('/jobs/:jobId/invite/:seekerId', JobApplicationController.inviteSeeker);

/**
 * @route   PUT /api/applications/:applicationId/accept-invitation
 * @desc    Accept invitation and apply to job (seeker only)
 * @access  Private (Seeker)
 */
router.put('/applications/:applicationId/accept-invitation', JobApplicationController.acceptInvitation);

/**
 * @route   PUT /api/applications/:applicationId/hire-response
 * @desc    Respond to hire request (seeker only)
 * @access  Private (Seeker)
 */
router.put('/applications/:applicationId/hire-response', [
  body('response')
    .isIn(['accepted', 'rejected'])
    .withMessage('Response must be either "accepted" or "rejected"')
], JobApplicationController.respondToHireRequest);

/**
 * @route   PUT /api/applications/:applicationId/interview-response
 * @desc    Respond to interview invitation (seeker only)
 * @access  Private (Seeker)
 */
router.put('/applications/:applicationId/interview-response', [
  body('response')
    .isIn(['accepted', 'declined'])
    .withMessage('Response must be either "accepted" or "declined"')
], JobApplicationController.respondToInterviewRequest);

/**
 * @route   POST /api/applications/:applicationId/report
 * @desc    Report attendance/absence (company or seeker)
 * @access  Private
 */
router.post('/applications/:applicationId/report', [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO date'),
  body('status')
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Reason must be a string with max 255 characters'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with max 500 characters')
], JobApplicationController.reportAbsence);

/**
 * @route   GET /api/applications/:applicationId/reports
 * @desc    Get attendance reports for application
 * @access  Private
 */
router.get('/applications/:applicationId/reports', JobApplicationController.getReports);

/**
 * @route   POST /api/company/block-seeker
 * @desc    Block a seeker from applying to company jobs
 * @access  Private (Company)
 */
router.post('/company/block-seeker', [
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('reason')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason is required and must be between 5 and 500 characters')
], JobApplicationController.blockSeeker);

/**
 * @route   PUT /api/company/unblock-seeker/:seekerId
 * @desc    Unblock a previously blocked seeker
 * @access  Private (Company)
 */
router.put('/company/unblock-seeker/:seekerId', [
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Unblock reason must be a string with max 500 characters')
], JobApplicationController.unblockSeeker);

/**
 * @route   GET /api/company/blocked-seekers
 * @desc    Get list of blocked seekers for company
 * @access  Private (Company)
 */
router.get('/company/blocked-seekers', JobApplicationController.getBlockedSeekers);

/**
 * @route   GET /api/company/blocking-stats
 * @desc    Get blocking statistics for company
 * @access  Private (Company)
 */
router.get('/company/blocking-stats', JobApplicationController.getBlockingStats);

/**
 * @route   PUT /api/applications/:applicationId/block-seeker
 * @desc    Block seeker directly from application (convenience route)
 * @access  Private (Company)
 */
router.put('/applications/:applicationId/block-seeker', [
  body('reason')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Block reason is required and must be between 5 and 500 characters')
], JobApplicationController.blockSeekerFromApplication);

/**
 * @route   PUT /api/applications/:applicationId/complete
 * @desc    Complete job (mark as completed)
 * @access  Private (Company or Seeker)
 */
router.put('/applications/:applicationId/complete', [
  body('feedback')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Feedback must be a string with max 500 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage('Notes must be a string with max 300 characters')
], JobApplicationController.completeJob);


/**
 * @route   PUT /api/applications/:applicationId/cancel
 * @desc    Cancel job (mark as cancelled)
 * @access  Private (Company or Seeker)
 */
router.put('/applications/:applicationId/cancel', [
  body('reason')
    .notEmpty()
    .isString()
    .isLength({ min: 5, max: 200 })
    .withMessage('Cancellation reason is required and must be between 5-200 characters'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage('Notes must be a string with max 300 characters')
], JobApplicationController.cancelJob);

module.exports = router;