/**
 * Notification Controller
 * Handles all notification-related API endpoints
 * Production-ready with comprehensive error handling and validation
 */

const notificationService = require('../services/notificationService');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../config/constants');
const logger = require('../utils/logger');

class NotificationController {
  
  /**
   * Send a notification
   * POST /api/notifications/send
   */
  async sendNotification(req, res) {
    try {
      const notificationData = req.body;
      
      // Add request metadata
      notificationData.metadata = {
        ...notificationData.metadata,
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      };

      const result = await notificationService.sendNotification(notificationData);
      
      logger.info(`✅ Notification sent by ${req.user?.id || 'system'}:`, result);
      
      res.status(200).json({
        success: true,
        message: 'Notification sent successfully',
        data: result
      });

    } catch (error) {
      logger.error('❌ Send notification error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get user notifications
   * GET /api/notifications/user/:userId
   */
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { limit, offset, unreadOnly } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
        unreadOnly: unreadOnly === 'true'
      };

      const result = await notificationService.getUserNotifications(userId, options);
      
      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: result
      });

    } catch (error) {
      logger.error('❌ Get user notifications error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:notificationId/read
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await notificationService.markAsRead(notificationId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: result
      });

    } catch (error) {
      logger.error('❌ Mark as read error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count/:userId
   */
  async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;
      
      const result = await notificationService.getUnreadCount(userId);
      
      res.status(200).json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: result
      });

    } catch (error) {
      logger.error('❌ Get unread count error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get user's notifications (auth-based)
   * GET /api/notifications
   */
  async getUserNotificationsAuth(req, res) {
    try {
      const { userId, userType } = req.user;
      const { limit = 50, offset = 0, unreadOnly = false } = req.query;

      logger.info(`🔍 Getting notifications for user: ${userId}, type: ${userType}`);

      // Get the actual seeker/company ID for this user
      let actualReceiverId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualReceiverId = seeker.id;
          logger.info(`🔄 Found seeker ID: ${actualReceiverId} for user: ${userId}`);
        } else {
          logger.warn(`⚠️ No seeker found for user: ${userId}`);
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualReceiverId = company.id;
          logger.info(`🔄 Found company ID: ${actualReceiverId} for user: ${userId}`);
        } else {
          logger.warn(`⚠️ No company found for user: ${userId}`);
        }
      }

      const result = await notificationService.getUserNotifications(
        actualReceiverId,
        {
          limit: parseInt(limit),
          offset: parseInt(offset),
          unreadOnly: unreadOnly === 'true' || unreadOnly === true
        }
      );
      
      // Disable caching for dynamic data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: result.notifications || [],
        count: result.count || 0,
        hasMore: result.hasMore || false
      });

    } catch (error) {
      logger.error('❌ Get user notifications (auth) error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get unread notification count (auth-based)
   * GET /api/notifications/unread-count
   */
  async getUnreadCountAuth(req, res) {
    try {
      const { userId, userType } = req.user;
      
      // Get the actual seeker/company ID for this user
      let actualReceiverId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualReceiverId = seeker.id;
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualReceiverId = company.id;
        }
      }
      
      const result = await notificationService.getUnreadCount(actualReceiverId);
      
      // Disable caching for dynamic data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.status(200).json({
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count: result.count || 0 }
      });

    } catch (error) {
      logger.error('❌ Get unread count (auth) error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Mark notification as read (auth-based)
   * PUT /api/notifications/:notificationId/read-auth
   */
  async markAsReadAuth(req, res) {
    try {
      const { notificationId } = req.params;
      const { userId, userType } = req.user;
      
      // Get the actual seeker/company ID for this user
      let actualReceiverId = userId;
      
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          actualReceiverId = seeker.id;
        }
      } else if (userType === 'company') {
        const Company = require('../models/Company');
        const company = await Company.findByUserId(userId);
        if (company) {
          actualReceiverId = company.id;
        }
      }
      
      const result = await notificationService.markAsRead(notificationId, actualReceiverId);
      
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: result
      });

    } catch (error) {
      logger.error('❌ Mark as read (auth) error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Bulk mark notifications as read
   * PUT /api/notifications/bulk-read
   */
  async bulkMarkAsRead(req, res) {
    try {
      const { notificationIds, userId } = req.body;
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Notification IDs array is required'
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const results = [];
      
      for (const notificationId of notificationIds) {
        try {
          const result = await notificationService.markAsRead(notificationId, userId);
          results.push({ notificationId, success: true, result });
        } catch (error) {
          results.push({ notificationId, success: false, error: error.message });
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Bulk read operation completed',
        data: { results }
      });

    } catch (error) {
      logger.error('❌ Bulk mark as read error:', error);
      res.status(400).json({
        success: false,
        message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Helper methods for specific notification types

  /**
   * Send company account created notification
   */
  async sendCompanyAccountCreated(companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'company_account_created',
        initiatedBy: 'system',
        action: 'Company Account Created',
        description: 'Company completes initial registration',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Welcome to Shift! Your company account is ready. Complete your profile to start hiring smarter.',
          actionUrl: `${process.env.FRONTEND_URL}/company/profile/complete`
        },
        metadata: {
          companyName: companyData.name,
          companyId: companyData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_company_registered',
          initiatedBy: 'system',
          action: 'New Company Registered',
          description: 'Company completes initial registration',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `A new company has registered: ${companyData.name}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/companies/${companyData.id}`
          },
          metadata: {
            companyName: companyData.name,
            companyId: companyData.id
          }
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Send company account created notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job seeker profile created notification
   */
  async sendJobSeekerProfileCreated(seekerData, adminEmails = []) {
    try {
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'job_seeker_profile_created',
        initiatedBy: 'system',
        action: 'Profile Created',
        description: 'Job Seeker registers',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Your account has been created. Complete your profile to start applying for jobs.',
          actionUrl: `${process.env.FRONTEND_URL}/seeker/profile/complete`
        },
        metadata: {
          seekerName: seekerData.name,
          seekerId: seekerData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_seeker_registered',
          initiatedBy: 'system',
          action: 'New Job Seeker Registered',
          description: 'Job Seeker registers',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `A new job seeker "${seekerData.name}" has registered`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/seekers/${seekerData.id}`
          },
          metadata: {
            seekerName: seekerData.name,
            seekerId: seekerData.id
          }
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Send job seeker profile created notification failed:', error);
      throw error;
    }
  }

  /**
   * Send application submitted notification
   */
  async sendApplicationSubmitted(applicationData) {
    try {
      const { jobSeekerName, jobSeekerEmail, jobSeekerId, companyName, companyEmail, companyId, jobTitle, jobId } = applicationData;

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'application_submitted_seeker',
        initiatedBy: 'seeker',
        action: 'Application Submitted',
        description: 'Job Seeker applies',
        receivers: [{
          id: jobSeekerId,
          type: 'seeker',
          email: jobSeekerEmail
        }],
        channels: ['in-app'],
        content: {
          message: `Your application for '${jobTitle}' has been sent successfully. The employer will review your profile.`
        },
        metadata: {
          jobTitle,
          jobId,
          companyName,
          companyId
        }
      });

      // Send to company
      await notificationService.sendNotification({
        type: 'application_submitted',
        initiatedBy: 'seeker',
        action: 'Application Submitted',
        description: 'Job Seeker applies',
        receivers: [{
          id: companyId,
          type: 'company',
          email: companyEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `New application received for '${jobTitle}' from ${jobSeekerName}`,
          actionUrl: `${process.env.FRONTEND_URL}/company/applications/${jobId}`
        },
        metadata: {
          jobTitle,
          jobId,
          candidateName: jobSeekerName,
          candidateId: jobSeekerId
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('❌ Send application submitted notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview request notification
   */
  async sendInterviewRequest(interviewData) {
    try {
      const { 
        jobSeekerName, 
        jobSeekerEmail, 
        jobSeekerId, 
        companyName, 
        companyId, 
        jobTitle, 
        jobId,
        interviewDate,
        location
      } = interviewData;

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'interview_request_sent',
        initiatedBy: 'company',
        action: 'Interview Request Sent',
        description: 'Company invites candidate',
        receivers: [{
          id: jobSeekerId,
          type: 'seeker',
          email: jobSeekerEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `${companyName} has invited you for an interview for '${jobTitle}'. View details and select a slot.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/interviews/${jobId}`
        },
        metadata: {
          jobTitle,
          jobId,
          companyName,
          companyId,
          interviewDate,
          location
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('❌ Send interview request notification failed:', error);
      throw error;
    }
  }

  /**
   * Send payment successful notification
   */
  async sendPaymentSuccessful(paymentData, adminEmails = []) {
    try {
      const { companyId, companyEmail, companyName, amount, currency, planName } = paymentData;

      // Send to company
      await notificationService.sendNotification({
        type: 'payment_successful',
        initiatedBy: 'system',
        action: 'Payment Successful',
        description: 'Payment received',
        receivers: [{
          id: companyId,
          type: 'company',
          email: companyEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `💳 Payment of ${amount} ${currency} for ${planName} received successfully.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/billing/receipt`
        },
        metadata: {
          amount,
          currency,
          planName,
          companyName,
          companyId
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_payment_received',
          initiatedBy: 'system',
          action: 'Payment Received',
          description: 'Payment received',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `Payment of ${amount} ${currency} received from ${companyName} for ${planName}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/payments`
          },
          metadata: {
            amount,
            currency,
            planName,
            companyName,
            companyId
          }
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Send payment successful notification failed:', error);
      throw error;
    }
  }

  /**
   * Send company profile completed notification
   */
  async sendCompanyProfileCompleted(companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'company_profile_completed',
        initiatedBy: 'system',
        action: 'Company Profile Completed',
        description: 'Company finishes profile',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email'],
        content: {
          message: 'Your company profile is complete! You have a free 14 day trial to use Shift.',
          actionUrl: `${process.env.FRONTEND_URL}/company/dashboard`
        },
        metadata: {
          companyName: companyData.companyName || companyData.name,
          companyId: companyData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_company_profile_completed',
          initiatedBy: 'system',
          action: 'Company Profile Completed',
          description: 'Company finishes profile',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email'],
          content: {
            message: `${companyData.companyName || companyData.name} has completed their profile`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/companies/${companyData.id}`
          },
          metadata: {
            companyName: companyData.companyName || companyData.name,
            companyId: companyData.id
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send company profile completed notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job seeker profile completed notification
   */
  async sendJobSeekerProfileCompleted(seekerData, adminEmails = []) {
    try {
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'job_seeker_profile_completed',
        initiatedBy: 'system',
        action: 'Job Seeker Profile Completed',
        description: 'Job Seeker completed profile',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Your profile is complete! Start applying for jobs now.',
          actionUrl: `${process.env.FRONTEND_URL}/jobs`
        },
        metadata: {
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_seeker_profile_completed',
          initiatedBy: 'system',
          action: 'Job Seeker Profile Completed',
          description: 'Job Seeker completed profile',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `${seekerData.name || seekerData.fullName} profile is complete & published!`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/seekers/${seekerData.id}`
          },
          metadata: {
            seekerName: seekerData.name || seekerData.fullName,
            seekerId: seekerData.id
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send job seeker profile completed notification failed:', error);
      throw error;
    }
  }

  /**
   * Send video request notification
   */
  async sendVideoRequest(seekerData, adminEmails = []) {
    try {
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'video_request',
          initiatedBy: 'job_seeker',
          action: 'Video Request',
          description: 'Job Seeker sent video request',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email'],
          content: {
            message: `${seekerData.name || seekerData.fullName} has requested for a video date`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/seekers/${seekerData.id}`
          },
          metadata: {
            seekerName: seekerData.name || seekerData.fullName,
            seekerId: seekerData.id
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send video request notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job posted notification
   */
  async sendJobPosted(jobData, companyData, adminEmails = []) {
    try {
      const isInstantHire = jobData.type === 'instant_hire';
      
      // Send to company
      await notificationService.sendNotification({
        type: isInstantHire ? 'job_posted_instant_hire' : 'job_posted_interview_first',
        initiatedBy: 'company',
        action: 'Job Posted',
        description: `Company posts ${isInstantHire ? 'Instant Hire' : 'Interview First'} job`,
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: isInstantHire 
            ? `Great news! Your job '${jobData.title}' (Instant Hire) is now live. View it here.`
            : `Your job '${jobData.title}' (Interview First) is now live. Check it out!`,
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs/${jobData.id}`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          jobType: jobData.type
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: isInstantHire ? 'admin_job_posted_instant_hire' : 'admin_job_posted_interview_first',
          initiatedBy: 'company',
          action: 'Job Posted',
          description: `Company posts ${isInstantHire ? 'Instant Hire' : 'Interview First'} job`,
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['in-app'],
          content: {
            message: `New job '${jobData.title}' posted by ${companyData.name || companyData.companyName}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/jobs/${jobData.id}`
          },
          metadata: {
            jobTitle: jobData.title,
            jobId: jobData.id,
            companyName: companyData.name || companyData.companyName,
            companyId: companyData.id,
            jobType: jobData.type
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send job posted notification failed:', error);
      throw error;
    }
  }

  /**
   * Send application rejected notification
   */
  async sendApplicationRejected(applicationData, seekerData) {
    try {
      await notificationService.sendNotification({
        type: 'application_rejected',
        initiatedBy: 'company',
        action: 'Application Rejected',
        description: 'Company rejects candidate',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `Unfortunately, your application for '${applicationData.jobTitle}' was not selected. Keep applying!`,
          actionUrl: `${process.env.FRONTEND_URL}/jobs`
        },
        metadata: {
          jobTitle: applicationData.jobTitle,
          jobId: applicationData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: applicationData.companyName
        }
      });
    } catch (error) {
      logger.error('❌ Send application rejected notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview accepted notification
   */
  async sendInterviewAccepted(interviewData, companyData, seekerData) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'interview_accepted_company',
        initiatedBy: 'job_seeker',
        action: 'Interview Accepted',
        description: 'Job Seeker accepts interview',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `${seekerData.name || seekerData.fullName} has accepted the interview request for '${interviewData.jobTitle}' and selected ${interviewData.interviewDate}.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name || companyData.companyName,
          interviewDate: interviewData.interviewDate
        }
      });

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'interview_accepted_seeker',
        initiatedBy: 'job_seeker',
        action: 'Interview Accepted',
        description: 'Job Seeker accepts interview',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app', 'whatsapp'],
        content: {
          message: `Great! You've confirmed your interview for '${interviewData.jobTitle}' with ${companyData.name || companyData.companyName} at ${interviewData.interviewDate}.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name || companyData.companyName,
          interviewDate: interviewData.interviewDate
        }
      });
    } catch (error) {
      logger.error('❌ Send interview accepted notification failed:', error);
      throw error;
    }
  }

  /**
   * Send candidate hired notification
   */
  async sendCandidateHired(hiringData, companyData, seekerData) {
    try {
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'candidate_hired',
        initiatedBy: 'company',
        action: 'Candidate Hired',
        description: 'Job Seeker hired',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app', 'whatsapp'],
        content: {
          message: `Congrats! You've been hired for '${hiringData.jobTitle}' at ${companyData.name || companyData.companyName}.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/offers/${hiringData.id}`
        },
        metadata: {
          jobTitle: hiringData.jobTitle,
          jobId: hiringData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id
        }
      });

      // Send to company
      await notificationService.sendNotification({
        type: 'candidate_hired_company',
        initiatedBy: 'company',
        action: 'Candidate Hired',
        description: 'Job Seeker hired',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `${seekerData.name || seekerData.fullName} has been sent a hiring request for '${hiringData.jobTitle}'.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/hires/${hiringData.id}`
        },
        metadata: {
          jobTitle: hiringData.jobTitle,
          jobId: hiringData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id
        }
      });
    } catch (error) {
      logger.error('❌ Send candidate hired notification failed:', error);
      throw error;
    }
  }

  /**
   * Send trial ending notification
   */
  async sendTrialEnding(companyData, daysRemaining = 0) {
    try {
      await notificationService.sendNotification({
        type: 'trial_ending',
        initiatedBy: 'system',
        action: 'Trial Ending',
        description: 'Remind company trail ending',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `Your trial period ends in ${daysRemaining} days. Upgrade to continue enjoying Shift features.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          daysRemaining
        }
      });
    } catch (error) {
      logger.error('❌ Send trial ending notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job match notification
   */
  async sendJobMatch(jobData, seekerData) {
    try {
      await notificationService.sendNotification({
        type: 'job_match',
        initiatedBy: 'system',
        action: 'New Job Match',
        description: 'Inform Job Seeker there is a match for them',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `New job alert: '${jobData.title}' matches your profile. Apply now!`,
          actionUrl: `${process.env.FRONTEND_URL}/jobs/${jobData.id}`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: jobData.companyName
        }
      });
    } catch (error) {
      logger.error('❌ Send job match notification failed:', error);
      throw error;
    }
  }

  /**
   * Send admin creates company account notification
   */
  async sendAdminCreateCompanyAccount(companyData) {
    try {
      await notificationService.sendNotification({
        type: 'admin_company_created',
        initiatedBy: 'admin',
        action: 'Admin Creates Company Account',
        description: 'Admin creates company account',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email'],
        content: {
          message: 'Your Account has been created. Complete your profile to start hiring smarter.',
          actionUrl: `${process.env.FRONTEND_URL}/company/profile/complete`
        },
        metadata: {
          companyName: companyData.name,
          companyId: companyData.id
        }
      });
    } catch (error) {
      logger.error('❌ Send admin create company account notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job edited notification
   */
  async sendJobEdited(jobData, companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'job_edited_company',
        initiatedBy: 'company',
        action: 'Job Edited',
        description: 'Company edits job post',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `Your job '${jobData.title}' has been updated. View the changes.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs/${jobData.id}`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          companyName: companyData.name,
          companyId: companyData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_job_edited',
          initiatedBy: 'company',
          action: 'Job Edited',
          description: 'Company edits job post',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['in-app'],
          content: {
            message: `Job '${jobData.title}' by ${companyData.name} has been updated.`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/jobs/${jobData.id}`
          },
          metadata: {
            jobTitle: jobData.title,
            jobId: jobData.id,
            companyName: companyData.name,
            companyId: companyData.id
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send job edited notification failed:', error);
      throw error;
    }
  }

  /**
   * Send job cancelled notification
   */
  async sendJobCancelled(jobData, companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'job_cancelled_company',
        initiatedBy: 'company',
        action: 'Job Cancelled',
        description: 'Company cancels job',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `Your job '${jobData.title}' has been cancelled and is no longer visible to job seekers.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          companyName: companyData.name,
          companyId: companyData.id
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_job_cancelled',
          initiatedBy: 'company',
          action: 'Job Cancelled',
          description: 'Company cancels job',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['in-app'],
          content: {
            message: `Job '${jobData.title}' by ${companyData.name} has been cancelled.`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/jobs/${jobData.id}`
          },
          metadata: {
            jobTitle: jobData.title,
            jobId: jobData.id,
            companyName: companyData.name,
            companyId: companyData.id
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send job cancelled notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview request sent to company notification
   */
  async sendInterviewRequestToCompany(interviewData, companyData) {
    try {
      await notificationService.sendNotification({
        type: 'interview_request_company',
        initiatedBy: 'company',
        action: 'Interview Request Sent',
        description: 'Company invites candidate',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `Interview request sent to ${interviewData.jobSeekerName} for '${interviewData.jobTitle}'.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: interviewData.jobSeekerName,
          seekerId: interviewData.jobSeekerId,
          companyName: companyData.name,
          companyId: companyData.id
        }
      });
    } catch (error) {
      logger.error('❌ Send interview request to company notification failed:', error);
      throw error;
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(paymentData, adminEmails = []) {
    try {
      const { companyId, companyEmail, companyName, amount, currency, planName, error } = paymentData;

      // Send to company
      await notificationService.sendNotification({
        type: 'payment_failed',
        initiatedBy: 'system',
        action: 'Payment Failed',
        description: 'Payment failed',
        receivers: [{
          id: companyId,
          type: 'company',
          email: companyEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `❌ Payment for ${planName} failed. Please retry or use another method.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/billing/retry`
        },
        metadata: {
          amount,
          currency,
          planName,
          companyName,
          companyId,
          error: error || 'Payment processing failed'
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_payment_failed',
          initiatedBy: 'system',
          action: 'Payment Failed',
          description: 'Payment failed',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `Payment failed for ${companyName} on ${planName}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/payments`
          },
          metadata: {
            amount,
            currency,
            planName,
            companyName,
            companyId,
            error: error || 'Payment processing failed'
          }
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('❌ Send payment failed notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview declined notification
   */
  async sendInterviewDeclined(interviewData, companyData, seekerData) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'interview_declined_company',
        initiatedBy: 'job_seeker',
        action: 'Interview Declined',
        description: 'Job Seeker declines interview',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `${seekerData.name || seekerData.fullName} has declined the interview request for '${interviewData.jobTitle}'.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name
        }
      });

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'interview_declined_seeker',
        initiatedBy: 'job_seeker',
        action: 'Interview Declined',
        description: 'Job Seeker declines interview',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app'],
        content: {
          message: `You have declined the interview for '${interviewData.jobTitle}'.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/interviews`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name
        }
      });
    } catch (error) {
      logger.error('❌ Send interview declined notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview rescheduled notification
   */
  async sendInterviewRescheduled(interviewData, companyData, seekerData) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'interview_rescheduled_company',
        initiatedBy: 'company',
        action: 'Interview Rescheduled',
        description: 'Company reschedules interview',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'whatsapp'],
        content: {
          message: `Interview for '${interviewData.jobTitle}' has been rescheduled.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name,
          newInterviewDate: interviewData.newInterviewDate
        }
      });

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'interview_rescheduled_seeker',
        initiatedBy: 'company',
        action: 'Interview Rescheduled',
        description: 'Company reschedules interview',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `Your interview for '${interviewData.jobTitle}' has been rescheduled. View new time.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name,
          newInterviewDate: interviewData.newInterviewDate
        }
      });
    } catch (error) {
      logger.error('❌ Send interview rescheduled notification failed:', error);
      throw error;
    }
  }

  /**
   * Send interview reminder notification
   */
  async sendInterviewReminder(interviewData, seekerData) {
    try {
      await notificationService.sendNotification({
        type: 'interview_reminder',
        initiatedBy: 'system',
        action: 'Interview Reminder',
        description: 'Reminder: Interview in 4 hours',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app', 'email', 'whatsapp'],
        content: {
          message: `Your interview for '${interviewData.jobTitle}' is in 4 hours. Be prepared!`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/interviews/${interviewData.id}`
        },
        metadata: {
          jobTitle: interviewData.jobTitle,
          jobId: interviewData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: interviewData.companyName,
          interviewDate: interviewData.interviewDate,
          reminderType: 'interview_4_hours'
        }
      });
    } catch (error) {
      logger.error('❌ Send interview reminder notification failed:', error);
      throw error;
    }
  }

  /**
   * Send instant hire reminder notification
   */
  async sendInstantHireReminder(jobData, seekerData) {
    try {
      await notificationService.sendNotification({
        type: 'instant_hire_reminder',
        initiatedBy: 'system',
        action: 'Instant Hire Reminder',
        description: 'Reminder: Your Job Starts in 4 hours',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app', 'email', 'whatsapp'],
        content: {
          message: `Your Job '${jobData.title}' is in 4 hours. Be prepared!`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/jobs/${jobData.id}`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: jobData.companyName,
          startDate: jobData.startDate,
          reminderType: 'instant_hire_4_hours'
        }
      });
    } catch (error) {
      logger.error('❌ Send instant hire reminder notification failed:', error);
      throw error;
    }
  }

  /**
   * Send hiring acceptance notification
   */
  async sendHiringAcceptance(hiringData, companyData, seekerData) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'hiring_acceptance_company',
        initiatedBy: 'job_seeker',
        action: 'Hiring Acceptance',
        description: 'Job Seeker Approved Hiring',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `${seekerData.name || seekerData.fullName} has accepted your offer for '${hiringData.jobTitle}'.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/hires/${hiringData.id}`
        },
        metadata: {
          jobTitle: hiringData.jobTitle,
          jobId: hiringData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name,
          companyId: companyData.id
        }
      });

      // Send to job seeker
      await notificationService.sendNotification({
        type: 'hiring_acceptance_seeker',
        initiatedBy: 'job_seeker',
        action: 'Hiring Acceptance',
        description: 'Job Seeker Approved Hiring',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app', 'email', 'whatsapp'],
        content: {
          message: `You've been hired for '${hiringData.jobTitle}' at ${companyData.name}. View more details and special instructions.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/offers/${hiringData.id}`
        },
        metadata: {
          jobTitle: hiringData.jobTitle,
          jobId: hiringData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: companyData.name,
          companyId: companyData.id
        }
      });
    } catch (error) {
      logger.error('❌ Send hiring acceptance notification failed:', error);
      throw error;
    }
  }

  /**
   * Send no-show notification to job seeker
   */
  async sendNoShowToSeeker(reportData, seekerData) {
    try {
      await notificationService.sendNotification({
        type: 'no_show_seeker',
        initiatedBy: 'admin',
        action: 'No Show Reported',
        description: 'Company reports no-show',
        receivers: [{
          id: seekerData.id,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `You missed the interview/job for '${reportData.jobTitle}'. View our Strike System and what this means for you.`,
          actionUrl: `${process.env.FRONTEND_URL}/seeker/strikes`
        },
        metadata: {
          jobTitle: reportData.jobTitle,
          jobId: reportData.jobId,
          seekerName: seekerData.name || seekerData.fullName,
          seekerId: seekerData.id,
          companyName: reportData.companyName,
          reportDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ Send no-show to seeker notification failed:', error);
      throw error;
    }
  }

  /**
   * Send profile incomplete reminder notifications
   */
  async sendProfileIncompleteReminder(userData, userType, adminEmails = []) {
    try {
      if (userType === 'seeker') {
        await notificationService.sendNotification({
          type: 'profile_incomplete_reminder_seeker',
          initiatedBy: 'admin',
          action: 'Profile Incomplete Reminder',
          description: 'Profile still incomplete',
          receivers: [{
            id: userData.id,
            type: 'seeker',
            email: userData.email
          }],
          channels: ['email'],
          content: {
            message: 'Your profile isn\'t complete yet. Complete it now to increase your chances of being hired.',
            actionUrl: `${process.env.FRONTEND_URL}/seeker/profile/complete`
          },
          metadata: {
            seekerName: userData.name || userData.fullName,
            seekerId: userData.id,
            reminderType: 'profile_incomplete'
          }
        });
      } else if (userType === 'company') {
        await notificationService.sendNotification({
          type: 'profile_incomplete_reminder_company',
          initiatedBy: 'admin',
          action: 'Profile Incomplete Reminder',
          description: 'Profile still incomplete',
          receivers: [{
            id: userData.id,
            type: 'company',
            email: userData.email
          }],
          channels: ['email'],
          content: {
            message: 'Your Profile still isn\'t complete. Let us know if you need help.',
            actionUrl: `${process.env.FRONTEND_URL}/company/profile/complete`
          },
          metadata: {
            companyName: userData.name || userData.companyName,
            companyId: userData.id,
            reminderType: 'profile_incomplete'
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send profile incomplete reminder notification failed:', error);
      throw error;
    }
  }

  /**
   * Send no-show report to admin notification
   */
  async sendNoShowReportToAdmin(reportData, adminEmails = []) {
    try {
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_no_show_reported',
          initiatedBy: 'company',
          action: 'No Show Reported',
          description: 'Company reports no-show',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['in-app', 'email'],
          content: {
            message: `${reportData.companyName} reported ${reportData.seekerName} no-show for '${reportData.jobTitle}'. Support team notified.`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/reports/${reportData.id}`
          },
          metadata: {
            jobTitle: reportData.jobTitle,
            jobId: reportData.jobId,
            seekerName: reportData.seekerName,
            seekerId: reportData.seekerId,
            companyName: reportData.companyName,
            companyId: reportData.companyId
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send no-show report to admin notification failed:', error);
      throw error;
    }
  }

  /**
   * Send trial period ended notification
   */
  async sendTrialEnded(companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'trial_ended_company',
        initiatedBy: 'system',
        action: 'Trial Ended',
        description: 'Trial period ended',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: 'Your Trial Period Has Ended. Upgrade your Plan to continue posting jobs and scheduling interviews.',
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          trialEndDate: new Date().toISOString()
        }
      });

      // Send to admins
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_trial_ended',
          initiatedBy: 'system',
          action: 'Trial Ended',
          description: 'Trial period ended',
          receivers: adminEmails.map(email => ({
            id: `admin_${email}`,
            type: 'admin',
            email
          })),
          channels: ['in-app', 'email'],
          content: {
            message: `${companyData.name || companyData.companyName} Trial has ended. Contact them for upgrading plan.`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/companies/${companyData.id}`
          },
          metadata: {
            companyName: companyData.name || companyData.companyName,
            companyId: companyData.id,
            trialEndDate: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('❌ Send trial ended notification failed:', error);
      throw error;
    }
  }

  /**
   * Send insufficient subscription/credits notification
   */
  async sendInsufficientCredits(companyData, creditType = 'job') {
    try {
      await notificationService.sendNotification({
        type: 'insufficient_credits',
        initiatedBy: 'system',
        action: 'Insufficient Credits',
        description: 'Insufficient subscription/credits',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: creditType === 'job' 
            ? 'You don\'t have enough credits to post this job. Please upgrade your plan.'
            : `You have only ${companyData.remainingCredits} ${creditType} credits left. Purchase more to continue.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          creditType,
          remainingCredits: companyData.remainingCredits || 0
        }
      });
    } catch (error) {
      logger.error('❌ Send insufficient credits notification failed:', error);
      throw error;
    }
  }

  /**
   * Send download interview schedule reminder
   */
  async sendDownloadInterviewSchedule(companyData) {
    try {
      await notificationService.sendNotification({
        type: 'download_interview_schedule',
        initiatedBy: 'system',
        action: 'Download Interview Schedule',
        description: '4 Hours before Interview time',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Download Upcoming Interview from Homepage.',
          actionUrl: `${process.env.FRONTEND_URL}/company/dashboard`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          reminderType: 'interview_schedule'
        }
      });
    } catch (error) {
      logger.error('❌ Send download interview schedule notification failed:', error);
      throw error;
    }
  }

  /**
   * Send subscription expiring soon notification
   */
  async sendSubscriptionExpiring(companyData, daysRemaining = 0) {
    try {
      await notificationService.sendNotification({
        type: 'subscription_expiring',
        initiatedBy: 'system',
        action: 'Subscription Expiring',
        description: 'Subscription expiring soon',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `Your subscription will expire on ${companyData.expiryDate}. Renew now to continue posting jobs.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription/renew`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          daysRemaining,
          expiryDate: companyData.expiryDate
        }
      });
    } catch (error) {
      logger.error('❌ Send subscription expiring notification failed:', error);
      throw error;
    }
  }

  /**
   * Send plan expired notification
   */
  async sendPlanExpired(companyData) {
    try {
      await notificationService.sendNotification({
        type: 'plan_expired',
        initiatedBy: 'system',
        action: 'Plan Expired',
        description: 'Plan expired',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: 'Your subscription has expired. Renew now to reactivate job postings.',
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription/renew`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          expiredDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ Send plan expired notification failed:', error);
      throw error;
    }
  }

  /**
   * Send low credits notification
   */
  async sendLowCredits(companyData, creditType = 'interview', remainingCredits = 0) {
    try {
      await notificationService.sendNotification({
        type: 'low_credits',
        initiatedBy: 'system',
        action: 'Low Credits',
        description: 'Low credits',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app'],
        content: {
          message: `You have only ${remainingCredits} ${creditType} credits left. Purchase more to continue ${creditType === 'interview' ? 'interviewing' : 'posting jobs'}.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/subscription`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          creditType,
          remainingCredits
        }
      });
    } catch (error) {
      logger.error('❌ Send low credits notification failed:', error);
      throw error;
    }
  }

  /**
   * Send plan activated notifications (Starter, Premium, etc.)
   */
  async sendPlanActivated(companyData, planData) {
    try {
      const planName = planData.name || planData.planName;
      const planType = planData.type || 'plan';
      
      await notificationService.sendNotification({
        type: `${planType}_activated`,
        initiatedBy: 'system',
        action: `${planName} Activated`,
        description: `${planName} activated after payment`,
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: planType === 'addon' 
            ? `You have added ${planData.credits} ${planData.creditType} Credits to your Account. Start ${planData.creditType === 'interview' ? 'Organizing Interviews' : 'Posting Jobs'} Today.`
            : `You have subscribed to ${planName}. ${planType === 'instant_hire' ? 'Create a Job Post Now.' : 'View Plan or Download Invoice.'}`,
          actionUrl: planType === 'addon' 
            ? `${process.env.FRONTEND_URL}/company/${planData.creditType === 'interview' ? 'interviews' : 'jobs'}`
            : `${process.env.FRONTEND_URL}/company/${planType === 'instant_hire' ? 'jobs/create' : 'subscription'}`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          planName,
          planType,
          amount: planData.amount,
          currency: planData.currency || 'OMR',
          activationDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ Send plan activated notification failed:', error);
      throw error;
    }
  }

  /**
   * Send custom plan (LPO) notifications
   */
  async sendCustomPlanLPO(companyData, lpoData) {
    try {
      await notificationService.sendNotification({
        type: 'custom_plan_lpo',
        initiatedBy: 'admin',
        action: 'Custom Plan LPO',
        description: 'Custom plan created',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `LPO for ${lpoData.planName} received. Your plan is now active.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/dashboard`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          lpoNumber: lpoData.lpoNumber,
          planName: lpoData.planName,
          amount: lpoData.amount,
          currency: lpoData.currency || 'OMR'
        }
      });
    } catch (error) {
      logger.error('❌ Send custom plan LPO notification failed:', error);
      throw error;
    }
  }

  /**
   * Send payment overdue (30 days) notification
   */
  async sendPaymentOverdue(companyData, lpoData) {
    try {
      await notificationService.sendNotification({
        type: 'payment_overdue',
        initiatedBy: 'admin',
        action: 'Payment Overdue',
        description: 'After 30 days without receiving payment',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `Reminder: Payment for your LPO (${lpoData.lpoNumber}) is due on ${lpoData.dueDate}. Please ensure payment is made to avoid delays.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/billing/lpo/${lpoData.lpoNumber}`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          lpoNumber: lpoData.lpoNumber,
          dueDate: lpoData.dueDate,
          amount: lpoData.amount,
          currency: lpoData.currency || 'OMR'
        }
      });
    } catch (error) {
      logger.error('❌ Send payment overdue notification failed:', error);
      throw error;
    }
  }

  /**
   * Send LPO payment received notification
   */
  async sendLPOPaymentReceived(companyData, lpoData) {
    try {
      await notificationService.sendNotification({
        type: 'lpo_payment_received',
        initiatedBy: 'admin',
        action: 'LPO Payment Received',
        description: 'Payment received, payment info added to payment history',
        receivers: [{
          id: companyData.id,
          type: 'company',
          email: companyData.email
        }],
        channels: ['in-app', 'email'],
        content: {
          message: `Payment for LPO ${lpoData.lpoNumber} received. Thank you.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/billing/receipt/${lpoData.paymentId}`
        },
        metadata: {
          companyName: companyData.name || companyData.companyName,
          companyId: companyData.id,
          lpoNumber: lpoData.lpoNumber,
          paymentId: lpoData.paymentId,
          amount: lpoData.amount,
          currency: lpoData.currency || 'OMR',
          paymentDate: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ Send LPO payment received notification failed:', error);
      throw error;
    }
  }
}

module.exports = new NotificationController();