const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const JobController = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Job Routes - Professional Implementation
 * Handles 4-step job creation process matching frontend structure
 */

/**
 * @route   POST /api/jobs
 * @desc    Create new job (Step 1: Basic Info)
 * @access  Private (JWT Token Required)
 */
router.post('/', authenticateToken, [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('jobVenue')
    .isIn(['Business Location', 'External Event'])
    .withMessage('Job venue must be Business Location or External Event'),
  body('brandLocationId')
    .optional()
    .notEmpty()
    .withMessage('Brand location ID cannot be empty if provided'),
  body('roleId')
    .optional()
    .notEmpty()
    .withMessage('Role ID cannot be empty if provided'),
  body('roleName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Role name must be between 1 and 100 characters'),
  body('jobSummary')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Job summary must not exceed 1000 characters'),
  body('dressCode')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Dress code must not exceed 500 characters'),
  body('jobCoverImage')
    .optional()
    .custom((value) => {
      if (!value) return true;
      // Allow URLs or file URIs
      return value.startsWith('http') || value.startsWith('file://') || value.startsWith('content://');
    })
    .withMessage('Job cover image must be a valid URL or file URI'),
  body('dressCodeGuideline')
    .optional()
    .custom((value) => {
      if (!value) return true;
      // Allow URLs or file URIs
      return value.startsWith('http') || value.startsWith('file://') || value.startsWith('content://');
    })
    .withMessage('Dress code guideline must be a valid URL or file URI')
], JobController.createJob);

/**
 * @route   PUT /api/jobs/:jobId/step/:step
 * @desc    Update job step (Steps 1-4)
 * @access  Private (JWT Token Required)
 */
router.put('/:jobId/step/:step', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  param('step')
    .isInt({ min: 1, max: 4 })
    .withMessage('Step must be between 1 and 4'),
  
  // Step 2: Hiring Preference validations
  body('hiringType')
    .optional()
    .isIn(['Instant Hire', 'Interview First'])
    .withMessage('Hiring type must be Instant Hire or Interview First'),
  body('shiftTypes')
    .optional()
    .isArray()
    .withMessage('Shift types must be an array'),
  body('shiftTypes.*')
    .optional()
    .isIn(['Morning', 'Afternoon', 'Evening', 'Night'])
    .withMessage('Invalid shift type'),
  body('hoursPerDay')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Hours per day must be between 1 and 24'),
  body('payPerHour')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pay per hour must be a positive number'),
  body('paymentTerms')
    .optional()
    .isIn(['Within 1 Week', 'Within 15 Days', 'Within 30 Days'])
    .withMessage('Invalid payment terms'),
  body('workType')
    .optional()
    .isIn(['hourly', 'short', 'full'])
    .withMessage('Work type must be hourly, short, or full'),
  body('interviewLanguages')
    .optional()
    .isArray()
    .withMessage('Interview languages must be an array'),
  
  // Step 3: Requirements validations
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array'),
  body('requiredLanguages')
    .optional()
    .isArray()
    .withMessage('Required languages must be an array'),
  body('genderPreference')
    .optional()
    .isIn(['Male', 'Female', 'Both'])
    .withMessage('Gender preference must be Male, Female, or Both'),
  body('jobPerks')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Job perks must not exceed 500 characters')
], JobController.updateJobStep);

/**
 * @route   POST /api/jobs/:jobId/publish
 * @desc    Publish job (Final step)
 * @access  Private (JWT Token Required)
 */
router.post('/:jobId/publish', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.publishJob);

/**
 * @route   GET /api/jobs/recommendations
 * @desc    Get job recommendations based on user roles
 * @access  Public
 */
