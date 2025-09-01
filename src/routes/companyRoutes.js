const express = require('express');
const { body, param, query } = require('express-validator');
const CompanyController = require('../controllers/companyController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * Company Profile Routes
 * Base path: /api/companies
 */

/**
 * @route   POST /api/companies
 * @desc    Create company profile
 * @access  Private (JWT Token Required)
 */
router.post('/', authenticateToken, [
  body('companyName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  body('companyNameArabic')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arabic company name must be between 1 and 100 characters'),
  body('crNumber')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Commercial registration number must be between 1 and 20 characters'),
  body('companyEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid company email address'),
  body('companyPhone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Company phone must be between 8 and 15 characters'),
  body('primaryIndustry')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Primary industry must be between 1 and 50 characters'),
  body('companySize')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large'])
    .withMessage('Company size must be startup, small, medium, or large'),
  body('establishedYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Established year must be between 1900 and current year'),
  // Add contact person validation fields
  body('contactPerson')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Contact person name must be between 1 and 100 characters'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email address'),
  body('contactPhone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Contact phone must be between 8 and 15 characters'),
  body('contactRole')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Contact role must be between 1 and 50 characters'),
  body('companyType')
    .optional()
    .isIn(['SME', 'Corporate'])
    .withMessage('Company type must be SME or Corporate'),
  body('geographicalPresence')
    .optional()
    .isIn(['Local', 'Regional', 'Global'])
    .withMessage('Geographical presence must be Local, Regional, or Global')
], CompanyController.createProfile);

/**
 * @route   GET /api/companies/user/:userId
 * @desc    Get company profile by user ID
 * @access  Private (JWT Token Required)
 */
router.get('/user/:userId', authenticateToken, [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], CompanyController.getProfileByUserId);

/**
 * @route   GET /api/companies/:companyId
 * @desc    Get company profile by ID
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getProfileById);

/**
 * @route   PUT /api/companies/:companyId
 * @desc    Update company profile
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('companyName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),
  body('companyNameArabic')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arabic company name must be between 1 and 100 characters'),
  body('crNumber')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Commercial registration number must be between 1 and 20 characters'),
  body('companyEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid company email address'),
  body('companyPhone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Company phone must be between 8 and 15 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  // Contact person validation fields
  body('contactPerson')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Contact person name must be between 1 and 100 characters'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid contact email address'),
  body('contactPhone')
    .optional()
    .isLength({ min: 8, max: 15 })
    .withMessage('Contact phone must be between 8 and 15 characters'),
  body('contactRole')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Contact role must be between 1 and 50 characters'),
  body('companyType')
    .optional()
    .isIn(['SME', 'Corporate'])
    .withMessage('Company type must be SME or Corporate'),
  body('geographicalPresence')
    .optional()
    .isIn(['Local', 'Regional', 'Global'])
    .withMessage('Geographical presence must be Local, Regional, or Global')
], CompanyController.updateProfile);

/**
 * @route   PUT /api/companies/:companyId/step/:step
 * @desc    Update profile step
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/step/:step', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('step')
    .isInt({ min: 1, max: 6 })
    .withMessage('Step must be between 1 and 6')
], CompanyController.updateProfileStep);

/**
 * @route   GET /api/companies/search
 * @desc    Search companies
 * @access  Public
 */
