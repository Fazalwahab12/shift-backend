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
}

module.exports = new NotificationController();