router.get('/recommendations', [
  query('roles')
    .optional()
    .isString()
    .withMessage('Roles must be a string of comma-separated values'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], JobController.getJobRecommendations);

/**
 * @route   GET /api/jobs/recent
 * @desc    Get recent jobs from last 10 days
 * @access  Public
 */
router.get('/recent', [
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Days must be between 1 and 30'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], JobController.getRecentJobs);

/**
 * @route   GET /api/jobs/search
 * @desc    Advanced job search with comprehensive filters
 * @access  Public
 */
router.get('/search', [
  // Basic search
  query('q')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  
  // Location filters
  query('governorate')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Governorate must be between 1 and 50 characters'),
  query('wilayat')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Wilayat must be between 1 and 50 characters'),
  
  // Job type filters
  query('roles')
    .optional()
    .isString()
    .withMessage('Roles must be a comma-separated string'),
  query('hiringType')
    .optional()
    .isIn(['Instant Hire', 'Interview First'])
    .withMessage('Hiring type must be Instant Hire or Interview First'),
  query('workType')
    .optional()
    .isIn(['hourly', 'short', 'full'])
    .withMessage('Work type must be hourly, short, or full'),
  query('shiftTypes')
    .optional()
    .isString()
    .withMessage('Shift types must be a comma-separated string'),
  
  // Skills and requirements
  query('skills')
    .optional()
    .isString()
    .withMessage('Skills must be a comma-separated string'),
  query('languages')
    .optional()
    .isString()
    .withMessage('Languages must be a comma-separated string'),
  query('genderPreference')
    .optional()
    .isIn(['Male', 'Female', 'Both'])
    .withMessage('Gender preference must be Male, Female, or Both'),
  
  // Pay range
  query('minPay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum pay must be a positive number'),
  query('maxPay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum pay must be a positive number'),
  
  // Hours and duration
  query('minHours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Minimum hours must be between 1 and 24'),
  query('maxHours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Maximum hours must be between 1 and 24'),
  
  // Date filters
  query('publishedAfter')
    .optional()
    .isISO8601()
    .withMessage('Published after must be a valid date'),
  query('startDateAfter')
    .optional()
    .isISO8601()
    .withMessage('Start date after must be a valid date'),
  
  // Sorting and pagination
  query('sortBy')
    .optional()
    .isIn(['publishedAt', 'payPerHour', 'startDate', 'createdAt'])
    .withMessage('Sort by must be publishedAt, payPerHour, startDate, or createdAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], JobController.searchJobs);

/**
 * @route   GET /api/jobs/categories
 * @desc    Get available job categories based on real job data
 * @access  Public
 */
router.get('/categories', JobController.getJobCategories);

/**
 * @route   GET /api/jobs/saved
 * @desc    Get saved jobs for seeker
 * @access  Private (JWT Token Required)
 */
router.get('/saved', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], JobController.getSavedJobs);

/**
 * @route   POST /api/jobs/:jobId/save
 * @desc    Save job for seeker
 * @access  Private (JWT Token Required)
 */
router.post('/:jobId/save', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.saveJob);

/**
 * @route   DELETE /api/jobs/:jobId/unsave
 * @desc    Remove saved job for seeker
 * @access  Private (JWT Token Required)
 */
router.delete('/:jobId/unsave', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.unsaveJob);

/**
 * @route   GET /api/jobs/:jobId
 * @desc    Get job by ID
 * @access  Public
 */
router.get('/:jobId', [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  query('increment_views')
    .optional()
    .isBoolean()
    .withMessage('Increment views must be a boolean')
], JobController.getJobById);

/**
 * @route   GET /api/jobs/company/:companyId
 * @desc    Get jobs by company
 * @access  Public
 */
router.get('/company/:companyId', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'paused', 'closed'])
    .withMessage('Status must be draft, published, paused, or closed')
], JobController.getJobsByCompany);

/**
 * @route   PUT /api/jobs/:jobId
 * @desc    Update job
 * @access  Private (JWT Token Required)
 */
router.put('/:jobId', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('jobSummary')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Job summary must not exceed 1000 characters'),
  body('payPerHour')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pay per hour must be a positive number'),
  body('hoursPerDay')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Hours per day must be between 1 and 24')
], JobController.updateJob);

/**
 * @route   PUT /api/jobs/:jobId/toggle-status
 * @desc    Pause/Resume job
 * @access  Private (JWT Token Required)
 */
router.put('/:jobId/toggle-status', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.toggleJobStatus);

/**
 * @route   DELETE /api/jobs/:jobId
 * @desc    Delete job (soft delete)
 * @access  Private (JWT Token Required)
 */
router.delete('/:jobId', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.deleteJob);

/**
 * @route   POST /api/jobs/:jobId/copy
 * @desc    Copy job (create duplicate)
 * @access  Private (JWT Token Required)
 */
router.post('/:jobId/copy', authenticateToken, [
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], JobController.copyJob);

/**
 * @route   GET /api/jobs/stats
 * @desc    Get job statistics
 * @access  Public
 */
router.get('/stats', [
  query('companyId')
    .optional()
    .notEmpty()
    .withMessage('Company ID cannot be empty if provided')
], JobController.getJobStats);

/**
 * @route   GET /api/jobs/trending
 * @desc    Get trending jobs
 * @access  Public
 */
router.get('/trending', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], JobController.getTrendingJobs);

module.exports = router;