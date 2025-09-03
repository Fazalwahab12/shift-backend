const express = require('express');
const { body, param, query } = require('express-validator');
const OnboardingController = require('../controllers/onboardingController');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Onboarding Routes
 * Base path: /api/onboarding
 */

/**
 * @route   POST /api/onboarding
 * @desc    Create or update onboarding data (token-based)
 * @access  Private
 */
router.post('/', [
  authenticateToken,
  body('userType')
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company'),
  body('selectedIndustries')
    .optional()
    .isArray()
    .withMessage('Selected industries must be an array'),
  body('selectedRoles')
    .optional()
    .isArray()
    .withMessage('Selected roles must be an array'),
  body('selectedSkills')
    .optional()
    .isArray()
    .withMessage('Selected skills must be an array'),
  body('preferredSocialMedia')
    .optional()
    .isArray()
    .withMessage('Preferred social media must be an array'),
  body('preferredSocialMedia.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each social media preference must be between 1 and 100 characters'),

], OnboardingController.createOrUpdateOnboarding);

/**
 * @route   GET /api/onboarding/stats
 * @desc    Get onboarding statistics
 * @access  Public
 */
router.get('/stats', [
  query('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company')
], OnboardingController.getStats);

/**
 * @route   GET /api/onboarding/popular-industries
 * @desc    Get popular industries
 * @access  Public
 */
router.get('/popular-industries', [
  query('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], OnboardingController.getPopularIndustries);

/**
 * @route   GET /api/onboarding/popular-roles
 * @desc    Get popular roles
 * @access  Public
 */
router.get('/popular-roles', [
  query('userType')
    .optional()
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], OnboardingController.getPopularRoles);

/**
 * @route   GET /api/onboarding/:userId
 * @desc    Get onboarding data by user ID
 * @access  Public
 */
router.get('/:userId', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], OnboardingController.getOnboardingByUserId);

/**
 * @route   POST /api/onboarding/:userId/industry
 * @desc    Add industry preference
 * @access  Public
 */
router.post('/:userId/industry', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('industry')
    .notEmpty()
    .withMessage('Industry is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry must be between 1 and 100 characters')
], OnboardingController.addIndustry);

/**
 * @route   DELETE /api/onboarding/:userId/industry/:industry
 * @desc    Remove industry preference
 * @access  Public
 */
router.delete('/:userId/industry/:industry', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('industry')
    .notEmpty()
    .withMessage('Industry is required')
], OnboardingController.removeIndustry);

/**
 * @route   POST /api/onboarding/:userId/role
 * @desc    Add role preference
 * @access  Public
 */
router.post('/:userId/role', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Role must be between 1 and 100 characters')
], OnboardingController.addRole);

/**
 * @route   DELETE /api/onboarding/:userId/role/:role
 * @desc    Remove role preference
 * @access  Public
 */
router.delete('/:userId/role/:role', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('role')
    .notEmpty()
    .withMessage('Role is required')
], OnboardingController.removeRole);

/**
 * @route   POST /api/onboarding/:userId/complete-step
 * @desc    Complete onboarding step
 * @access  Public
 */
router.post('/:userId/complete-step', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('stepName')
    .notEmpty()
    .withMessage('Step name is required')
    .isIn(['industry_selection', 'role_selection', 'hiring_needs'])
    .withMessage('Invalid step name')
], OnboardingController.completeStep);



/**
 * @route   POST /api/onboarding/:userId/social-media
 * @desc    Add social media preference
 * @access  Public
 */
router.post('/:userId/social-media', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('socialMedia')
    .notEmpty()
    .withMessage('Social media is required')
    .isIn(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'snapchat', 'whatsapp', 'telegram'])
    .withMessage('Social media must be one of the supported platforms')
], OnboardingController.addSocialMediaPreference);

/**
 * @route   DELETE /api/onboarding/:userId/social-media/:socialMedia
 * @desc    Remove social media preference
 * @access  Public
 */
router.delete('/:userId/social-media/:socialMedia', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('socialMedia')
    .notEmpty()
    .withMessage('Social media is required')
], OnboardingController.removeSocialMediaPreference);

/**
 * @route   GET /api/onboarding/:userId/preferences
 * @desc    Get user onboarding preferences for job recommendations
 * @access  Public
 */
router.get('/:userId/preferences', [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
], OnboardingController.getUserPreferences);

module.exports = router;