const { validationResult } = require('express-validator');
const { databaseService, COLLECTIONS } = require('../config/database');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const Chat = require('../models/Chat');

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

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      if (status) {
        options.status = status;
      }

      const applications = await JobApplication.findBySeekerId(userId, options);
      
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
      
      // Check if company owns this application (can be either companyId or userId)
      const hasAccess = application.companyId === userId || job?.userId === userId;
      
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
      
      // Check if company owns this application (can be either companyId or userId)
      const hasAccess = application.companyId === userId || job?.userId === userId;
      
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
      const { interviewDate, interviewTime } = req.body;

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

      // Verify company owns the job
      if (application.companyId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this application'
        });
      }

      // Schedule interview - this triggers chat creation
      await application.scheduleInterview(interviewDate, interviewTime);
      
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

      // Verify seeker owns the application
      if (application.seekerId !== userId) {
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

      // Verify seeker owns the application
      if (application.seekerId !== userId) {
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

      // Verify seeker owns the application
      if (application.seekerId !== userId) {
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
   * POST /api/seekers/:seekerId/block
   */
  static async blockSeeker(req, res) {
    try {
      const { seekerId } = req.params;
      const { userId, userType } = req.user;
      const { reason } = req.body;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can block seekers'
        });
      }

      // Block seeker logic would go here
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
        message: 'Failed to block seeker',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Unblock seeker
   * DELETE /api/seekers/:seekerId/block
   */
  static async unblockSeeker(req, res) {
    try {
      const { seekerId } = req.params;
      const { userId, userType } = req.user;

      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can unblock seekers'
        });
      }

      // Unblock seeker logic would go here
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
        message: 'Failed to unblock seeker',
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

      // Get blocked seekers logic would go here
      const blockedSeekers = [];
      
      res.status(200).json({
        success: true,
        message: 'Blocked seekers retrieved successfully',
        data: blockedSeekers
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

      // Check if application exists
      const applications = await JobApplication.findBySeekerId(userId, { jobId });
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

      // Verify user has access to this application
      const hasAccess = (userType === 'company' && application.companyId === userId) ||
                       (userType === 'seeker' && application.seekerId === userId);
      
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
      const hasAccess = (userType === 'company' && application.companyId === userId) ||
                       (userType === 'seeker' && application.seekerId === userId);
      
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
      const hasAccess = (userType === 'company' && application.companyId === userId) ||
                       (userType === 'seeker' && application.seekerId === userId);
      
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