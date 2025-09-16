const { validationResult } = require('express-validator');
const { databaseService, COLLECTIONS } = require('../config/database');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const Chat = require('../models/Chat');
const NotificationHelper = require('../utils/notificationHelper');

/**
 * Job Application Controller
 * Handles job applications and triggers chat creation
 */
class JobApplicationController {
  /**
   * Apply to a job
   * POST /api/jobs/:jobId/apply
   */
  static async applyToJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { jobId } = req.params;
      const { userId, userType } = req.user;
      const { availability } = req.body;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can apply to jobs'
        });
      }

      // Get job details
      const job = await Job.findByJobId(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.jobStatus !== 'published') {
        return res.status(400).json({
          success: false,
          message: 'Cannot apply to unpublished job'
        });
      }

      // Get seeker document to ensure it exists and get the proper document ID
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Check if already applied (using seeker document ID)
      const existingApplication = await JobApplication.findBySeekerId(seeker.id, { jobId });
      if (existingApplication.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this job'
        });
      }

      // Create application (use seeker document ID instead of user ID)
      const applicationData = {
        jobId: job.jobId,
        seekerId: seeker.id,  // Use seeker document ID, not user ID
        companyId: job.companyId,
        availability,
        jobTitle: job.roleName,
        companyName: job.companyName,
        hiringType: job.hiringType,
        actionById: userId
      };

      const application = await JobApplication.create(applicationData, req);
      
      // Increment the job's applications count
      await job.incrementApplications();

      // 🔥 AUTO-TRIGGER APPLICATION SUBMITTED NOTIFICATIONS
      try {
        const Company = require('../models/Company');
        const company = await Company.findById(job.companyId);
        
        if (company) {
          const applicationNotificationData = {
            jobSeeker: {
              id: seeker.id,
              email: seeker.email,
              firstName: seeker.firstName,
              lastName: seeker.lastName
            },
            job: {
              id: job.jobId,
              title: job.title || job.roleName
            },
            company: {
              id: company.id,
              name: company.companyName,
              companyName: company.companyName,
              email: company.companyEmail,
              contactEmail: company.companyEmail
            },
            applicationType: job.jobType || job.hiringType
          };

          await NotificationHelper.triggerApplicationSubmitted(applicationNotificationData);
          console.log('✅ Application submitted notifications sent successfully');
        }
      } catch (notifError) {
        console.error('❌ Failed to send application submitted notifications:', notifError);
        // Don't fail the main request for notification errors
      }
      
      res.status(201).json({
        success: true,
        message: 'Job application submitted successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error applying to job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit job application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get job applications for a job (company view)
   * GET /api/jobs/:jobId/applications
   */
  static async getJobApplications(req, res) {
    try {
      const { jobId } = req.params;
      const { userId, userType } = req.user;
      const { status, limit = 20, offset = 0 } = req.query;

      // Verify user is company and owns the job
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view job applications'
        });
      }

      const job = await Job.findByJobId(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Check if company owns this job (can be either companyId or userId)
      const hasAccess = job.companyId === userId || job.userId === userId;
      
      console.log(`🔍 Access Check for Applications - CompanyId: ${job.companyId}, UserId: ${job.userId}, RequestUserId: ${userId}, HasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only view applications for your own jobs',
          debug: {
            jobCompanyId: job.companyId,
            jobUserId: job.userId,
            requestUserId: userId
          }
        });
      }

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      if (status) {
        options.status = status;
      }

      const applications = await JobApplication.findByJobId(job.jobId, options);
      const stats = await JobApplication.getStats(job.jobId);
      
      res.status(200).json({
        success: true,
        message: 'Job applications retrieved successfully',
        data: {
          applications: applications.map(app => app.toJSON()),
          stats
        }
      });

    } catch (error) {
      console.error('Error getting job applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job applications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker's applications
   * GET /api/applications
   */
  static async getSeekerApplications(req, res) {
    try {
      const { userId, userType } = req.user;
      const { status, limit = 20, offset = 0 } = req.query;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can view their applications'
        });
      }

      // Get seeker document to ensure it exists and get the proper document ID
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      if (status) {
        options.status = status;
      }

      // Use seeker document ID instead of user ID
      const applications = await JobApplication.findBySeekerId(seeker.id, options);
      
      res.status(200).json({
        success: true,
        message: 'Applications retrieved successfully',
        data: applications.map(app => app.toJSON())
      });

    } catch (error) {
      console.error('Error getting seeker applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve applications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Accept job application - TRIGGERS CHAT CREATION
   * PUT /api/applications/:applicationId/accept
   */
  static async acceptApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can accept applications'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      // Accept application - this triggers chat creation
      await application.accept(req);
      
      res.status(200).json({
        success: true,
        message: 'Application accepted successfully. Chat initiated.',
        data: {
          application: application.toJSON(),
          chatInitiated: true,
          chatId: application.chatId
        }
      });

    } catch (error) {
      console.error('Error accepting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reject job application
   * PUT /api/applications/:applicationId/reject
   */
  static async rejectApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can reject applications'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      await application.reject(reason);

      // 🔥 AUTO-TRIGGER APPLICATION REJECTED NOTIFICATION
      try {
        const seeker = await Seeker.findById(application.seekerId);
        
        if (seeker) {
          const rejectionData = {
            jobTitle: application.jobTitle,
            jobId: application.jobId,
            seekerName: seeker.fullName || `${seeker.firstName} ${seeker.lastName}`,
            seekerId: seeker.id,
            seekerEmail: seeker.email,
            companyName: application.companyName,
            reason: reason || 'Application was not selected'
          };

          await notificationController.sendApplicationRejected(rejectionData);
          console.log('✅ Application rejected notifications sent successfully');
        }
      } catch (notifError) {
        console.error('❌ Failed to send application rejected notifications:', notifError);
        // Don't fail the main request for notification errors
      }
      
      res.status(200).json({
        success: true,
        message: 'Application rejected successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error rejecting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Decline job application with specific reasons
   * PUT /api/applications/:applicationId/decline
   */
  static async declineApplication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can decline applications'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get the job to check ownership (same logic as hire method)
      const Job = require('../models/Job');
      const job = await Job.findByJobId(application.jobId);
      
      // Check if user belongs to the same company
      let hasAccess = application.companyId === userId || job?.userId === userId;
      
      console.log(`🔍 Decline Initial access check - App CompanyId: ${application.companyId}, Job UserId: ${job?.userId}, RequestUserId: ${userId}, Initial HasAccess: ${hasAccess}`);
      
      // If no direct match, check if user belongs to the company
      if (!hasAccess && job?.companyId) {
        try {
          const Company = require('../models/Company');
          console.log(`🔍 Decline: Checking company membership for user ${userId}...`);
          const userCompany = await Company.findByUserId(userId);
          console.log(`🔍 Decline: User's company:`, userCompany ? { id: userCompany.id, companyName: userCompany.companyName } : 'Not found');
          
          if (userCompany && userCompany.id === job.companyId) {
            hasAccess = true;
            console.log(`✅ Decline: Access granted via company membership`);
          }
        } catch (companyCheckError) {
          console.log('Error checking company ownership for decline:', companyCheckError);
        }
      }
      
      console.log(`🔍 Decline Access Check - App CompanyId: ${application.companyId}, Job CompanyId: ${job?.companyId}, Job UserId: ${job?.userId}, RequestUserId: ${userId}, HasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only decline applications for your own jobs',
          debug: {
            applicationCompanyId: application.companyId,
            jobUserId: job?.userId,
            requestUserId: userId
          }
        });
      }

      await application.decline(reason, req);
      
      res.status(200).json({
        success: true,
        message: 'Application declined successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error declining application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decline application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Send hire request to seeker
   * PUT /api/applications/:applicationId/hire
   */
  static async sendHireRequest(req, res) {
    try {
      let { applicationId } = req.params;
      const { userId, userType } = req.user;

      // Clean parameter - remove any colon prefix
      applicationId = applicationId.startsWith(':') ? applicationId.substring(1) : applicationId;

      console.log(`🔍 Hire Request Debug - ApplicationId: ${applicationId}, CompanyUserId: ${userId}, UserType: ${userType}`);

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can send hire requests'
        });
      }

      // Try to find application by applicationId field first (more likely scenario)
      console.log(`🔍 Searching for application by applicationId field: ${applicationId}`);
      const applications = await databaseService.query(
        COLLECTIONS.JOB_APPLICATIONS,
        [{ field: 'applicationId', operator: '==', value: applicationId }]
      );
      
      let application;
      if (applications.length > 0) {
        application = new JobApplication(applications[0]);
        // Ensure the document ID is properly set
        application.id = applications[0].id;
        await application.populateData();
        console.log(`🔍 Application found by applicationId field:`, {
          id: application.id,
          applicationId: application.applicationId,
          status: application.status,
          seekerId: application.seekerId,
          companyId: application.companyId
        });
      } else {
        console.log(`🔍 Application not found by applicationId field, trying by document ID...`);
        // Fallback: try finding by document ID
        application = await JobApplication.findById(applicationId);
        
        if (application) {
          console.log(`🔍 Application found by document ID:`, {
            id: application.id,
            applicationId: application.applicationId,
            status: application.status,
            seekerId: application.seekerId,
            companyId: application.companyId
          });
        }
      }

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
          debug: {
            searchedId: applicationId,
            note: 'Tried both document ID and applicationId field'
          }
        });
      }

      // Get the job to check ownership
      const Job = require('../models/Job');
      const job = await Job.findByJobId(application.jobId);
      
      // Check if user belongs to the same company
      // Option 1: Direct user match (job creator)
      // Option 2: Company ID match (application belongs to user's company)  
      // Option 3: Job's companyId matches user's company profile
      let hasAccess = application.companyId === userId || job?.userId === userId;
      
      console.log(`🔍 Initial access check - App CompanyId: ${application.companyId}, Job UserId: ${job?.userId}, RequestUserId: ${userId}, Initial HasAccess: ${hasAccess}`);
      
      // If no direct match, check if user belongs to the company
      if (!hasAccess && job?.companyId) {
        try {
          const Company = require('../models/Company');
          console.log(`🔍 Checking company membership for user ${userId}...`);
          const userCompany = await Company.findByUserId(userId);
          console.log(`🔍 User's company:`, userCompany ? { id: userCompany.id, companyName: userCompany.companyName } : 'Not found');
          console.log(`🔍 Job's companyId: ${job.companyId}`);
          
          if (userCompany && userCompany.id === job.companyId) {
            hasAccess = true;
            console.log(`✅ Access granted: User belongs to company ${job.companyId}`);
          } else {
            console.log(`❌ Access denied: User does not belong to job's company`);
          }
        } catch (companyCheckError) {
          console.log('Error checking company ownership:', companyCheckError);
        }
      }
      
      console.log(`🔍 Hire Access Check - App CompanyId: ${application.companyId}, Job CompanyId: ${job?.companyId}, Job UserId: ${job?.userId}, RequestUserId: ${userId}, HasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only hire for your own jobs',
          debug: {
            applicationCompanyId: application.companyId,
            jobUserId: application.jobData?.userId,
            requestUserId: userId
          }
        });
      }

      await application.sendHireRequest();
      
      res.status(200).json({
        success: true,
        message: 'Hire request sent successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error sending hire request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send hire request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Shortlist application
   * PUT /api/applications/:applicationId/shortlist
   */
  static async shortlistApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can shortlist applications'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      await application.shortlist();
      
      res.status(200).json({
        success: true,
        message: 'Application shortlisted successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error shortlisting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to shortlist application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Schedule interview - TRIGGERS CHAT CREATION
   * PUT /api/applications/:applicationId/interview
   */
  static async scheduleInterview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      
      console.log('🔍 Backend received interview scheduling request:', {
        applicationId,
        userId,
        userType,
        body: req.body
      });
      
      const { 
        interviewDate, 
        interviewTime, 
        duration = 30, 
        interviewType = 'in-person', 
        location, 
        notes 
      } = req.body;
      
      console.log('🔍 Extracted interview data:', {
        interviewDate,
        interviewTime,
        duration,
        interviewType,
        location,
        notes,
        dateType: typeof interviewDate,
        timeType: typeof interviewTime,
        locationIsUndefined: location === undefined,
        notesIsUndefined: notes === undefined
      });

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can schedule interviews'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get the job to check ownership (same logic as hire and decline methods)
      const Job = require('../models/Job');
      const job = await Job.findByJobId(application.jobId);
      
      // Check if company owns this application (can be either companyId or userId)
      const hasAccess = application.companyId === userId || job?.userId === userId;
      
      console.log(`🔍 Interview Access Check - App CompanyId: ${application.companyId}, Job CompanyId: ${job?.companyId}, Job UserId: ${job?.userId}, RequestUserId: ${userId}, HasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only schedule interviews for your own jobs',
          debug: {
            applicationCompanyId: application.companyId,
            jobUserId: job?.userId,
            requestUserId: userId
          }
        });
      }

      // Schedule interview - this triggers chat creation
      const interviewData = {
        interviewDate,
        interviewTime,
        duration,
        interviewType,
        location,
        notes
      };
      
      console.log('🔍 Calling application.scheduleInterview with:', interviewData);
      
      await application.scheduleInterview(interviewData);
      
      res.status(200).json({
        success: true,
        message: 'Interview scheduled successfully. Chat initiated.',
        data: {
          application: application.toJSON(),
          chatInitiated: true,
          chatId: application.chatId
        }
      });

    } catch (error) {
      console.error('Error scheduling interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Withdraw application (seeker)
   * PUT /api/applications/:applicationId/withdraw
   */
  static async withdrawApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can withdraw applications'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get seeker document to verify ownership
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Verify seeker owns the application
      if (application.seekerId !== seeker.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      // Get the job to decrement applications count
      const job = await Job.findByJobId(application.jobId);
      
      await application.withdraw();
      
      // Decrement the job's applications count if job exists
      if (job) {
        await job.decrementApplications();
      }
      
      res.status(200).json({
        success: true,
        message: 'Application withdrawn successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error withdrawing application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Invite seeker to apply for job
   * POST /api/jobs/:jobId/invite/:seekerId
   */
  static async inviteSeeker(req, res) {
    try {
      let { jobId, seekerId } = req.params;
      const { userId, userType } = req.user;

      // Clean parameters - remove any colon prefix
      jobId = jobId.startsWith(':') ? jobId.substring(1) : jobId;
      seekerId = seekerId.startsWith(':') ? seekerId.substring(1) : seekerId;

      console.log(`🔍 Invite Debug - JobId: ${jobId}, SeekerId: ${seekerId}, CompanyUserId: ${userId}, UserType: ${userType}`);

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can invite seekers'
        });
      }

      // Get job details
      const job = await Job.findByJobId(jobId);
      
      console.log(`🔍 Job found:`, job ? {
        id: job.id,
        jobId: job.jobId,
        companyId: job.companyId,
        userId: job.userId,
        jobStatus: job.jobStatus,
        isActive: job.isActive,
        roleName: job.roleName
      } : 'No job found');
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
          debug: {
            searchedJobId: jobId,
            note: 'Job may not exist or isActive=false'
          }
        });
      }

      // Check if company owns this job (can be either companyId or userId)
      const hasAccess = job.companyId === userId || job.userId === userId;
      
      console.log(`🔍 Access Check - CompanyId: ${job.companyId}, UserId: ${job.userId}, RequestUserId: ${userId}, HasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only invite seekers to your own jobs',
          debug: {
            jobCompanyId: job.companyId,
            jobUserId: job.userId,
            requestUserId: userId
          }
        });
      }

      // Check if invitation already exists
      const existingApplication = await JobApplication.findBySeekerId(seekerId, { jobId });
      if (existingApplication.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Seeker has already applied or been invited to this job'
        });
      }

      // Create invitation
      const applicationData = {
        jobId: job.jobId,
        seekerId,
        companyId: job.companyId,
        jobTitle: job.roleName,
        companyName: job.companyName,
        hiringType: job.hiringType,
        status: 'invited',
        applicationSource: 'invited',
        actionById: userId
      };

      const application = await JobApplication.create(applicationData, req);
      
      // Increment the job's applications count
      await job.incrementApplications();
      
      res.status(201).json({
        success: true,
        message: 'Seeker invited successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error inviting seeker:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to invite seeker',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Accept invitation and apply to job
   * PUT /api/applications/:applicationId/accept-invitation
   */
  static async acceptInvitation(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can accept invitations'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get seeker document to verify ownership
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Verify seeker owns the application
      if (application.seekerId !== seeker.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      await application.acceptInvitation();
      
      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Respond to hire request
   * PUT /api/applications/:applicationId/hire-response
   */
  static async respondToHireRequest(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { response } = req.body;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can respond to hire requests'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get seeker document to verify ownership
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Verify seeker owns the application
      if (application.seekerId !== seeker.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      await application.respondToHireRequest(response);
      
      res.status(200).json({
        success: true,
        message: 'Hire request response submitted successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error responding to hire request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to hire request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Respond to interview request (seeker)
   * PUT /api/applications/:applicationId/interview-response
   */
  static async respondToInterviewRequest(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { response } = req.body;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can respond to interview requests'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Get seeker document to verify ownership
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Verify seeker owns the application
      if (application.seekerId !== seeker.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      // Verify application has interview scheduled
      if (!application.interviewScheduled || application.status !== 'interviewed') {
        return res.status(400).json({
          success: false,
          message: 'No interview invitation found for this application'
        });
      }

      await application.respondToInterviewRequest(response);
      
      res.status(200).json({
        success: true,
        message: 'Interview response submitted successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error responding to interview request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to interview request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Report absence
   * POST /api/applications/:applicationId/report-absence
   */
  static async reportAbsence(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can report absences'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      await application.reportAbsence(reason);
      
      res.status(200).json({
        success: true,
        message: 'Absence reported successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error reporting absence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report absence',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get reports for application
   * GET /api/applications/:applicationId/reports
   */
  static async getReports(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify user has access to this application
      const hasAccess = (userType === 'company' && application.companyId === userId) ||
                       (userType === 'seeker' && application.seekerId === userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      const reports = await application.getReports();
      
      res.status(200).json({
        success: true,
        message: 'Reports retrieved successfully',
        data: reports
      });

    } catch (error) {
      console.error('Error getting reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Block seeker
   * POST /api/company/block-seeker
   */
  static async blockSeeker(req, res) {
    try {
      const { userId, userType } = req.user;
      const { seekerId, reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can block seekers'
        });
      }

      // Get company by userId
      const Company = require('../models/Company');
      const company = await Company.findByUserId(userId);
      
      console.log(`🔍 Blocking - Finding company for userId: ${userId}`);
      console.log(`🏢 Company found for blocking:`, company ? {
        id: company.id, 
        name: company.companyName,
        currentBlockedCount: company.blockedSeekers?.length || 0
      } : 'None');
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      console.log(`🚫 Attempting to block seekerId: ${seekerId} with reason: ${reason}`);
      
      // Block the seeker - use company ID, not user ID
      await company.blockSeeker(seekerId, reason, company.id);
      
      console.log(`✅ Block completed. New blocked count: ${company.blockedSeekers?.length || 0}`);

      res.status(200).json({
        success: true,
        message: 'Seeker blocked successfully',
        data: {
          seekerId,
          reason,
          blockedBy: userId
        }
      });

    } catch (error) {
      console.error('Error blocking seeker:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to block seeker',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Unblock seeker
   * PUT /api/company/unblock-seeker/:seekerId
   */
  static async unblockSeeker(req, res) {
    try {
      const { seekerId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can unblock seekers'
        });
      }

      // Get company by userId
      const Company = require('../models/Company');
      const company = await Company.findByUserId(userId);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Unblock the seeker - use company ID, not user ID
      await company.unblockSeeker(seekerId, reason || 'Unblocked by company', company.id);

      res.status(200).json({
        success: true,
        message: 'Seeker unblocked successfully',
        data: {
          seekerId,
          unblockedBy: userId
        }
      });

    } catch (error) {
      console.error('Error unblocking seeker:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unblock seeker',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get blocked seekers
   * GET /api/company/blocked-seekers
   */
  static async getBlockedSeekers(req, res) {
    try {
      const { userId, userType } = req.user;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view blocked seekers'
        });
      }

      // Get company by userId
      const Company = require('../models/Company');
      const company = await Company.findByUserId(userId);
      
      console.log(`🔍 Finding company for userId: ${userId}`);
      console.log(`🏢 Company found:`, company ? {
        id: company.id, 
        name: company.companyName,
        blockedSeekersCount: company.blockedSeekers?.length || 0
      } : 'None');
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Get blocked seekers from company
      const blockedSeekers = company.getBlockedSeekers(true); // Only active blocks
      console.log(`📋 Blocked seekers found: ${blockedSeekers.length}`);
      
      // Get seeker details for each blocked seeker
      const Seeker = require('../models/Seeker');
      const blockedSeekersWithDetails = await Promise.all(
        blockedSeekers.map(async (block) => {
          try {
            const seeker = await Seeker.findById(block.seekerId);
            return {
              id: `${company.id}_${block.seekerId}`,
              seekerId: block.seekerId,
              companyId: company.id,
              reason: block.reason,
              blockedAt: block.blockedAt,
              seeker: seeker ? {
                fullName: seeker.fullName,
                email: seeker.email,
                mobileNumber: seeker.mobileNumber,
                profilePhoto: seeker.profilePhoto,
                skills: seeker.skills || [],
                yearsOfExperience: seeker.yearsOfExperience,
                isVerified: seeker.isVerified,
                averageRating: seeker.averageRating
              } : null
            };
          } catch (error) {
            console.error(`Error fetching seeker ${block.seekerId}:`, error);
            return {
              id: `${company.id}_${block.seekerId}`,
              seekerId: block.seekerId,
              companyId: company.id,
              reason: block.reason,
              blockedAt: block.blockedAt,
              seeker: null
            };
          }
        })
      );

      // Filter out entries where seeker details couldn't be fetched
      const validBlockedSeekers = blockedSeekersWithDetails.filter(block => block.seeker !== null);
      
      res.status(200).json({
        success: true,
        message: 'Blocked seekers retrieved successfully',
        data: { blockedSeekers: validBlockedSeekers }
      });

    } catch (error) {
      console.error('Error getting blocked seekers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve blocked seekers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get blocking statistics
   * GET /api/company/blocking-stats
   */
  static async getBlockingStats(req, res) {
    try {
      const { userId, userType } = req.user;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view blocking statistics'
        });
      }

      // Get blocking stats logic would go here
      const stats = {
        totalBlocked: 0,
        totalUnblocked: 0,
        currentlyBlocked: 0
      };
      
      res.status(200).json({
        success: true,
        message: 'Blocking statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error getting blocking stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve blocking statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Block seeker from application
   * POST /api/applications/:applicationId/block-seeker
   */
  static async blockSeekerFromApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can block seekers'
        });
      }

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      // Block seeker from application logic would go here
      res.status(200).json({
        success: true,
        message: 'Seeker blocked from application successfully',
        data: {
          applicationId,
          seekerId: application.seekerId,
          reason,
          blockedBy: userId
        }
      });

    } catch (error) {
      console.error('Error blocking seeker from application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block seeker from application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if seeker has applied to a job
   * GET /api/jobs/:jobId/application-status
   */
  static async checkApplicationStatus(req, res) {
    try {
      const { jobId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can check application status'
        });
      }

      // Get seeker document to ensure it exists and get the proper document ID
      const Seeker = require('../models/Seeker');
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Check if application exists using seeker document ID
      const applications = await JobApplication.findBySeekerId(seeker.id, { jobId });
      const hasApplied = applications.length > 0;
      
      let applicationData = null;
      if (hasApplied) {
        applicationData = applications[0].toJSON();
      }

      res.status(200).json({
        success: true,
        message: hasApplied ? 'Application found' : 'No application found',
        data: {
          hasApplied,
          application: applicationData
        }
      });

    } catch (error) {
      console.error('Error checking application status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check application status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get application by ID
   * GET /api/applications/:applicationId
   */
  static async getApplicationById(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      let hasAccess = false;

      // For companies, check if they own the job
      if (userType === 'company') {
        const Job = require('../models/Job');
        const job = await Job.findByJobId(application.jobId);
        hasAccess = application.companyId === userId || job?.userId === userId;
      }
      
      // For seekers, get seeker document and compare with application.seekerId
      if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          hasAccess = application.seekerId === seeker.id;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Application retrieved successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error getting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get rateable seekers (who accepted hire/interview requests)
   * GET /api/applications/rateable-seekers
   */
  static async getRateableSeekers(req, res) {
    try {
      const { userId, userType } = req.user;

      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Company users only.'
        });
      }

      // Get the company profile ID for this user (not the user ID)
      const CompanyProfile = require('../models/Company');
      const companyProfile = await CompanyProfile.findByUserId(userId);

      if (!companyProfile) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found for this user'
        });
      }

      const companyId = companyProfile.id;

      // Use company profile ID to find applications
      let filters = [
        { field: 'companyId', operator: '==', value: companyId }
      ];

      const applications = await databaseService.query(
        COLLECTIONS.JOB_APPLICATIONS,
        filters,
        { field: 'updatedAt', direction: 'desc' },
        50 // Get recent applications
      );

      let applicationsData = applications.data || applications;

      // Filter for seekers with status "hired" or "interviewed" who accepted
      const rateableApplications = applicationsData.filter(app =>
        (app.status === 'hired' || app.status === 'interviewed') &&
        (app.hireResponse === 'accepted' || app.interviewResponse === 'accepted')
      );

      // Get seekers data
      const seekers = [];
      for (const appData of rateableApplications.slice(0, 10)) {
        const application = new JobApplication(appData);
        await application.populateData();

        if (application.seekerData) {
          seekers.push({
            applicationId: application.id,
            seekerId: application.seekerId,
            ...application.seekerData,
            jobTitle: application.jobData?.roleName,
            acceptedType: appData.hireResponse === 'accepted' ? 'hire' : 'interview'
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Rateable seekers retrieved successfully',
        data: {
          seekers: seekers,
          total: seekers.length
        }
      });

    } catch (error) {
      console.error('Error getting rateable seekers:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Complete job (mark as completed)
   * PUT /api/applications/:applicationId/complete
   */
  static async completeJob(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { feedback, rating, notes } = req.body;

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Both company and seeker can mark as completed
      let hasAccess = false;

      if (userType === 'company') {
        const Job = require('../models/Job');
        const job = await Job.findByJobId(application.jobId);
        hasAccess = application.companyId === userId || job?.userId === userId;
      } else if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          hasAccess = application.seekerId === seeker.id;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      if (application.status !== 'hired') {
        return res.status(400).json({
          success: false,
          message: 'Only hired applications can be completed'
        });
      }

      const previousStatus = application.status;
      
      application.status = 'completed';
      application.statusChangedAt = new Date().toISOString();
      application.updatedAt = new Date().toISOString();

      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        application.id,
        {
          status: application.status,
          statusChangedAt: application.statusChangedAt,
          updatedAt: application.updatedAt
        }
      );

      // Track history
      const ApplicationHistory = require('../models/ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: application.id,
        jobId: application.jobId,
        seekerId: application.seekerId,
        companyId: application.companyId,
        action: 'completed',
        fromStatus: previousStatus,
        toStatus: application.status,
        actionBy: userType,
        actionById: userId,
        notes: notes || 'Job marked as completed',
        metadata: { feedback, rating },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Job completed successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error completing job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete job',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel job (mark as cancelled)  
   * PUT /api/applications/:applicationId/cancel
   */
  static async cancelJob(req, res) {
    try {
      const { applicationId } = req.params;
      const { userId, userType } = req.user;
      const { reason, notes } = req.body;

      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Both company and seeker can cancel
      let hasAccess = false;

      if (userType === 'company') {
        const Job = require('../models/Job');
        const job = await Job.findByJobId(application.jobId);
        hasAccess = application.companyId === userId || job?.userId === userId;
      } else if (userType === 'seeker') {
        const Seeker = require('../models/Seeker');
        const seeker = await Seeker.findByUserId(userId);
        if (seeker) {
          hasAccess = application.seekerId === seeker.id;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      const previousStatus = application.status;
      
      application.status = 'cancelled';
      application.declineReason = reason;
      application.statusChangedAt = new Date().toISOString();
      application.updatedAt = new Date().toISOString();

      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        application.id,
        {
          status: application.status,
          declineReason: application.declineReason,
          statusChangedAt: application.statusChangedAt,
          updatedAt: application.updatedAt
        }
      );

      // Track history
      const ApplicationHistory = require('../models/ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: application.id,
        jobId: application.jobId,
        seekerId: application.seekerId,
        companyId: application.companyId,
        action: 'cancelled',
        fromStatus: previousStatus,
        toStatus: application.status,
        actionBy: userType,
        actionById: userId,
        reason: reason,
        notes: notes || 'Job cancelled',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Job cancelled successfully',
        data: application.toJSON()
      });

    } catch (error) {
      console.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get applications for a specific seeker (company view)
   * GET /api/seekers/:seekerId/applications
   */
  static async getSeekerApplicationsForCompany(req, res) {
    try {
      const { seekerId } = req.params;
      const { userId, userType } = req.user;

      console.log(`🔍 getSeekerApplicationsForCompany - SeekerId: ${seekerId}, CompanyUserId: ${userId}`);

      // Verify user is company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view seeker applications'
        });
      }

      // Get ALL applications for this seeker (not just for current company)
      console.log(`🔍 Looking for applications where seekerId=${seekerId}`);
      const applications = await JobApplication.findBySeekerId(seekerId);
      
      console.log(`🔍 Found ${applications.length} total applications for seeker ${seekerId}`);
      
      // Filter applications that belong to jobs owned by the current company user
      const companyApplications = [];
      for (const app of applications) {
        if (app.jobData && (app.jobData.userId === userId || app.companyId === userId)) {
          companyApplications.push(app);
        }
      }
      
      console.log(`🔍 Found ${companyApplications.length} applications for seeker ${seekerId} with company user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Seeker applications retrieved successfully',
        data: {
          applications: applications.map(app => app.toJSON())
        }
      });

    } catch (error) {
      console.error('Error getting seeker applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve seeker applications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if seeker has application for specific job
   * GET /api/jobs/:jobId/seekers/:seekerId/application
   */
  static async getSeekerJobApplication(req, res) {
    try {
      const { jobId, seekerId } = req.params;
      const { userId, userType } = req.user;

      console.log(`🔍 getSeekerJobApplication - JobId: ${jobId}, SeekerId: ${seekerId}, CompanyUserId: ${userId}`);

      // Verify user is company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view seeker applications'
        });
      }

      // Check if seeker applied to this specific job
      const applications = await JobApplication.findBySeekerId(seekerId, { jobId });
      
      console.log(`🔍 Found ${applications.length} applications for seeker ${seekerId} on job ${jobId}`);

      if (applications.length > 0) {
        const application = applications[0]; // Get the application
        res.status(200).json({
          success: true,
          message: 'Seeker application found',
          data: {
            hasApplication: true,
            application: application.toJSON()
          }
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'No application found',
          data: {
            hasApplication: false,
            application: null
          }
        });
      }

    } catch (error) {
      console.error('Error checking seeker job application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check seeker application',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = JobApplicationController;