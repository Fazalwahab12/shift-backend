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

      // Immediately populate company and location data
      await job.populateCompanyData();

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: job.toJSON()
      });

    } catch (error) {
      
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

      const job = await Job.findByJobId(jobId);
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

      const job = await Job.findByJobId(jobId);
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

      // Ensure company data is populated before publishing
      if (!job.companyName || !job.locationAddress) {
        await job.populateCompanyData();
      }

      await job.publish();

      res.status(200).json({
        success: true,
        message: 'Job published successfully',
        data: job.toJSON() // Return full job data instead of subset
      });

    } catch (error) {
      
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

      const job = await Job.findByJobId(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Populate company and location data if missing
      if (!job.companyName || !job.locationAddress) {
        await job.populateCompanyData();
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
    
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Advanced job search with comprehensive filters
   * GET /api/jobs/search
   */
  static async searchJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        // Basic search
        q: req.query.q,
        category: req.query.category,
        
        // Location filters
        governorate: req.query.governorate,
        
        // Job type filters
        roles: req.query.roles ? req.query.roles.split(',').map(r => r.trim()) : null,
        hiringType: req.query.hiringType,
        workType: req.query.workType,
        shiftTypes: req.query.shiftTypes ? req.query.shiftTypes.split(',').map(s => s.trim()) : null,
        
        // Skills and requirements
        skills: req.query.skills ? req.query.skills.split(',').map(s => s.trim()) : null,
        languages: req.query.languages ? req.query.languages.split(',').map(l => l.trim()) : null,
        genderPreference: req.query.genderPreference,
        
        // Pay range
        minPay: req.query.minPay ? parseFloat(req.query.minPay) : null,
        maxPay: req.query.maxPay ? parseFloat(req.query.maxPay) : null,
        
        // Hours and duration
        minHours: req.query.minHours ? parseInt(req.query.minHours) : null,
        maxHours: req.query.maxHours ? parseInt(req.query.maxHours) : null,
        
        // Date filters
        publishedAfter: req.query.publishedAfter ? new Date(req.query.publishedAfter) : null,
        startDateAfter: req.query.startDateAfter ? new Date(req.query.startDateAfter) : null,
      };

      // Pagination and sorting
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const sortBy = req.query.sortBy || 'publishedAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const searchResult = await Job.advancedSearchJobs(filters, limit, offset, sortBy, sortOrder);

      res.status(200).json({
        success: true,
        message: 'Jobs search completed successfully',
        data: {
          jobs: searchResult.jobs.map(job => job.toPublicJSON()),
          totalJobs: searchResult.totalJobs,
          hasMore: searchResult.hasMore,
          limit,
          offset,
          filters: {
            ...filters,
            // Convert dates back to ISO strings for response
            publishedAfter: filters.publishedAfter?.toISOString(),
            startDateAfter: filters.startDateAfter?.toISOString(),
          },
          sorting: { sortBy, sortOrder }
        }
      });

    } catch (error) {
      console.error('Error searching jobs:', error);
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

      const job = await Job.findByJobId(jobId);
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

      const job = await Job.findByJobId(jobId);
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

      const job = await Job.findByJobId(jobId);
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

      const originalJob = await Job.findByJobId(jobId);
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
    
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get job recommendations based on user roles
   * GET /api/jobs/recommendations?roles=Cashier,Waiter
   */
  static async getJobRecommendations(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { roles, limit = 20, offset = 0 } = req.query;
      
      if (!roles) {
        return res.status(400).json({
          success: false,
          message: 'Roles parameter is required for recommendations'
        });
      }

      // Parse comma-separated roles
      const roleArray = roles.split(',').map(role => role.trim());
      
      // Get recommended jobs based on roles
      const jobs = await Job.getRecommendationsByRoles(roleArray, parseInt(limit), parseInt(offset));

      res.status(200).json({
        success: true,
        message: 'Job recommendations retrieved successfully',
        data: {
          jobs: jobs.map(job => job.toPublicJSON()),
          totalJobs: jobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          matchedRoles: roleArray
        }
      });

    } catch (error) {
      console.error('Error getting job recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get recent jobs from last N days
   * GET /api/jobs/recent?days=10&limit=20
   */
  static async getRecentJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { days = 10, limit = 20, offset = 0 } = req.query;
      
      // Get recent jobs from the last N days
      const jobs = await Job.getRecentJobs(parseInt(days), parseInt(limit), parseInt(offset));

      res.status(200).json({
        success: true,
        message: 'Recent jobs retrieved successfully',
        data: {
          jobs: jobs.map(job => job.toPublicJSON()),
          totalJobs: jobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          daysRange: parseInt(days)
        }
      });

    } catch (error) {
      console.error('Error getting recent jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get available job categories based on actual job data
   * GET /api/jobs/categories
   */
  static async getJobCategories(req, res) {
    try {
      // Get all published jobs to analyze available categories
      const jobs = await Job.advancedSearchJobs({}, 1000, 0, 'publishedAt', 'desc');
      
      // Extract unique role names and map them to categories
      const roleNames = [...new Set(jobs.jobs.map(job => job.roleName).filter(Boolean))];
      
      // Define role to category mapping based on real data
      const roleCategoryMap = {
        'Cashier': { id: 'cashier', name: 'Cashier', icon: 'burger' },
        'Sales Associate': { id: 'sales', name: 'Sales', icon: 'shirt' },
        'Customer Service': { id: 'customer-service', name: 'Customer Service', icon: 'shopping' },
        'Security Guard': { id: 'security', name: 'Security', icon: 'cpu' },
        'Server': { id: 'server', name: 'Server', icon: 'burger' },
        'Cook': { id: 'cook', name: 'Cook', icon: 'burger' },
        'Barista': { id: 'barista', name: 'Barista', icon: 'burger' }
      };

      // Build categories array from existing roles
      const categories = [
        { id: 'all', name: 'All', icon: 'all', count: jobs.totalJobs }
      ];

      // Add categories for each role that exists in the database
      roleNames.forEach(roleName => {
        const categoryInfo = roleCategoryMap[roleName];
        if (categoryInfo) {
          const roleJobCount = jobs.jobs.filter(job => job.roleName === roleName).length;
          categories.push({
            ...categoryInfo,
            count: roleJobCount
          });
        } else {
          // For roles not in our map, create a generic category
          const genericId = roleName.toLowerCase().replace(/\s+/g, '-');
          categories.push({
            id: genericId,
            name: roleName,
            icon: 'shopping', // default icon
            count: jobs.jobs.filter(job => job.roleName === roleName).length
          });
        }
      });

      res.status(200).json({
        success: true,
        message: 'Job categories retrieved successfully',
        data: {
          categories,
          totalJobs: jobs.totalJobs,
          availableRoles: roleNames
        }
      });

    } catch (error) {
      console.error('Error getting job categories:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Save job for seeker
   * POST /api/jobs/:jobId/save
   */
  static async saveJob(req, res) {
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
      const userId = req.user.userId;

      // Verify job exists
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Save job for user
      const savedJob = await Job.saveJobForUser(jobId, userId);

      res.status(200).json({
        success: true,
        message: 'Job saved successfully',
        data: {
          savedJobId: savedJob.id,
          jobId: jobId,
          savedAt: savedJob.savedAt
        }
      });

    } catch (error) {
      console.error('Error saving job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Remove saved job for seeker
   * DELETE /api/jobs/:jobId/unsave
   */
  static async unsaveJob(req, res) {
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
      const userId = req.user.userId;

      // Remove saved job for user
      const removed = await Job.unsaveJobForUser(jobId, userId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Saved job not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Job removed from saved successfully'
      });

    } catch (error) {
      console.error('Error unsaving job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get saved jobs for seeker
   * GET /api/jobs/saved
   */
  static async getSavedJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      // Get saved jobs for user
      const savedJobs = await Job.getSavedJobsForUser(userId, limit, offset);

      res.status(200).json({
        success: true,
        message: 'Saved jobs retrieved successfully',
        data: {
          jobs: savedJobs.jobs.map(job => job.toPublicJSON()),
          totalJobs: savedJobs.totalJobs,
          hasMore: savedJobs.hasMore,
          limit,
          offset
        }
      });

    } catch (error) {
      console.error('Error getting saved jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all active brands with activity scores
   * GET /api/jobs/brands
   */
  static async getAllBrands(req, res) {
    try {
      const { limit = 50, offset = 0, sortBy = 'activityScore', sortOrder = 'desc' } = req.query;

      const Job = require('../models/Job');

      // Get all published jobs
      const allJobs = await Job.searchJobs(
        { jobStatus: 'published' },
        parseInt(limit) * 10, // Get more jobs to ensure we capture all brands
        0
      );

      // Group jobs by brand and calculate metrics
      const brandMetrics = new Map();

      for (const job of allJobs) {
        if (!job.brandName) continue;

        const brandKey = job.brandName;
        if (!brandMetrics.has(brandKey)) {
          brandMetrics.set(brandKey, {
            brandName: job.brandName,
            companyId: job.companyId,
            companyName: job.companyName,
            jobCount: 0,
            locationCount: 0,
            recentJobsCount: 0,
            governorates: new Set(),
            totalJobs: 0,
            latestJobDate: null
          });
        }

        const brand = brandMetrics.get(brandKey);
        brand.totalJobs += 1;
        brand.jobCount += 1;

        if (job.governorate) {
          brand.governorates.add(job.governorate);
        }

        // Check for recent jobs (last 30 days)
        const jobDate = new Date(job.publishedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (jobDate > thirtyDaysAgo) {
          brand.recentJobsCount += 1;
        }

        // Track latest job date
        if (!brand.latestJobDate || jobDate > new Date(brand.latestJobDate)) {
          brand.latestJobDate = job.publishedAt;
        }
      }

      // Convert to array and calculate activity scores
      let brands = Array.from(brandMetrics.values()).map(brand => {
        const locationCount = brand.governorates.size;
        // Activity score formula: (jobCount * 2) + (locationCount * 3) + (recentJobs * 5)
        const activityScore = (brand.jobCount * 2) + (locationCount * 3) + (brand.recentJobsCount * 5);

        return {
          brandId: `${brand.companyId}-${brand.brandName.replace(/\s+/g, '-').toLowerCase()}`,
          brandName: brand.brandName,
          companyId: brand.companyId,
          companyName: brand.companyName,
          activityScore: activityScore,
          jobCount: brand.jobCount,
          locationCount: locationCount,
          recentJobsCount: brand.recentJobsCount,
          locations: Array.from(brand.governorates),
          latestJobDate: brand.latestJobDate
        };
      });

      // Sort brands
      const sortField = sortBy;
      const isDescending = sortOrder === 'desc';

      brands.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle string sorting for name
        if (sortField === 'name') {
          aVal = a.brandName;
          bVal = b.brandName;
        }

        if (typeof aVal === 'string') {
          return isDescending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        } else {
          return isDescending ? bVal - aVal : aVal - bVal;
        }
      });

      // Paginate results
      const paginatedBrands = brands.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Brands retrieved successfully',
        data: {
          brands: paginatedBrands,
          totalCount: brands.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < brands.length,
          sortBy: sortBy,
          sortOrder: sortOrder
        }
      });

    } catch (error) {
      console.error('Error getting all brands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get brands',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = JobController;