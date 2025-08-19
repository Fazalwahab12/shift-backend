const express = require('express');
const { body, param, query } = require('express-validator');
const SeekerController = require('../controllers/seekerController');
const router = express.Router();

/**
 * Seeker Profile Routes
 * Base path: /api/seekers
 */

/**
 * @route   POST /api/seekers
 * @desc    Create seeker profile
 * @access  Public
 */
router.post('/', [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'intermediate', 'senior'])
    .withMessage('Experience level must be entry, intermediate, or senior'),
  body('governorate')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Governorate must be between 1 and 50 characters')
], SeekerController.createProfile);

/**
 * @route   GET /api/seekers/user/:userId
 * @desc    Get seeker profile by user ID
 * @access  Public
 */
router.get('/user/:userId', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], SeekerController.getProfileByUserId);

/**
 * @route   GET /api/seekers/:seekerId
 * @desc    Get seeker profile by ID
 * @access  Public
 */
router.get('/:seekerId', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getProfileById);

/**
 * @route   PUT /api/seekers/:seekerId
 * @desc    Update seeker profile
 * @access  Public
 */
router.put('/:seekerId', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'intermediate', 'senior'])
    .withMessage('Experience level must be entry, intermediate, or senior')
], SeekerController.updateProfile);

/**
 * @route   PUT /api/seekers/:seekerId/step/:step
 * @desc    Update profile step
 * @access  Public
 */
router.put('/:seekerId/step/:step', [
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
  query('experienceLevel')
    .optional()
    .isIn(['entry', 'intermediate', 'senior'])
    .withMessage('Experience level must be entry, intermediate, or senior'),
  query('governorate')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Governorate must be between 1 and 50 characters'),
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
 * @route   GET /api/seekers/location/:governorate
 * @desc    Get seekers by location
 * @access  Public
 */
router.get('/location/:governorate', [
  param('governorate')
    .notEmpty()
    .withMessage('Governorate is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], SeekerController.getSeekersByLocation);

/**
 * @route   GET /api/seekers/:seekerId/completion
 * @desc    Get profile completion status
 * @access  Public
 */
router.get('/:seekerId/completion', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.getProfileCompletion);

/**
 * @route   POST /api/seekers/:seekerId/photo
 * @desc    Upload profile photo
 * @access  Public
 */
router.post('/:seekerId/photo', [
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
 * @access  Public
 */
router.post('/:seekerId/cv', [
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
 * @access  Public
 */
router.delete('/:seekerId', [
  param('seekerId')
    .notEmpty()
    .withMessage('Seeker ID is required')
], SeekerController.deleteProfile);

module.exports = router;