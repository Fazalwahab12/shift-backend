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
  body('commercialRegistrationNumber')
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
  body('commercialRegistrationNumber')
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
 * @route   DELETE /api/companies/:companyId
 * @desc    Delete company profile
 * @access  Public
 */
router.delete('/:companyId', [
  param('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
], CompanyController.deleteProfile);

module.exports = router;