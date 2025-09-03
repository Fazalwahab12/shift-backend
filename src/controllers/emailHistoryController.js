/**
 * Email History Controller
 * Handles email history API endpoints for auditing and debugging
 */

const { validationResult } = require('express-validator');
const EmailHistory = require('../models/EmailHistory');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class EmailHistoryController {
  
  /**
   * Get email history with filtering
   * GET /api/email-history
   */
  async getEmailHistory(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        limit = 50,
        status,
        notificationType,
        recipient,
        startDate,
        endDate
      } = req.query;

      // Build query filters
      const filters = [];
      
      if (status) {
        filters.push({ field: 'status', operator: '==', value: status });
      }
      
      if (notificationType) {
        filters.push({ field: 'notificationType', operator: '==', value: notificationType });
      }
      
      if (recipient) {
        filters.push({ field: 'to', operator: '==', value: recipient });
      }
      
      if (startDate) {
        filters.push({ field: 'createdAt', operator: '>=', value: startDate });
      }
      
      if (endDate) {
        filters.push({ field: 'createdAt', operator: '<=', value: endDate });
      }

      // Query email history
      const { databaseService, COLLECTIONS } = require('../config/database');
      const emails = await databaseService.query(
        COLLECTIONS.EMAIL_HISTORY,
        filters,
        { field: 'createdAt', direction: 'desc' },
        parseInt(limit)
      );

      const emailHistory = emails.map(email => new EmailHistory(email));

      res.status(200).json({
        success: true,
        data: emailHistory.map(email => email.toPublicJSON()),
        count: emailHistory.length,
        filters: req.query
      });

    } catch (error) {
      logger.error('❌ Get email history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve email history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get email statistics
   * GET /api/email-history/stats
   */
  async getEmailStats(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { startDate, endDate } = req.query;

      const stats = await EmailHistory.getEmailStats(startDate, endDate);

      res.status(200).json({
        success: true,
        data: stats,
        period: {
          startDate,
          endDate
        }
      });

    } catch (error) {
      logger.error('❌ Get email stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve email statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get specific email by ID
   * GET /api/email-history/:emailId
   */
  async getEmailById(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { emailId } = req.params;

      const emailHistory = await EmailHistory.findByEmailId(emailId);

      if (!emailHistory) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      res.status(200).json({
        success: true,
        data: emailHistory.toJSON() // Full details for admin
      });

    } catch (error) {
      logger.error('❌ Get email by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get emails by recipient
   * GET /api/email-history/recipient/:email
   */
  async getEmailsByRecipient(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { email } = req.params;
      const { limit = 50 } = req.query;

      const emailHistory = await EmailHistory.findByRecipient(email, parseInt(limit));

      res.status(200).json({
        success: true,
        data: emailHistory.map(email => email.toPublicJSON()),
        count: emailHistory.length,
        recipient: email
      });

    } catch (error) {
      logger.error('❌ Get emails by recipient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve emails by recipient',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get emails by notification type
   * GET /api/email-history/type/:notificationType
   */
  async getEmailsByType(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { notificationType } = req.params;
      const { limit = 50 } = req.query;

      const emailHistory = await EmailHistory.findByType(notificationType, parseInt(limit));

      res.status(200).json({
        success: true,
        data: emailHistory.map(email => email.toPublicJSON()),
        count: emailHistory.length,
        notificationType: notificationType
      });

    } catch (error) {
      logger.error('❌ Get emails by type error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve emails by type',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get failed emails for retry
   * GET /api/email-history/failed/retry
   */
  async getFailedEmailsForRetry(req, res) {
    try {
      const { limit = 50 } = req.query;

      const failedEmails = await EmailHistory.getFailedEmails(parseInt(limit));

      res.status(200).json({
        success: true,
        data: failedEmails.map(email => email.toPublicJSON()),
        count: failedEmails.length
      });

    } catch (error) {
      logger.error('❌ Get failed emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve failed emails',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Retry sending a failed email
   * POST /api/email-history/:emailHistoryId/retry
   */
  async retryEmail(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { emailHistoryId } = req.params;

      const emailHistory = await EmailHistory.findById(emailHistoryId);

      if (!emailHistory) {
        return res.status(404).json({
          success: false,
          message: 'Email history not found'
        });
      }

      if (emailHistory.status !== 'failed') {
        return res.status(400).json({
          success: false,
          message: 'Only failed emails can be retried'
        });
      }

      if (emailHistory.sendAttempts >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Maximum retry attempts reached'
        });
      }

      // Retry sending the email
      const notificationService = new NotificationService();
      await notificationService.initialize();

      const result = await notificationService._sendEmail(
        { email: emailHistory.to },
        {
          title: emailHistory.subject,
          message: emailHistory.textContent,
          html: emailHistory.htmlContent
        },
        emailHistory.notificationType,
        emailHistory.metadata
      );

      res.status(200).json({
        success: true,
        message: 'Email retry successful',
        data: {
          originalEmailId: emailHistory.emailId,
          retryResult: result
        }
      });

    } catch (error) {
      logger.error('❌ Retry email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Clean up old email history
   * DELETE /api/email-history/cleanup
   */
  async cleanupOldEmails(req, res) {
    try {
      const { daysToKeep = 365 } = req.query;

      const deletedCount = await EmailHistory.cleanupOldEmails(parseInt(daysToKeep));

      res.status(200).json({
        success: true,
        message: 'Email history cleanup completed',
        data: {
          deletedCount,
          daysToKeep: parseInt(daysToKeep)
        }
      });

    } catch (error) {
      logger.error('❌ Email cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup email history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new EmailHistoryController();