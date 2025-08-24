const { validationResult } = require('express-validator');
const Job = require('../models/Job');
const Company = require('../models/Company');

/**
 * Job Controller - Professional Implementation
 * Handles 4-step job creation process matching frontend structure
 */
class JobController {
  /**
   * Create new job (Step 1: Basic Info)
   * POST /api/jobs
   */
  static async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.body;

      // Verify company exists and user has permission
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Check if company can create jobs (subscription limits)
      if (!company.canPerformAction('job_posting')) {
        return res.status(403).json({
          success: false,
          message: 'Job posting limit reached for current plan',
                      data: {
              currentJobs: (await Job.findByCompanyId(companyId)).length,
              maxJobs: company.planLimits.jobPostings,
              subscriptionPlan: company.subscriptionPlan
            }
        });
      }

      const job = await Job.create(companyId, req.body);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error in createJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update job step
   * PUT /api/jobs/:jobId/step/:step
   */
  static async updateJobStep(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { jobId, step } = req.params;
      const updateData = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Validate step number
      const stepNumber = parseInt(step);
      if (stepNumber < 1 || stepNumber > 4) {
        return res.status(400).json({
          success: false,
          message: 'Invalid step number. Must be between 1 and 4'
        });
      }

      await job.update(updateData);

      res.status(200).json({
        success: true,
        message: `Job step ${step} updated successfully`,
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error in updateJobStep:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Publish job (Final step)
   * POST /api/jobs/:jobId/publish
   */
  static async publishJob(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (!job.canPublish()) {
        return res.status(400).json({
          success: false,
          message: 'Job missing required fields for publishing',
          data: {
            jobStatus: job.jobStatus,
            missingFields: job.getMissingFields ? job.getMissingFields() : []
          }
        });
      }

      await job.publish();

      res.status(200).json({
        success: true,
        message: 'Job published successfully',
        data: {
          id: job.id,
          jobId: job.jobId,
          jobStatus: job.jobStatus,
          publishedAt: job.publishedAt,
          jobSummary: job.jobSummary,
          roleName: job.roleName,
          companyName: job.companyName,
          locationAddress: job.locationAddress,
          hiringType: job.hiringType,
          payPerHour: job.payPerHour,
          hoursPerDay: job.hoursPerDay,
          startDate: job.startDate,
          startTime: job.startTime
        }
      });

    } catch (error) {
      console.error('Error in publishJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get job by ID
   * GET /api/jobs/:jobId
   */
  static async getJobById(req, res) {
    try {
      const { jobId } = req.params;
      const { increment_views } = req.query;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Increment view count if requested
      if (increment_views === 'true') {
        await job.incrementViews();
      }

      res.status(200).json({
        success: true,
        message: 'Job retrieved successfully',
        data: job.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in getJobById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get jobs by company
   * GET /api/jobs/company/:companyId
   */
  static async getJobsByCompany(req, res) {
    try {
      const { companyId } = req.params;
      const { limit = 10, offset = 0, status } = req.query;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      let jobs = await Job.findByCompanyId(companyId, parseInt(limit), parseInt(offset));

      // Filter by status if provided
      if (status) {
        jobs = jobs.filter(job => job.jobStatus === status);
      }

      res.status(200).json({
        success: true,
        message: 'Jobs retrieved successfully',
        data: {
          jobs: jobs.map(job => job.toJSON()),
          totalJobs: jobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          companyName: company.companyName
        }
      });

    } catch (error) {
      console.error('Error in getJobsByCompany:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search published jobs
   * GET /api/jobs/search
   */
  static async searchJobs(req, res) {
    try {
      const { 
        governorate, 
        role, 
        hiringType, 
        minPay, 
        maxPay, 
        skills, 
        languages,
        limit = 20, 
        offset = 0 
      } = req.query;

      const filters = {};
      
      if (governorate) filters.governorate = governorate;
      if (role) filters.role = role;
      if (hiringType) filters.hiringType = hiringType;
      
      // Add salary range filter logic here if needed
      if (minPay || maxPay) {
        // Implementation for salary filtering
      }

      const jobs = await Job.searchJobs(filters, parseInt(limit), parseInt(offset));

      res.status(200).json({
        success: true,
        message: 'Jobs search completed successfully',
        data: {
          jobs: jobs.map(job => job.toPublicJSON()),
          totalJobs: jobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          filters: filters
        }
      });

    } catch (error) {
      console.error('Error in searchJobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update job
   * PUT /api/jobs/:jobId
   */
  static async updateJob(req, res) {
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
      const updateData = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      await job.update(updateData);

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error in updateJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Pause/Resume job
   * PUT /api/jobs/:jobId/toggle-status
   */
  static async toggleJobStatus(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const newStatus = job.jobStatus === 'published' ? 'paused' : 'published';
      await job.update({ jobStatus: newStatus });

      res.status(200).json({
        success: true,
        message: `Job ${newStatus} successfully`,
        data: {
          id: job.id,
          jobId: job.jobId,
          jobStatus: job.jobStatus,
          roleName: job.roleName
        }
      });

    } catch (error) {
      console.error('Error in toggleJobStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete job
   * DELETE /api/jobs/:jobId
   */
  static async deleteJob(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      await job.delete();

      res.status(200).json({
        success: true,
        message: 'Job deleted successfully',
        data: {
          id: job.id,
          jobId: job.jobId,
          isActive: job.isActive
        }
      });

    } catch (error) {
      console.error('Error in deleteJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Copy job (create duplicate)
   * POST /api/jobs/:jobId/copy
   */
  static async copyJob(req, res) {
    try {
      const { jobId } = req.params;

      const originalJob = await Job.findById(jobId);
      if (!originalJob) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Create copy with modified data
      const jobData = originalJob.toJSON();
      delete jobData.id;
      delete jobData.publishedAt;
      delete jobData.applicationsCount;
      delete jobData.viewsCount;
      delete jobData.hiredCount;
      
      jobData.jobStatus = 'draft';
      jobData.jobSummary = `${jobData.jobSummary} (Copy)`;

      const copiedJob = await Job.create(originalJob.companyId, jobData);

      res.status(201).json({
        success: true,
        message: 'Job copied successfully',
        data: copiedJob.toJSON()
      });

    } catch (error) {
      console.error('Error in copyJob:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get job statistics
   * GET /api/jobs/stats
   */
  static async getJobStats(req, res) {
    try {
      const { companyId } = req.query;

      const stats = await Job.getStats(companyId);

      res.status(200).json({
        success: true,
        message: 'Job statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getJobStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get trending jobs
   * GET /api/jobs/trending
   */
  static async getTrendingJobs(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Get published jobs sorted by views and applications
      const jobs = await Job.searchJobs(
        { }, 
        parseInt(limit), 
        0
      );

      // Sort by trending score (views + applications * 2)
      const trendingJobs = jobs
        .map(job => ({
          ...job.toPublicJSON(),
          trendingScore: job.viewsCount + (job.applicationsCount * 2)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore);

      res.status(200).json({
        success: true,
        message: 'Trending jobs retrieved successfully',
        data: {
          jobs: trendingJobs,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error in getTrendingJobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = JobController;