const { validationResult } = require('express-validator');
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
      const { coverLetter, expectedSalary, availability } = req.body;

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

      // Check if already applied
      const existingApplication = await JobApplication.findBySeekerId(userId, { jobId });
      if (existingApplication.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this job'
        });
      }

      // Create application
      const applicationData = {
        jobId: job.jobId,
        seekerId: userId,
        companyId: job.companyId,
        coverLetter,
        expectedSalary,
        availability,
        jobTitle: job.roleName,
        companyName: job.companyName
      };

      const application = await JobApplication.create(applicationData);
      
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
      if (!job || job.companyId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Job not found or access denied'
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
      await application.accept();
      
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

      await application.withdraw();
      
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
}

module.exports = JobApplicationController;