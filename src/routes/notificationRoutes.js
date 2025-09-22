/**
 * Notification Routes
 * API endpoints for notification management
 * Production-ready with proper middleware and validation
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// Middleware for handling validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation middleware
const validateSendNotification = [
  body('type').isString().notEmpty().withMessage('Type is required'),
  body('action').isString().notEmpty().withMessage('Action is required'),
  body('receivers').isArray({ min: 1 }).withMessage('Receivers must be a non-empty array'),
  body('receivers.*.id').isString().notEmpty().withMessage('Each receiver must have an id'),
  body('receivers.*.type').isString().notEmpty().withMessage('Each receiver must have a type'),
  body('channels').isArray({ min: 1 }).withMessage('Channels must be a non-empty array'),
  body('content').isObject().notEmpty().withMessage('Content is required'),
  body('content.message').isString().notEmpty().withMessage('Content message is required'),
  handleValidationErrors
];

const validateUserId = [
  param('userId').isString().notEmpty().withMessage('Valid user ID is required'),
  handleValidationErrors
];

const validateNotificationId = [
  param('notificationId').isString().notEmpty().withMessage('Valid notification ID is required'),
  handleValidationErrors
];

const validateMarkAsRead = [
  param('notificationId').isString().notEmpty().withMessage('Valid notification ID is required'),
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  handleValidationErrors
];

const validateBulkMarkAsRead = [
  body('notificationIds').isArray({ min: 1 }).withMessage('Notification IDs array is required'),
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  handleValidationErrors
];

const validateGetUserNotifications = [
  param('userId').isString().notEmpty().withMessage('Valid user ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),
  query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly must be a boolean'),
  handleValidationErrors
];

// Routes

/**
 * @route   POST /api/notifications/send
 * @desc    Send a notification
 * @access  Private
 * @body    {type, initiatedBy, action, description, receivers, channels, content, metadata}
 */
router.post('/send', validateSendNotification, notificationController.sendNotification);

/**
 * @route   GET /api/notifications/user/:userId
 * @desc    Get user notifications with pagination
 * @access  Private
 * @params  userId - User ID
 * @query   limit, offset, unreadOnly
 */
router.get('/user/:userId', validateGetUserNotifications, notificationController.getUserNotifications);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 * @params  notificationId - Notification ID
 * @body    {userId}
 */
router.put('/:notificationId/read', authenticateToken, validateMarkAsRead, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/:notificationId/read-auth
 * @desc    Mark notification as read (auth-based)
 * @access  Private
 */
router.put('/:notificationId/read-auth', authenticateToken, [
  param('notificationId').isString().notEmpty().withMessage('Valid notification ID is required'),
  handleValidationErrors
], notificationController.markAsReadAuth);

/**
 * @route   PUT /api/notifications/bulk-read
 * @desc    Mark multiple notifications as read
 * @access  Private
 * @body    {notificationIds[], userId}
 */
router.put('/bulk-read', validateBulkMarkAsRead, notificationController.bulkMarkAsRead);

/**
 * @route   GET /api/notifications/unread-count/:userId
 * @desc    Get unread notification count for user
 * @access  Private
 * @params  userId - User ID
 */
router.get('/unread-count/:userId', validateUserId, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications (auth-based)
 * @access  Private
 */
router.get('/', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),
  query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly must be a boolean'),
  handleValidationErrors
], notificationController.getUserNotificationsAuth);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count for authenticated user
 * @access  Private
 */
router.get('/unread-count', authenticateToken, notificationController.getUnreadCountAuth);

// Helper routes for specific notification types

/**
 * @route   POST /api/notifications/company-created
 * @desc    Send company account created notification
 * @access  Private
 */
