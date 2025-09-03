const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');

const SeekerController = require('../controllers/seekerController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const router = express.Router();

/**
 * Seeker Profile Routes
 * Base path: /api/seekers
 */

/**
 * @route   POST /api/seekers
 * @desc    Create seeker profile
 * @access  Private (JWT Token Required)
 */
router.post('/', authenticateToken, [
  // Step 1: Personal Information
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  body('idNumber')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('ID number must be between 1 and 20 characters'),
  body('dateOfBirth')
    .optional()
    .isString()
    .withMessage('Date of birth must be a string'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be Male or Female'),
  body('mobileNumber')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Mobile number must be between 8 and 15 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('profilePhoto')
    .optional()
    .isString()
    .withMessage('Profile photo must be a string'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('educationalLevel')
    .optional()
    .isIn(['High School', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other'])
    .withMessage('Educational level must be one of the valid options'),
  // Step 2: Professional Information
  body('industries')
    .optional()
    .isArray()
    .withMessage('Industries must be an array'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('yearsOfExperience')
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage('Years of experience must be between 1 and 10 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('previousWorkplaces')
    .optional()
    .isArray()
    .withMessage('Previous workplaces must be an array'),
  body('certificates')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Certificates must be less than 1000 characters'),
  // Step 3: Availability & Preferences
  body('availability')
    .optional()
    .isIn(['Public Holidays', 'Both', 'Weekends'])
    .withMessage('Availability must be one of the valid options'),
  body('currentStatus')
    .optional()
    .isIn(['Student', 'Working', 'Not Working'])
    .withMessage('Current status must be one of the valid options'),
  body('workType')
    .optional()
    .isIn(['Hourly Work', 'Short-Term Hire', 'Full-Time Work'])
    .withMessage('Work type must be one of the valid options'),
  body('preferredLocations')
    .optional()
    .isArray()
    .withMessage('Preferred locations must be an array'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  body('retailAcademyTrained')
    .optional()
    .isIn(['Yes', 'No'])
    .withMessage('Retail academy trained must be Yes or No'),
  // Step 4: Terms & Conditions
  body('acceptedTerms')
    .optional()
    .isBoolean()
    .withMessage('Accepted terms must be a boolean'),
  // Step 5: Profile Confirmation
  body('profileConfirmed')
    .optional()
    .isBoolean()
    .withMessage('Profile confirmed must be a boolean')
], SeekerController.createProfile);

/**
 * @route   GET /api/seekers/user/:userId
 * @desc    Get seeker profile by user ID
 * @access  Private (JWT Token Required)
 */
router.get('/user/:userId', authenticateToken, [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], SeekerController.getProfileByUserId);

/**
 * @route   GET /api/seekers/:seekerId
 * @desc    Get seeker profile by ID
 * @access  Private (JWT Token Required)
 */
router.get('/:seekerId', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getProfileById);

/**
 * @route   PUT /api/seekers/:seekerId
 * @desc    Update seeker profile
 * @access  Private (JWT Token Required)
 */
router.put('/:seekerId', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  // Step 1: Personal Information
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  body('idNumber')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('ID number must be between 1 and 20 characters'),
  body('dateOfBirth')
    .optional()
    .isString()
    .withMessage('Date of birth must be a string'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be Male or Female'),
  body('mobileNumber')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Mobile number must be between 8 and 15 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('profilePhoto')
    .optional()
    .isString()
    .withMessage('Profile photo must be a string'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('educationalLevel')
    .optional()
    .isIn(['High School', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other'])
    .withMessage('Educational level must be one of the valid options'),
  // Step 2: Professional Information
  body('industries')
    .optional()
    .isArray()
    .withMessage('Industries must be an array'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('yearsOfExperience')
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage('Years of experience must be between 1 and 10 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('previousWorkplaces')
    .optional()
    .isArray()
    .withMessage('Previous workplaces must be an array'),
  body('certificates')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Certificates must be less than 1000 characters'),
  // Step 3: Availability & Preferences
  body('availability')
    .optional()
    .isIn(['Public Holidays', 'Both', 'Weekends'])
    .withMessage('Availability must be one of the valid options'),
  body('currentStatus')
    .optional()
    .isIn(['Student', 'Working', 'Not Working'])
    .withMessage('Current status must be one of the valid options'),
  body('workType')
    .optional()
    .isIn(['Hourly Work', 'Short-Term Hire', 'Full-Time Work'])
    .withMessage('Work type must be one of the valid options'),
  body('preferredLocations')
    .optional()
    .isArray()
    .withMessage('Preferred locations must be an array'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  body('retailAcademyTrained')
    .optional()
    .isIn(['Yes', 'No'])
    .withMessage('Retail academy trained must be Yes or No'),
  // Step 4: Terms & Conditions
  body('acceptedTerms')
    .optional()
    .isBoolean()
    .withMessage('Accepted terms must be a boolean'),
  // Step 5: Profile Confirmation
  body('profileConfirmed')
    .optional()
    .isBoolean()
    .withMessage('Profile confirmed must be a boolean')
], SeekerController.updateProfile);

/**
 * @route   PUT /api/seekers/:seekerId/step/:step
 * @desc    Update profile step
 * @access  Private (JWT Token Required)
 */
router.put('/:seekerId/step/:step', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  param('step')
    .isInt({ min: 1, max: 5 })
    .withMessage('Step must be between 1 and 5')
], SeekerController.updateProfileStep);

/**
 * @route   GET /api/seekers/search
 * @desc    Search seekers
 * @access  Public
 */
router.get('/search', [
  query('industries')
    .optional(),
  query('roles')
    .optional(),
  query('skills')
    .optional(),
  query('preferredLocations')
    .optional(),
  query('languages')
    .optional(),
  query('availability')
    .optional()
    .isIn(['Public Holidays', 'Both', 'Weekends'])
    .withMessage('Availability must be one of the valid options'),
  query('workType')
    .optional()
    .isIn(['Hourly Work', 'Short-Term Hire', 'Full-Time Work'])
    .withMessage('Work type must be one of the valid options'),
  query('retailAcademyTrained')
    .optional()
    .isIn(['Yes', 'No'])
    .withMessage('Retail academy trained must be Yes or No'),
  query('minActivityScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum activity score must be between 0 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
], SeekerController.searchSeekers);

/**
 * @route   GET /api/seekers/location/:location
 * @desc    Get seekers by preferred location
 * @access  Public
 */
router.get('/location/:location', [
  param('location')
    .notEmpty()
    .withMessage('Location is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getSeekersByLocation);

/**
 * @route   GET /api/seekers/:seekerId/completion
 * @desc    Get profile completion status
 * @access  Private (JWT Token Required)
 */
router.get('/:seekerId/completion', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getProfileCompletion);

/**
 * @route   POST /api/seekers/:seekerId/photo
 * @desc    Upload profile photo
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/photo', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('profilePhoto')
    .notEmpty()
    .withMessage('Profile photo URL is required')
    .isURL()
    .withMessage('Profile photo must be a valid URL')
], SeekerController.uploadProfilePhoto);

/**
 * @route   POST /api/seekers/:seekerId/cv
 * @desc    Upload CV
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/cv', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('cvFile')
    .notEmpty()
    .withMessage('CV file URL is required')
    .isURL()
    .withMessage('CV file must be a valid URL')
], SeekerController.uploadCV);

/**
 * @route   DELETE /api/seekers/:seekerId
 * @desc    Delete seeker profile
 * @access  Private (JWT Token Required)
 */
router.delete('/:seekerId', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.deleteProfile);

/**
 * @route   POST /api/seekers/:seekerId/request-video
 * @desc    Request video recording
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/request-video', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.requestVideoRecording);

/**
 * @route   POST /api/seekers/:seekerId/schedule-video
 * @desc    Schedule video recording (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:seekerId/schedule-video', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('scheduledDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date'),
  body('location')
    .notEmpty()
    .withMessage('Recording location is required'),
  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes must be less than 500 characters')
], SeekerController.scheduleVideoRecording);

/**
 * @route   POST /api/seekers/:seekerId/mark-video-recorded
 * @desc    Mark video as recorded (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:seekerId/mark-video-recorded', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes must be less than 500 characters')
], SeekerController.markVideoRecorded);

/**
 * @route   POST /api/seekers/:seekerId/publish-video
 * @desc    Publish video (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:seekerId/publish-video', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('videoUrl')
    .notEmpty()
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes must be less than 500 characters')
], SeekerController.publishVideo);

/**
 * @route   POST /api/seekers/:seekerId/reject-video
 * @desc    Reject video request (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:seekerId/reject-video', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('reason')
    .notEmpty()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be less than 500 characters')
], SeekerController.rejectVideoRequest);

/**
 * @route   GET /api/seekers/:seekerId/video-status
 * @desc    Get video workflow status
 * @access  Private (JWT Token Required)
 */
router.get('/:seekerId/video-status', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getVideoStatus);

/**
 * @route   POST /api/seekers/:seekerId/add-strike
 * @desc    Add strike for no-show (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:seekerId/add-strike', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Strike reason must be less than 200 characters')
], SeekerController.addStrike);

/**
 * @route   POST /api/seekers/:seekerId/update-activity-score
 * @desc    Update activity score
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/update-activity-score', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('scoreChange')
    .isInt({ min: -100, max: 100 })
    .withMessage('Score change must be between -100 and 100')
], SeekerController.updateActivityScore);

/**
 * @route   GET /api/seekers/high-performers
 * @desc    Get high-performing seekers
 * @access  Public
 */
router.get('/high-performers', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getHighPerformers);

/**
 * @route   GET /api/seekers/admin/video-pending
 * @desc    Get seekers with pending video requests (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/admin/video-pending', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getVideoPendingRequests);

/**
 * @route   GET /api/seekers/admin/video-scheduled
 * @desc    Get seekers with scheduled video recordings (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/admin/video-scheduled', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getScheduledVideoRecordings);

/**
 * @route   GET /api/seekers/admin/video-recorded
 * @desc    Get seekers with recorded videos pending publication (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/admin/video-recorded', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getRecordedVideosPendingPublication);

/**
 * @route   GET /api/seekers/admin/video-stats
 * @desc    Get video workflow statistics (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/admin/video-stats', authenticateToken, [], SeekerController.getVideoWorkflowStats);

/**
 * @route   POST /api/seekers/:seekerId/apply-job
 * @desc    Record job application
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/apply-job', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('jobTitle')
    .notEmpty()
    .withMessage('Job title is required'),
  body('companyName')
    .notEmpty()
    .withMessage('Company name is required')
], SeekerController.recordJobApplication);

/**
 * @route   POST /api/seekers/:seekerId/record-interview
 * @desc    Record interview
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/record-interview', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('interviewDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Interview date must be a valid ISO date'),
  body('interviewType')
    .optional()
    .isIn(['in-person', 'phone', 'video', 'group'])
    .withMessage('Interview type must be one of: in-person, phone, video, group'),
  body('status')
    .optional()
    .isIn(['scheduled', 'completed', 'no-show', 'cancelled'])
    .withMessage('Status must be one of: scheduled, completed, no-show, cancelled')
], SeekerController.recordInterview);

/**
 * @route   POST /api/seekers/:seekerId/record-no-show
 * @desc    Record no-show
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/record-no-show', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Reason must be less than 200 characters')
], SeekerController.recordNoShow);

/**
 * @route   POST /api/seekers/:seekerId/record-hire
 * @desc    Record hire/job completion
 * @access  Private (JWT Token Required)
 */
router.post('/:seekerId/record-hire', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('jobTitle')
    .notEmpty()
    .withMessage('Job title is required'),
  body('companyName')
    .notEmpty()
    .withMessage('Company name is required'),
  body('startDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
], SeekerController.recordHire);

/**
 * @route   GET /api/seekers/:seekerId/stats
 * @desc    Get seeker statistics (for CSV export)
 * @access  Private (JWT Token Required)
 */
router.get('/:seekerId/stats', authenticateToken, [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getSeekerStats);

/**
 * @route   POST /api/seekers/upload-image
 * @desc    Upload profile image to Firebase Storage
 * @access  Private (JWT Token Required)
 */
router.post('/upload-image', authenticateToken, upload.single('image'), [
  body('type')
    .optional()
    .isIn(['profile', 'cv', 'certificate'])
    .withMessage('Type must be one of: profile, cv, certificate')
], SeekerController.uploadImage);

/**
 * @route   POST /api/seekers/cleanup-placeholders
 * @desc    Clean up placeholder URLs from database (Admin only)
 * @access  Private (JWT Token Required)
 */
router.post('/cleanup-placeholders', authenticateToken, SeekerController.cleanupPlaceholderUrls);

/**
 * @route   GET /api/seekers/admin/export-csv
 * @desc    Export all seekers data (Admin only)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/admin/export-csv', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('Limit must be between 1 and 5000')
], SeekerController.exportSeekerData);

/**
 * @route   GET /api/seekers/blocking-status
 * @desc    Get seeker's blocking status across companies
 * @access  Private (Seeker)
 */
router.get('/blocking-status', authenticateToken, SeekerController.getBlockingStatus);

/**
 * @route   GET /api/seekers/blocking-stats
 * @desc    Get detailed blocking statistics for seeker
 * @access  Private (Seeker)
 */
router.get('/blocking-stats', authenticateToken, SeekerController.getBlockingStats);

/**
 * @route   GET /api/seekers/can-apply-to/:companyId
 * @desc    Check if seeker can apply to a specific company
 * @access  Private (Seeker)
 */
router.get('/can-apply-to/:companyId', authenticateToken, [
  param('companyId').notEmpty().withMessage('Company ID is required')
], SeekerController.canApplyToCompany);

module.exports = router;