router.get('/search', [
  query('industry')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Industry must be between 1 and 50 characters'),
  query('governorate')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Governorate must be between 1 and 50 characters'),
  query('companySize')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large'])
    .withMessage('Company size must be startup, small, medium, or large'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
], CompanyController.searchCompanies);

/**
 * @route   GET /api/companies/industry/:industry
 * @desc    Get companies by industry
 * @access  Public
 */
router.get('/industry/:industry', [
  param('industry')
    .notEmpty()
    .withMessage('Industry is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], CompanyController.getCompaniesByIndustry);

/**
 * @route   GET /api/companies/:companyId/completion
 * @desc    Get profile completion status
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/completion', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getProfileCompletion);

/**
 * @route   POST /api/companies/:companyId/logo
 * @desc    Upload company logo
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/logo', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('companyLogo')
    .notEmpty()
    .withMessage('Company logo URL is required')
    .isURL()
    .withMessage('Company logo must be a valid URL')
], CompanyController.uploadCompanyLogo);

/**
 * @route   POST /api/companies/:companyId/cover
 * @desc    Upload cover photo
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/cover', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('coverPhoto')
    .notEmpty()
    .withMessage('Cover photo URL is required')
    .isURL()
    .withMessage('Cover photo must be a valid URL')
], CompanyController.uploadCoverPhoto);

/**
 * @route   GET /api/companies/check-registration/:crNumber
 * @desc    Check commercial registration number
 * @access  Public
 */
router.get('/check-registration/:crNumber', [
  param('crNumber')
    .notEmpty()
    .withMessage('Commercial registration number is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Commercial registration number must be between 1 and 20 characters')
], CompanyController.checkRegistrationNumber);

/**
 * @route   POST /api/companies/:companyId/rating
 * @desc    Update company rating
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/rating', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
], CompanyController.updateRating);

/**
 * @route   PUT /api/companies/:companyId/trial-status
 * @desc    Update trial status
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/trial-status', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.updateTrialStatus);

/**
 * @route   POST /api/companies/:companyId/payment-methods
 * @desc    Add payment method
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/payment-methods', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('type')
    .isIn(['bank', 'paypal', 'stripe'])
    .withMessage('Payment method type must be bank, paypal, or stripe'),
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Payment method name is required and must be between 1 and 100 characters'),
  body('details')
    .optional()
    .isObject()
    .withMessage('Payment method details must be an object')
], CompanyController.addPaymentMethod);

/**
 * @route   POST /api/companies/:companyId/purchase-subscription
 * @desc    Purchase subscription
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/purchase-subscription', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('planType')
    .isIn(['starter', 'professional'])
    .withMessage('Plan type must be starter or professional'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly')
], CompanyController.purchaseSubscription);

/**
 * @route   POST /api/companies/:companyId/payg-payment
 * @desc    Process pay-as-you-go payment
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/payg-payment', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('matches')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Matches must be between 1 and 1000'),
  body('interviewPackage')
    .optional()
    .isIn(['10interviews', '20interviews', '50interviews'])
    .withMessage('Interview package must be 10interviews, 20interviews, or 50interviews'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
], CompanyController.processPAYGPayment);

/**
 * @route   POST /api/companies/:companyId/thawani-checkout
 * @desc    Create Thawani checkout session for payment
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/thawani-checkout', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('planType')
    .isIn(['pay_as_you_go', 'subscription_starter', 'subscription_pro'])
    .withMessage('Plan type must be pay_as_you_go, subscription_starter, or subscription_pro'),
  body('planName')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Plan name is required'),
  body('amount')
    .isFloat({ min: 0.1 })
    .withMessage('Amount must be greater than 0'),
  body('planDetails')
    .optional()
    .isObject()
    .withMessage('Plan details must be an object')
], CompanyController.createThawaniCheckout);

/**
 * @route   POST /api/companies/:companyId/thawani-webhook
 * @desc    Handle Thawani payment webhook
 * @access  Public (Thawani webhook)
 */
router.post('/:companyId/thawani-webhook', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('session_id')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('payment_status')
    .notEmpty()
    .withMessage('Payment status is required')
], CompanyController.handleThawaniWebhook);

/**
 * @route   GET /api/companies/:companyId/plan-status
 * @desc    Get current plan status and expiration info
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/plan-status', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getPlanStatus);

/**
 * @route   POST /api/companies/:companyId/request-custom-plan
 * @desc    Request custom plan
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/request-custom-plan', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('requiredFeatures')
    .optional()
    .isArray()
    .withMessage('Required features must be an array'),
  body('expectedUsage')
    .optional()
    .isObject()
    .withMessage('Expected usage must be an object'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('contactDetails')
    .optional()
    .isObject()
    .withMessage('Contact details must be an object')
], CompanyController.requestCustomPlan);

/**
 * @route   POST /api/companies/:companyId/contact-admin
 * @desc    Contact admin
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/contact-admin', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('message')
    .notEmpty()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message is required and must be between 10 and 1000 characters')
], CompanyController.contactAdmin);

/**
 * @route   POST /api/companies/:companyId/team-members
 * @desc    Add team member
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/team-members', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
], CompanyController.addTeamMember);

/**
 * @route   POST /api/companies/:companyId/brands
 * @desc    Add brand
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/brands', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand name is required and must be between 1 and 100 characters'),
  body('logo')
    .optional()
    .isURL()
    .withMessage('Brand logo must be a valid URL'),
  body('industry')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Industry must be between 1 and 50 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
], CompanyController.addBrand);

/**
 * @route   POST /api/companies/:companyId/locations
 * @desc    Add location
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/locations', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('address')
    .notEmpty()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address is required and must be between 10 and 200 characters'),
  body('governorate')
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .withMessage('Governorate is required and must be between 1 and 50 characters'),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('manager')
    .optional()
    .isObject()
    .withMessage('Manager details must be an object')
], CompanyController.addLocation);

/**
 * @route   GET /api/companies/:companyId/subscription
 * @desc    Get subscription details
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/subscription', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getSubscriptionDetails);

/**
 * @route   POST /api/companies/:companyId/payment-transaction
 * @desc    Add payment transaction
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/payment-transaction', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('paymentType')
    .isIn(['PAYG', 'Add on', 'Starter Plan', 'Pro Bundle', 'Custom Plan'])
    .withMessage('Payment type must be PAYG, Add on, Starter Plan, Pro Bundle, or Custom Plan'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid ISO date'),
  body('validity')
    .optional()
    .isString()
    .withMessage('Validity must be a string'),
  body('lpoNumber')
    .optional()
    .isString()
    .withMessage('LPO number must be a string'),
  body('lpoIssuedDate')
    .optional()
    .isISO8601()
    .withMessage('LPO issued date must be a valid ISO date'),
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Payment status must be pending, completed, failed, or refunded'),
  body('transactionReference')
    .optional()
    .isString()
    .withMessage('Transaction reference must be a string')
], CompanyController.addPaymentTransaction);

/**
 * @route   GET /api/companies/:companyId/payment-history
 * @desc    Get payment history with filtering
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/payment-history', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  query('paymentType')
    .optional()
    .isIn(['PAYG', 'Add on', 'Starter Plan', 'Pro Bundle', 'Custom Plan'])
    .withMessage('Payment type must be PAYG, Add on, Starter Plan, Pro Bundle, or Custom Plan'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Status must be pending, completed, failed, or refunded'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
], CompanyController.getPaymentHistory);

/**
 * @route   GET /api/companies/:companyId/payment-stats
 * @desc    Get payment statistics
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/payment-stats', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getPaymentStats);

/**
 * @route   GET /api/companies/:companyId/pricing-plans
 * @desc    Get current pricing plans
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/pricing-plans', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getPricingPlans);

/**
 * @route   GET /api/companies/:companyId/recommended-plan
 * @desc    Get recommended plan based on usage
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/recommended-plan', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getRecommendedPlan);

/**
 * @route   GET /api/companies/:companyId/can-perform/:action
 * @desc    Check if company can perform action
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/can-perform/:action', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('action')
    .isIn(['instant_match', 'interview', 'add_location', 'add_team_member', 'job_posting'])
    .withMessage('Action must be instant_match, interview, add_location, add_team_member, or job_posting')
], CompanyController.canPerformAction);

/**
 * @route   GET /api/companies/:companyId/trial-status
 * @desc    Get trial status
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/trial-status', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getTrialStatus);

/**
 * @route   POST /api/companies/:companyId/admin/verify-cr
 * @desc    Admin: Verify CR
 * @access  Private (JWT Token Required - Admin)
 */
router.post('/:companyId/admin/verify-cr', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Admin notes must not exceed 500 characters')
], CompanyController.adminVerifyCR);

/**
 * @route   GET /api/companies/:companyId/detailed
 * @desc    Get detailed company profile (admin)
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/:companyId/detailed', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getDetailedProfile);

/**
 * @route   DELETE /api/companies/:companyId
 * @desc    Delete company profile
 * @access  Private (JWT Token Required)
 */
router.delete('/:companyId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.deleteProfile);

/**
 * @route   GET /api/companies/:companyId/csv-data
 * @desc    Get company data in CSV format
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/csv-data', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getCompanyCSVData);

/**
 * @route   PUT /api/companies/:companyId/csv-update
 * @desc    Update company data from CSV
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/csv-update', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  body('companyNumber')
    .optional()
    .isString()
    .withMessage('Company number must be a string'),
  body('companyName')
    .optional()
    .isString()
    .withMessage('Company name must be a string'),
  body('companyCR')
    .optional()
    .isString()
    .withMessage('Company CR must be a string'),
  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string'),
  body('roles')
    .optional()
    .isString()
    .withMessage('Roles must be a string'),
  body('registrationDate')
    .optional()
    .isISO8601()
    .withMessage('Registration date must be a valid ISO date'),
  body('numberOfBands')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of bands must be a positive integer'),
  body('numberOfBranches')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of branches must be a positive integer'),
  body('lastActiveDate')
    .optional()
    .isISO8601()
    .withMessage('Last active date must be a valid ISO date'),
  body('numberOfJobPosts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Number of job posts must be 0 or greater'),
  body('totalInstantHires')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total instant hires must be 0 or greater'),
  body('totalInterviews')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total interviews must be 0 or greater'),
  body('spentOnHiring')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Spent on hiring must be 0 or greater'),
  body('usedFreeTrial')
    .optional()
    .isBoolean()
    .withMessage('Used free trial must be a boolean'),
  body('previousPlansPurchases')
    .optional()
    .isString()
    .withMessage('Previous plans purchases must be a string')
], CompanyController.updateCompanyFromCSV);

/**
 * @route   GET /api/companies/:companyId/stats
 * @desc    Get company statistics for reporting
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/stats', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getCompanyStats);

/**
 * @route   GET /api/companies/export/csv
 * @desc    Export all companies data to CSV format
 * @access  Private (JWT Token Required - Admin)
 */
router.get('/export/csv', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Limit must be between 1 and 10000'),
  query('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string'),
  query('usedFreeTrial')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Used free trial must be true or false')
], CompanyController.exportCompaniesToCSV);

// ===================================
// JOB POSTING ROUTES FOR COMPANIES
// ===================================

/**
 * @route   POST /api/companies/:companyId/jobs
 * @desc    Create new job posting (Step 1: Basic Info)
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
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
    .isURL()
    .withMessage('Job cover image must be a valid URL'),
  body('dressCodeGuideline')
    .optional()
    .isURL()
    .withMessage('Dress code guideline must be a valid URL')
], CompanyController.createJob);

/**
 * @route   PUT /api/companies/:companyId/jobs/:jobId/step/:step
 * @desc    Update job step (Steps 1-4)
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/jobs/:jobId/step/:step', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
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
], CompanyController.updateJobStep);

/**
 * @route   POST /api/companies/:companyId/jobs/:jobId/publish
 * @desc    Publish job (Final step)
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs/:jobId/publish', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], CompanyController.publishJob);

/**
 * @route   GET /api/companies/:companyId/jobs
 * @desc    Get all jobs for a company
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs', authenticateToken, [
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
], CompanyController.getCompanyJobs);

/**
 * @route   GET /api/companies/:companyId/jobs/:jobId
 * @desc    Get job by ID
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs/:jobId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  query('increment_views')
    .optional()
    .isBoolean()
    .withMessage('Increment views must be a boolean')
], CompanyController.getJobById);

/**
 * @route   PUT /api/companies/:companyId/jobs/:jobId
 * @desc    Update job
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/jobs/:jobId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
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
], CompanyController.updateJob);

/**
 * @route   PUT /api/companies/:companyId/jobs/:jobId/toggle-status
 * @desc    Toggle job status (pause/resume)
 * @access  Private (JWT Token Required)
 */
router.put('/:companyId/jobs/:jobId/toggle-status', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], CompanyController.toggleJobStatus);

/**
 * @route   DELETE /api/companies/:companyId/jobs/:jobId
 * @desc    Delete job (soft delete)
 * @access  Private (JWT Token Required)
 */
router.delete('/:companyId/jobs/:jobId', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], CompanyController.deleteJob);

