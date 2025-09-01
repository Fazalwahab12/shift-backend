/**
 * Notification Helper
 * Utility functions for triggering notifications from controllers
 * Production-ready with error handling and logging
 */

const notificationService = require('../services/notificationService');
const logger = require('./logger');

class NotificationHelper {
  
  /**
   * Trigger company account created notification
   * @param {Object} companyData - Company data
   * @param {Array} adminEmails - Admin emails (optional)
   */
  static async triggerCompanyAccountCreated(companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'company_account_created',
        initiatedBy: 'company',
        action: 'Company Account Created',
        description: 'Company completes initial registration',
        receivers: [{
          id: companyData.id || companyData.userId,
          type: 'company',
          email: companyData.email || companyData.contactEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Welcome to Shift! Your company account is ready. Complete your profile to start hiring smarter.',
          actionUrl: `${process.env.FRONTEND_URL}/company/profile/complete`,
          subject: 'Welcome to Shift! Your company account is ready'
        },
        metadata: {
          companyName: companyData.companyName || companyData.name,
          companyId: companyData.id || companyData.userId,
          registrationDate: new Date().toISOString()
        }
      });

      // Send to admins if provided
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_company_registered',
          initiatedBy: 'company',
          action: 'Company Account Created',
          description: 'Company completes initial registration',
          receivers: adminEmails.map(email => ({
            id: `admin_${email.replace('@', '_')}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `A new company has registered: ${companyData.companyName || companyData.name}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/companies/${companyData.id}`,
            subject: 'New Company Registration - Shift'
          },
          metadata: {
            companyName: companyData.companyName || companyData.name,
            companyId: companyData.id || companyData.userId
          }
        });
      }

      logger.info(`✅ Company account created notification sent for: ${companyData.companyName || companyData.name}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send company account created notification:', error);
      // Don't throw error to avoid breaking the main flow
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger company profile completed notification
   * @param {Object} companyData - Company data
   * @param {Array} adminEmails - Admin emails (optional)
   */
  static async triggerCompanyProfileCompleted(companyData, adminEmails = []) {
    try {
      // Send to company
      await notificationService.sendNotification({
        type: 'company_profile_completed',
        initiatedBy: 'company',
        action: 'Company Profile Completed',
        description: 'Company finishes profile',
        receivers: [{
          id: companyData.id || companyData.userId,
          type: 'company',
          email: companyData.email || companyData.contactEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Your company profile is complete! You have a free 14 day trial to use Shift. Start posting jobs and find the right talent.',
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs/create`,
          subject: 'Your Shift Profile is Complete!'
        },
        metadata: {
          companyName: companyData.companyName || companyData.name,
          companyId: companyData.id || companyData.userId,
          trialStartDate: new Date().toISOString()
        }
      });

      // Send to admins if provided
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_company_profile_completed',
          initiatedBy: 'company',
          action: 'Company Profile Completed',
          description: 'Company finishes profile',
          receivers: adminEmails.map(email => ({
            id: `admin_${email.replace('@', '_')}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `${companyData.companyName || companyData.name} has completed their profile`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/companies/${companyData.id}`,
            subject: 'Company Profile Completed - Shift'
          },
          metadata: {
            companyName: companyData.companyName || companyData.name,
            companyId: companyData.id || companyData.userId
          }
        });
      }

      logger.info(`✅ Company profile completed notification sent for: ${companyData.companyName || companyData.name}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send company profile completed notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger job seeker profile created notification
   * @param {Object} seekerData - Job seeker data
   * @param {Array} adminEmails - Admin emails (optional)
   */
  static async triggerJobSeekerProfileCreated(seekerData, adminEmails = []) {
    try {
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'job_seeker_profile_created',
        initiatedBy: 'seeker',
        action: 'Profile Created',
        description: 'Job Seeker registers',
        receivers: [{
          id: seekerData.id || seekerData.userId,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Your account has been created. Complete your profile to start applying for jobs.',
          actionUrl: `${process.env.FRONTEND_URL}/seeker/profile/complete`,
          subject: 'Welcome to Shift! Complete Your Profile'
        },
        metadata: {
          seekerName: `${seekerData.firstName} ${seekerData.lastName}`,
          seekerId: seekerData.id || seekerData.userId,
          registrationDate: new Date().toISOString()
        }
      });

      // Send to admins if provided
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_seeker_registered',
          initiatedBy: 'seeker',
          action: 'Profile Created',
          description: 'Job Seeker registers',
          receivers: adminEmails.map(email => ({
            id: `admin_${email.replace('@', '_')}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `A new job seeker "${seekerData.firstName} ${seekerData.lastName}" has registered`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/seekers/${seekerData.id}`,
            subject: 'New Job Seeker Registration - Shift'
          },
          metadata: {
            seekerName: `${seekerData.firstName} ${seekerData.lastName}`,
            seekerId: seekerData.id || seekerData.userId
          }
        });
      }

      logger.info(`✅ Job seeker profile created notification sent for: ${seekerData.firstName} ${seekerData.lastName}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send job seeker profile created notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger job seeker profile completed notification
   * @param {Object} seekerData - Job seeker data
   * @param {Array} adminEmails - Admin emails (optional)
   */
  static async triggerJobSeekerProfileCompleted(seekerData, adminEmails = []) {
    try {
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'job_seeker_profile_completed',
        initiatedBy: 'seeker',
        action: 'Job Seeker Profile Completed',
        description: 'Job Seeker completed profile',
        receivers: [{
          id: seekerData.id || seekerData.userId,
          type: 'seeker',
          email: seekerData.email
        }],
        channels: ['email', 'in-app'],
        content: {
          message: 'Your profile is complete! Start applying for jobs now.',
          actionUrl: `${process.env.FRONTEND_URL}/seeker/jobs/browse`,
          subject: 'Your Profile is Complete - Start Applying!'
        },
        metadata: {
          seekerName: `${seekerData.firstName} ${seekerData.lastName}`,
          seekerId: seekerData.id || seekerData.userId,
          completionDate: new Date().toISOString()
        }
      });

      // Send to admins if provided
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_seeker_profile_completed',
          initiatedBy: 'seeker',
          action: 'Job Seeker Profile Completed',
          description: 'Job Seeker completed profile',
          receivers: adminEmails.map(email => ({
            id: `admin_${email.replace('@', '_')}`,
            type: 'admin',
            email
          })),
          channels: ['email', 'in-app'],
          content: {
            message: `${seekerData.firstName} ${seekerData.lastName} profile is complete & published!`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/seekers/${seekerData.id}`,
            subject: 'Job Seeker Profile Completed - Shift'
          },
          metadata: {
            seekerName: `${seekerData.firstName} ${seekerData.lastName}`,
            seekerId: seekerData.id || seekerData.userId
          }
        });
      }

      logger.info(`✅ Job seeker profile completed notification sent for: ${seekerData.firstName} ${seekerData.lastName}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send job seeker profile completed notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger job posted notification
   * @param {Object} jobData - Job data
   * @param {Object} companyData - Company data
   * @param {Array} adminEmails - Admin emails (optional)
   */
  static async triggerJobPosted(jobData, companyData, adminEmails = []) {
    try {
      const jobType = jobData.jobType === 'instant-hire' ? '(Instant Hire)' : '(Interview First)';
      
      // Send to company
      await notificationService.sendNotification({
        type: 'job_posted',
        initiatedBy: 'company',
        action: 'Job Posted',
        description: 'Company posts job',
        receivers: [{
          id: companyData.id || companyData.userId,
          type: 'company',
          email: companyData.email || companyData.contactEmail
        }],
        channels: ['in-app'],
        content: {
          message: `Great news! Your job '${jobData.title}' ${jobType} is now live. View it here.`,
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs/${jobData.id}`
        },
        metadata: {
          jobTitle: jobData.title,
          jobId: jobData.id,
          jobType: jobData.jobType,
          companyName: companyData.companyName || companyData.name,
          companyId: companyData.id || companyData.userId
        }
      });

      // Send to admins if provided
      if (adminEmails.length > 0) {
        await notificationService.sendNotification({
          type: 'admin_job_posted',
          initiatedBy: 'company',
          action: 'Job Posted',
          description: 'Company posts job',
          receivers: adminEmails.map(email => ({
            id: `admin_${email.replace('@', '_')}`,
            type: 'admin',
            email
          })),
          channels: ['in-app'],
          content: {
            message: `New job '${jobData.title}' posted by ${companyData.companyName || companyData.name}`,
            actionUrl: `${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/jobs/${jobData.id}`,
            subject: 'New Job Posted - Shift'
          },
          metadata: {
            jobTitle: jobData.title,
            jobId: jobData.id,
            jobType: jobData.jobType,
            companyName: companyData.companyName || companyData.name,
            companyId: companyData.id || companyData.userId
          }
        });
      }

      logger.info(`✅ Job posted notification sent for: ${jobData.title}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send job posted notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger application submitted notification
   * @param {Object} applicationData - Application data including job seeker, job, and company info
   */
  static async triggerApplicationSubmitted(applicationData) {
    try {
      const { jobSeeker, job, company, applicationType } = applicationData;
      
      // Send to job seeker
      await notificationService.sendNotification({
        type: 'application_submitted_seeker',
        initiatedBy: 'seeker',
        action: 'Application Submitted',
        description: 'Job Seeker applies',
        receivers: [{
          id: jobSeeker.id,
          type: 'seeker',
          email: jobSeeker.email
        }],
        channels: ['in-app'],
        content: {
          message: `Your application for '${job.title}' has been sent successfully. The employer will review your profile.`
        },
        metadata: {
          jobTitle: job.title,
          jobId: job.id,
          applicationType,
          companyName: company.companyName || company.name,
          companyId: company.id
        }
      });

      // Send to company
      await notificationService.sendNotification({
        type: 'application_submitted',
        initiatedBy: 'seeker',
        action: 'Application Submitted',
        description: 'Job Seeker applies',
        receivers: [{
          id: company.id,
          type: 'company',
          email: company.email || company.contactEmail
        }],
        channels: ['email', 'in-app'],
        content: {
          message: `New application received for '${job.title}' from ${jobSeeker.firstName} ${jobSeeker.lastName}`,
          actionUrl: `${process.env.FRONTEND_URL}/company/jobs/${job.id}/applications`,
          subject: `New Application for ${job.title}`
        },
        metadata: {
          jobTitle: job.title,
          jobId: job.id,
          applicationType,
          candidateName: `${jobSeeker.firstName} ${jobSeeker.lastName}`,
          candidateId: jobSeeker.id,
          companyName: company.companyName || company.name,
          companyId: company.id
        }
      });

      logger.info(`✅ Application submitted notification sent for job: ${job.title}`);
      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to send application submitted notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin emails from environment or default
   * @returns {Array} Array of admin email addresses
   */
  static getAdminEmails() {
    const adminEmails = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
    return adminEmails ? adminEmails.split(',').map(email => email.trim()).filter(email => email) : [];
  }

  /**
   * Safe notification trigger that doesn't throw errors
   * @param {Function} triggerFunction - Notification trigger function
   * @param {...any} args - Arguments to pass to trigger function
   */
  static async safeTrigger(triggerFunction, ...args) {
    try {
      return await triggerFunction(...args);
    } catch (error) {
      logger.error('❌ Notification trigger failed safely:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationHelper;