const express = require('express');
const { param } = require('express-validator');
const CompanyController = require('../controllers/companyController');
const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payment
 */

/**
 * @route   GET /api/payment/status/:sessionId
 * @desc    Check Thawani payment status
 * @access  Public
 */
router.get('/status/:sessionId', [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
], CompanyController.checkPaymentStatus);

/**
 * @route   GET /api/payment/success-redirect
 * @desc    Redirect to app after successful payment
 * @access  Public
 */
router.get('/success-redirect', CompanyController.paymentSuccessRedirect);

/**
 * @route   GET /api/payment/cancel-redirect
 * @desc    Redirect to app after cancelled payment
 * @access  Public
 */
router.get('/cancel-redirect', CompanyController.paymentCancelRedirect);

module.exports = router;