const express = require('express');
const { body, param, query } = require('express-validator');
const CompanyController = require('../controllers/companyController');
const router = express.Router();

/**
 * Company Profile Routes
 * Base path: /api/companies
 */

/**
 * @route   POST /api/companies
 * @desc    Create company profile
 * @access  Public
 */
router.post('/', [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
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
    .withMessage('Established year must be between 1900 and current year')
], CompanyController.createProfile);

/**
 * @route   GET /api/companies/user/:userId
 * @desc    Get company profile by user ID
 * @access  Public
 */
router.get('/user/:userId', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], CompanyController.getProfileByUserId);

/**
 * @route   GET /api/companies/:companyId
 * @desc    Get company profile by ID
 * @access  Public
 */
router.get('/:companyId', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getProfileById);

/**
 * @route   PUT /api/companies/:companyId
 * @desc    Update company profile
 * @access  Public
 */
router.put('/:companyId', [
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
    .withMessage('Please provide a valid website URL')
], CompanyController.updateProfile);

/**
 * @route   PUT /api/companies/:companyId/step/:step
 * @desc    Update profile step
 * @access  Public
 */
router.put('/:companyId/step/:step', [
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
 * @access  Public
 */
router.get('/:companyId/completion', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getProfileCompletion);

/**
 * @route   POST /api/companies/:companyId/logo
 * @desc    Upload company logo
 * @access  Public
 */
router.post('/:companyId/logo', [
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
 * @access  Public
 */
router.post('/:companyId/cover', [
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
 * @access  Public
 */
router.post('/:companyId/rating', [
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
 * @access  Public
 */
router.put('/:companyId/trial-status', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.updateTrialStatus);

/**
 * @route   POST /api/companies/:companyId/payment-methods
 * @desc    Add payment method
 * @access  Public
 */
router.post('/:companyId/payment-methods', [
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
 * @access  Public
 */
router.post('/:companyId/purchase-subscription', [
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
 * @access  Public
 */
router.post('/:companyId/payg-payment', [
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
 * @route   POST /api/companies/:companyId/request-custom-plan
 * @desc    Request custom plan
 * @access  Public
 */
router.post('/:companyId/request-custom-plan', [
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
 * @access  Public
 */
router.post('/:companyId/contact-admin', [
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
 * @access  Public
 */
router.post('/:companyId/team-members', [
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
 * @access  Public
 */
router.post('/:companyId/brands', [
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
 * @access  Public
 */
router.post('/:companyId/locations', [
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
 * @access  Public
 */
router.get('/:companyId/subscription', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getSubscriptionDetails);

/**
 * @route   POST /api/companies/:companyId/payment-transaction
 * @desc    Add payment transaction
 * @access  Public
 */
router.post('/:companyId/payment-transaction', [
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
 * @access  Public
 */
router.get('/:companyId/payment-history', [
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
 * @access  Public
 */
router.get('/:companyId/payment-stats', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getPaymentStats);

/**
 * @route   GET /api/companies/:companyId/pricing-plans
 * @desc    Get current pricing plans
 * @access  Public
 */
router.get('/:companyId/pricing-plans', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getPricingPlans);

/**
 * @route   GET /api/companies/:companyId/recommended-plan
 * @desc    Get recommended plan based on usage
 * @access  Public
 */
router.get('/:companyId/recommended-plan', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getRecommendedPlan);

/**
 * @route   GET /api/companies/:companyId/can-perform/:action
 * @desc    Check if company can perform action
 * @access  Public
 */
router.get('/:companyId/can-perform/:action', [
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
 * @access  Public
 */
router.get('/:companyId/trial-status', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getTrialStatus);

/**
 * @route   POST /api/companies/:companyId/admin/verify-cr
 * @desc    Admin: Verify CR
 * @access  Admin
 */
router.post('/:companyId/admin/verify-cr', [
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
 * @access  Admin
 */
router.get('/:companyId/detailed', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getDetailedProfile);

/**
 * @route   DELETE /api/companies/:companyId
 * @desc    Delete company profile
 * @access  Public
 */
router.delete('/:companyId', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.deleteProfile);

/**
 * @route   GET /api/companies/:companyId/csv-data
 * @desc    Get company data in CSV format
 * @access  Public
 */
router.get('/:companyId/csv-data', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getCompanyCSVData);

/**
 * @route   PUT /api/companies/:companyId/csv-update
 * @desc    Update company data from CSV
 * @access  Public
 */
router.put('/:companyId/csv-update', [
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
 * @access  Public
 */
router.get('/:companyId/stats', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.getCompanyStats);

/**
 * @route   GET /api/companies/export/csv
 * @desc    Export all companies data to CSV format
 * @access  Public
 */
router.get('/export/csv', [
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

module.exports = router;