/**
 * @route   POST /api/companies/:companyId/jobs/:jobId/copy
 * @desc    Copy job (create duplicate)
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs/:jobId/copy', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required')
], CompanyController.copyJob);

/**
 * @route   GET /api/companies/:companyId/jobs/stats
 * @desc    Get job statistics for company
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs/stats', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getCompanyJobStats);

/**
 * @route   GET /api/companies/:companyId/jobs/:jobId/applications
 * @desc    Get job applications
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs/:jobId/applications', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
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
    .isIn(['applied', 'interviewed', 'hired', 'rejected'])
    .withMessage('Status must be applied, interviewed, hired, or rejected')
], CompanyController.getJobApplications);

/**
 * @route   POST /api/companies/:companyId/jobs/:jobId/shortlist
 * @desc    Shortlist or reject candidate
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs/:jobId/shortlist', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('action')
    .isIn(['shortlist', 'reject'])
    .withMessage('Action must be shortlist or reject')
], CompanyController.shortlistCandidate);

/**
 * @route   POST /api/companies/:companyId/jobs/:jobId/schedule-interview
 * @desc    Schedule interview with candidate
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs/:jobId/schedule-interview', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('interviewDate')
    .isISO8601()
    .withMessage('Interview date must be a valid ISO date'),
  body('interviewTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Interview time must be in HH:MM format'),
  body('interviewType')
    .isIn(['in-person', 'phone', 'video'])
    .withMessage('Interview type must be in-person, phone, or video'),
  body('location')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location must be between 1 and 200 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
], CompanyController.scheduleInterview);

/**
 * @route   POST /api/companies/:companyId/jobs/:jobId/hire
 * @desc    Hire candidate
 * @access  Private (JWT Token Required)
 */
router.post('/:companyId/jobs/:jobId/hire', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  body('workSchedule')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Work schedule must be between 1 and 200 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
], CompanyController.hireCandidate);

/**
 * @route   GET /api/companies/:companyId/jobs/:jobId/matching-seekers
 * @desc    Get matching seekers for job
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs/:jobId/matching-seekers', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  param('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
  query('minScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Minimum score must be between 0 and 100')
], CompanyController.getMatchingSeekers);

/**
 * @route   GET /api/companies/:companyId/dashboard/hiring-analytics
 * @desc    Get hiring analytics dashboard data
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/dashboard/hiring-analytics', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Period must be week, month, quarter, or year')
], CompanyController.getHiringAnalytics);

/**
 * @route   GET /api/companies/:companyId/jobs/trending
 * @desc    Get company's trending jobs
 * @access  Private (JWT Token Required)
 */
router.get('/:companyId/jobs/trending', authenticateToken, [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], CompanyController.getCompanyTrendingJobs);

module.exports = router;