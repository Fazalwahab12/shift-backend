/**
 * Notification Service
 * Handles all notification operations including email, in-app notifications, and Firestore storage
 * Production-ready service with comprehensive error handling and logging
 */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const firebaseConfig = require('../config/firebase');
const { COLLECTIONS, NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Validate API key exists
    if (!process.env.RESEND) {
      logger.warn('⚠️  RESEND environment variable not set. Email functionality will be disabled.');
    }
    
    // Initialize email sending method based on configuration
    this.useSmtp = process.env.USE_SMTP === 'true';
    
    if (this.useSmtp && process.env.SMTP_HOST) {
      // Setup SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      logger.info('📧 Using SMTP for email sending');
    } else {
      // Setup Resend REST API
      this.resend = process.env.RESEND ? new Resend(process.env.RESEND) : null;
      logger.info('📧 Using Resend REST API for email sending');
    }
    
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      this.db = firebaseConfig.getDb();
      this.initialized = true;
      logger.info('✅ Notification Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Notification Service:', error);
      throw error;
    }
  }

  /**
   * Send notification with email and store in Firestore
   * @param {Object} notificationData - Complete notification data
   */
  async sendNotification(notificationData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const {
        type,
        initiatedBy,
        action,
        description,
        receivers,
        channels,
        content,
        metadata = {}
      } = notificationData;

      // Validate required fields
      this._validateNotificationData(notificationData);

      const results = [];
      const timestamp = firebaseConfig.getServerTimestamp();

      // Process each receiver
      for (const receiver of receivers) {
        const notificationId = this._generateNotificationId();
        
        // Store in Firestore first
        const firestoreData = {
          id: notificationId,
          type,
          initiatedBy,
          action,
          description,
          receiver: receiver.id,
          receiverType: receiver.type,
          channels,
          content,
          metadata,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
          emailSent: false,
          read: false,
          readAt: null
        };

        await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).set(firestoreData);

        // Send email if email channel is included
        if (channels.includes('email') && receiver.email) {
          try {
            const emailResult = await this._sendEmail(receiver, content, type, metadata);
            firestoreData.emailSent = true;
            firestoreData.emailResult = emailResult;
            firestoreData.status = 'sent';
            
            // Update Firestore with email status
            await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
              emailSent: true,
              emailResult: emailResult,
              status: 'sent',
              updatedAt: timestamp
            });

            results.push({ 
              success: true, 
              notificationId, 
              receiver: receiver.id, 
              emailSent: true, 
              emailResult 
            });
          } catch (emailError) {
            logger.error('❌ Email sending failed:', emailError);
            
            // Update Firestore with failure status
            await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
              status: 'failed',
              error: emailError.message,
              updatedAt: timestamp
            });

            results.push({ 
              success: false, 
              notificationId, 
              receiver: receiver.id, 
              emailSent: false, 
              error: emailError.message 
            });
          }
        } else {
          // Mark as sent for in-app only notifications
          await this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
            status: 'sent',
            updatedAt: timestamp
          });

          results.push({ 
            success: true, 
            notificationId, 
            receiver: receiver.id, 
            emailSent: false 
          });
        }
      }

      logger.info(`✅ Notification processed for ${receivers.length} receivers`);
      return { success: true, results };

    } catch (error) {
      logger.error('❌ Notification processing failed:', error);
      throw error;
    }
  }

  /**
   * Send email using Resend with different templates
   * @param {Object} receiver - Receiver data
   * @param {Object} content - Email content
   * @param {string} type - Notification type
   * @param {Object} metadata - Additional metadata
   */
  async _sendEmail(receiver, content, type, metadata = {}) {
    try {
      const emailTemplate = this._getEmailTemplate(type, content, metadata);
      
      const emailData = {
        from: '"Shift" <wahabdir567@gmail.com>', // Use your verified Resend domain/email
        to: this.useSmtp ? receiver.email : [receiver.email], // SMTP uses string, REST API uses array
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text || emailTemplate.html.replace(/<[^>]*>/g, ''),
        replyTo: 'wahabdir567@gmail.com' // Reply goes to your email
      };

      let result;
      
      if (this.useSmtp) {
        // Send via SMTP
        if (!this.transporter) {
          throw new Error('SMTP transporter not initialized - check SMTP configuration');
        }
        result = await this.transporter.sendMail(emailData);
        logger.info(`✅ Email sent via SMTP to ${receiver.email}:`, result.messageId);
        return {
          id: result.messageId,
          status: 'sent',
          timestamp: new Date().toISOString(),
          method: 'SMTP'
        };
      } else {
        // Send via Resend REST API
        if (!this.resend) {
          throw new Error('Resend service not initialized - check RESEND environment variable');
        }
        result = await this.resend.emails.send(emailData);
        logger.info(`✅ Email sent via REST API to ${receiver.email}:`, result.id);
        return {
          id: result.id,
          status: 'sent',
          timestamp: new Date().toISOString(),
          method: 'REST_API'
        };
      }

    } catch (error) {
      logger.error(`❌ Failed to send email to ${receiver.email} via ${this.useSmtp ? 'SMTP' : 'REST API'}:`, error);
      throw error;
    }
  }

  /**
   * Get email template based on notification type
   * @param {string} type - Notification type
   * @param {Object} content - Content object
   * @param {Object} metadata - Additional data
   */
  _getEmailTemplate(type, content, metadata = {}) {
    const baseTemplate = {
      header: `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-family: Arial, sans-serif;">Shift</h1>
        </div>
      `,
      footer: `
        <div style="background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            © 2024 Shift. All rights reserved.<br>
            This email was sent from Shift Job Platform.
          </p>
        </div>
      `
    };

    // Company-related templates
    if (type === 'company_account_created') {
      return {
        subject: 'Welcome to Shift! Your company account is ready',
        html: `
          ${baseTemplate.header}
          <div style="padding: 30px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">Welcome to Shift!</h2>
            <p style="color: #666; line-height: 1.6;">
              ${content.message || 'Your company account is ready. Complete your profile to start hiring smarter.'}
            </p>
            ${content.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${content.actionUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Complete Profile
                </a>
              </div>
            ` : ''}
          </div>
          ${baseTemplate.footer}
        `,
        text: content.message || 'Welcome to Shift! Your company account is ready.'
      };
    }

    // Job seeker templates
    if (type === 'job_seeker_profile_created') {
      return {
        subject: 'Your Shift account has been created',
        html: `
          ${baseTemplate.header}
          <div style="padding: 30px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">Welcome to Shift!</h2>
            <p style="color: #666; line-height: 1.6;">
              ${content.message || 'Your account has been created. Complete your profile to start applying for jobs.'}
            </p>
            ${content.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${content.actionUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Complete Profile
                </a>
              </div>
            ` : ''}
          </div>
          ${baseTemplate.footer}
        `,
        text: content.message || 'Your account has been created. Complete your profile to start applying for jobs.'
      };
    }

    // Job application templates
    if (type === 'application_submitted') {
      return {
        subject: `New application received for ${metadata.jobTitle || 'your job'}`,
        html: `
          ${baseTemplate.header}
          <div style="padding: 30px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">New Application Received</h2>
            <p style="color: #666; line-height: 1.6;">
              ${content.message}
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Application Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Job:</strong> ${metadata.jobTitle || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Candidate:</strong> ${metadata.candidateName || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Applied:</strong> ${new Date().toLocaleString()}</p>
            </div>
            ${content.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${content.actionUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Application
                </a>
              </div>
            ` : ''}
          </div>
          ${baseTemplate.footer}
        `,
        text: `${content.message} - Job: ${metadata.jobTitle || 'N/A'}, Candidate: ${metadata.candidateName || 'N/A'}`
      };
    }

    // Interview request templates
    if (type === 'interview_request_sent') {
      return {
        subject: `Interview invitation for ${metadata.jobTitle || 'a position'}`,
        html: `
          ${baseTemplate.header}
          <div style="padding: 30px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">Interview Invitation</h2>
            <p style="color: #666; line-height: 1.6;">
              ${content.message}
            </p>
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Interview Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${metadata.companyName || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Position:</strong> ${metadata.jobTitle || 'N/A'}</p>
              ${metadata.interviewDate ? `<p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${metadata.interviewDate}</p>` : ''}
              ${metadata.location ? `<p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${metadata.location}</p>` : ''}
            </div>
            ${content.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${content.actionUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Details & Respond
                </a>
              </div>
            ` : ''}
          </div>
          ${baseTemplate.footer}
        `,
        text: `${content.message} - Company: ${metadata.companyName || 'N/A'}, Position: ${metadata.jobTitle || 'N/A'}`
      };
    }

    // Payment templates
    if (type === 'payment_successful') {
      return {
        subject: 'Payment Confirmation - Shift',
        html: `
          ${baseTemplate.header}
          <div style="padding: 30px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">💳 Payment Successful</h2>
            <p style="color: #666; line-height: 1.6;">
              ${content.message}
            </p>
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Payment Details</h3>
              <p style="margin: 5px 0; color: #666;"><strong>Amount:</strong> ${metadata.amount || 'N/A'} ${metadata.currency || 'OMR'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Plan:</strong> ${metadata.planName || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            ${content.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${content.actionUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Receipt
                </a>
              </div>
            ` : ''}
          </div>
          ${baseTemplate.footer}
        `,
        text: `${content.message} - Amount: ${metadata.amount || 'N/A'} ${metadata.currency || 'OMR'}`
      };
    }

    // Default template
    return {
      subject: content.subject || 'Shift Notification',
      html: `
        ${baseTemplate.header}
        <div style="padding: 30px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Notification</h2>
          <p style="color: #666; line-height: 1.6;">
            ${content.message || 'You have a new notification from Shift.'}
          </p>
          ${content.actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${content.actionUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ''}
        </div>
        ${baseTemplate.footer}
      `,
      text: content.message || 'You have a new notification from Shift.'
    };
  }

  /**
   * Get user notifications for frontend
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserNotifications(userId, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const { limit = 20, offset = 0, unreadOnly = false } = options;
      
      let query = this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .where('receiver', '==', userId)
        .orderBy('createdAt', 'desc');

      if (unreadOnly) {
        query = query.where('read', '==', false);
      }

      if (offset > 0) {
        const offsetSnapshot = await this.db.collection(COLLECTIONS.NOTIFICATIONS)
          .where('receiver', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(offset)
          .get();
        
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.limit(limit).get();
      
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));

      return {
        success: true,
        notifications,
        count: notifications.length,
        hasMore: notifications.length === limit
      };

    } catch (error) {
      logger.error('❌ Failed to fetch user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  async markAsRead(notificationId, userId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const notificationRef = this.db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
      const notification = await notificationRef.get();

      if (!notification.exists) {
        throw new Error('Notification not found');
      }

      if (notification.data().receiver !== userId) {
        throw new Error('Unauthorized access');
      }

      await notificationRef.update({
        read: true,
        readAt: firebaseConfig.getServerTimestamp(),
        updatedAt: firebaseConfig.getServerTimestamp()
      });

      return { success: true, message: 'Notification marked as read' };

    } catch (error) {
      logger.error('❌ Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   */
  async getUnreadCount(userId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const snapshot = await this.db.collection(COLLECTIONS.NOTIFICATIONS)
        .where('receiver', '==', userId)
        .where('read', '==', false)
        .get();

      return { success: true, count: snapshot.size };

    } catch (error) {
      logger.error('❌ Failed to get unread count:', error);
      throw error;
    }
  }

  /**
   * Validate notification data
   * @param {Object} data - Notification data
   */
  _validateNotificationData(data) {
    const required = ['type', 'action', 'receivers', 'channels', 'content'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(data.receivers) || data.receivers.length === 0) {
      throw new Error('Receivers must be a non-empty array');
    }

    if (!Array.isArray(data.channels) || data.channels.length === 0) {
      throw new Error('Channels must be a non-empty array');
    }

    for (const receiver of data.receivers) {
      if (!receiver.id || !receiver.type) {
        throw new Error('Each receiver must have id and type');
      }
      
      if (data.channels.includes('email') && !receiver.email) {
        throw new Error('Email channel requires email address for all receivers');
      }
    }
  }

  /**
   * Generate unique notification ID
   */
  _generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;