router.post('/company-created', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('companyData.id').isString().notEmpty().withMessage('Company ID is required'),
  body('companyData.email').isEmail().withMessage('Valid company email is required'),
  body('companyData.name').isString().notEmpty().withMessage('Company name is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData, adminEmails = [] } = req.body;
    const result = await notificationController.sendCompanyAccountCreated(companyData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/seeker-created
 * @desc    Send job seeker profile created notification
 * @access  Private
 */
router.post('/seeker-created', [
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  body('seekerData.id').isString().notEmpty().withMessage('Seeker ID is required'),
  body('seekerData.email').isEmail().withMessage('Valid seeker email is required'),
  body('seekerData.name').isString().notEmpty().withMessage('Seeker name is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { seekerData, adminEmails = [] } = req.body;
    const result = await notificationController.sendJobSeekerProfileCreated(seekerData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/application-submitted
 * @desc    Send application submitted notification
 * @access  Private
 */
router.post('/application-submitted', [
  body('jobSeekerName').isString().notEmpty().withMessage('Job seeker name is required'),
  body('jobSeekerEmail').isEmail().withMessage('Valid job seeker email is required'),
  body('jobSeekerId').isString().notEmpty().withMessage('Job seeker ID is required'),
  body('companyName').isString().notEmpty().withMessage('Company name is required'),
  body('companyEmail').isEmail().withMessage('Valid company email is required'),
  body('companyId').isString().notEmpty().withMessage('Company ID is required'),
  body('jobTitle').isString().notEmpty().withMessage('Job title is required'),
  body('jobId').isString().notEmpty().withMessage('Job ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const result = await notificationController.sendApplicationSubmitted(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/interview-request
 * @desc    Send interview request notification
 * @access  Private
 */
router.post('/interview-request', [
  body('jobSeekerName').isString().notEmpty().withMessage('Job seeker name is required'),
  body('jobSeekerEmail').isEmail().withMessage('Valid job seeker email is required'),
  body('jobSeekerId').isString().notEmpty().withMessage('Job seeker ID is required'),
  body('companyName').isString().notEmpty().withMessage('Company name is required'),
  body('companyId').isString().notEmpty().withMessage('Company ID is required'),
  body('jobTitle').isString().notEmpty().withMessage('Job title is required'),
  body('jobId').isString().notEmpty().withMessage('Job ID is required'),
  body('interviewDate').optional().isString(),
  body('location').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const result = await notificationController.sendInterviewRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/payment-successful
 * @desc    Send payment successful notification
 * @access  Private
 */
router.post('/payment-successful', [
  body('companyId').isString().notEmpty().withMessage('Company ID is required'),
  body('companyEmail').isEmail().withMessage('Valid company email is required'),
  body('companyName').isString().notEmpty().withMessage('Company name is required'),
  body('amount').isString().notEmpty().withMessage('Amount is required'),
  body('currency').isString().notEmpty().withMessage('Currency is required'),
  body('planName').isString().notEmpty().withMessage('Plan name is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { adminEmails = [], ...paymentData } = req.body;
    const result = await notificationController.sendPaymentSuccessful(paymentData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/admin-create-company
 * @desc    Send admin creates company account notification
 * @access  Private
 */
router.post('/admin-create-company', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('companyData.id').isString().notEmpty().withMessage('Company ID is required'),
  body('companyData.email').isEmail().withMessage('Valid company email is required'),
  body('companyData.name').isString().notEmpty().withMessage('Company name is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData } = req.body;
    const result = await notificationController.sendAdminCreateCompanyAccount(companyData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/job-edited
 * @desc    Send job edited notification
 * @access  Private
 */
router.post('/job-edited', [
  body('jobData').isObject().notEmpty().withMessage('Job data is required'),
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { jobData, companyData, adminEmails = [] } = req.body;
    const result = await notificationController.sendJobEdited(jobData, companyData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/job-cancelled
 * @desc    Send job cancelled notification
 * @access  Private
 */
router.post('/job-cancelled', [
  body('jobData').isObject().notEmpty().withMessage('Job data is required'),
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { jobData, companyData, adminEmails = [] } = req.body;
    const result = await notificationController.sendJobCancelled(jobData, companyData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/payment-failed
 * @desc    Send payment failed notification
 * @access  Private
 */
router.post('/payment-failed', [
  body('companyId').isString().notEmpty().withMessage('Company ID is required'),
  body('companyEmail').isEmail().withMessage('Valid company email is required'),
  body('companyName').isString().notEmpty().withMessage('Company name is required'),
  body('amount').isString().notEmpty().withMessage('Amount is required'),
  body('currency').isString().notEmpty().withMessage('Currency is required'),
  body('planName').isString().notEmpty().withMessage('Plan name is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { adminEmails = [], ...paymentData } = req.body;
    const result = await notificationController.sendPaymentFailed(paymentData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/interview-declined
 * @desc    Send interview declined notification
 * @access  Private
 */
router.post('/interview-declined', [
  body('interviewData').isObject().notEmpty().withMessage('Interview data is required'),
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { interviewData, companyData, seekerData } = req.body;
    const result = await notificationController.sendInterviewDeclined(interviewData, companyData, seekerData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/interview-rescheduled
 * @desc    Send interview rescheduled notification
 * @access  Private
 */
router.post('/interview-rescheduled', [
  body('interviewData').isObject().notEmpty().withMessage('Interview data is required'),
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { interviewData, companyData, seekerData } = req.body;
    const result = await notificationController.sendInterviewRescheduled(interviewData, companyData, seekerData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/interview-reminder
 * @desc    Send interview reminder notification
 * @access  Private
 */
router.post('/interview-reminder', [
  body('interviewData').isObject().notEmpty().withMessage('Interview data is required'),
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { interviewData, seekerData } = req.body;
    const result = await notificationController.sendInterviewReminder(interviewData, seekerData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/instant-hire-reminder
 * @desc    Send instant hire reminder notification
 * @access  Private
 */
router.post('/instant-hire-reminder', [
  body('jobData').isObject().notEmpty().withMessage('Job data is required'),
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { jobData, seekerData } = req.body;
    const result = await notificationController.sendInstantHireReminder(jobData, seekerData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/hiring-acceptance
 * @desc    Send hiring acceptance notification
 * @access  Private
 */
router.post('/hiring-acceptance', [
  body('hiringData').isObject().notEmpty().withMessage('Hiring data is required'),
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('seekerData').isObject().notEmpty().withMessage('Seeker data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { hiringData, companyData, seekerData } = req.body;
    const result = await notificationController.sendHiringAcceptance(hiringData, companyData, seekerData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/trial-ended
 * @desc    Send trial ended notification
 * @access  Private
 */
router.post('/trial-ended', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('adminEmails').optional().isArray().withMessage('Admin emails must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData, adminEmails = [] } = req.body;
    const result = await notificationController.sendTrialEnded(companyData, adminEmails);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/insufficient-credits
 * @desc    Send insufficient credits notification
 * @access  Private
 */
router.post('/insufficient-credits', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('creditType').optional().isString().withMessage('Credit type must be a string'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData, creditType = 'job' } = req.body;
    const result = await notificationController.sendInsufficientCredits(companyData, creditType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/plan-activated
 * @desc    Send plan activated notification
 * @access  Private
 */
router.post('/plan-activated', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('planData').isObject().notEmpty().withMessage('Plan data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData, planData } = req.body;
    const result = await notificationController.sendPlanActivated(companyData, planData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/notifications/custom-plan-lpo
 * @desc    Send custom plan LPO notification
 * @access  Private
 */
router.post('/custom-plan-lpo', [
  body('companyData').isObject().notEmpty().withMessage('Company data is required'),
  body('lpoData').isObject().notEmpty().withMessage('LPO data is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { companyData, lpoData } = req.body;
    const result = await notificationController.sendCustomPlanLPO(companyData, lpoData);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Health check endpoint (public)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notification service is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      send: 'POST /api/notifications/send',
      getUserNotifications: 'GET /api/notifications/user/:userId',
      markAsRead: 'PUT /api/notifications/:notificationId/read',
      bulkMarkAsRead: 'PUT /api/notifications/bulk-read',
      getUnreadCount: 'GET /api/notifications/unread-count/:userId',
      companyCreated: 'POST /api/notifications/company-created',
      seekerCreated: 'POST /api/notifications/seeker-created',
      applicationSubmitted: 'POST /api/notifications/application-submitted',
      interviewRequest: 'POST /api/notifications/interview-request',
      paymentSuccessful: 'POST /api/notifications/payment-successful',
    }
  });
});


module.exports = router;