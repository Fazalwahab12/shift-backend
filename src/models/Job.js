const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Job Model - Professional Implementation
 * Matches frontend new-job-step structure with 4-step creation process
 */
class Job {
  constructor(data = {}) {
    this.id = data.id || null;
    this.companyId = data.companyId || null;
    this.userId = data.userId || null;
    
    // STEP 1: Basic Info (create.tsx)
    this.jobVenue = data.jobVenue || 'Business Location'; // 'Business Location' | 'External Event'
    this.brandLocationId = data.brandLocationId || null; // Selected store/location ID
    this.roleId = data.roleId || null; // Selected role ID
    this.roleName = data.roleName || null; // Role display name
    this.jobCoverImage = data.jobCoverImage || null; // Upload image URL
    this.jobSummary = data.jobSummary || null; // Job description
    this.dressCode = data.dressCode || null; // Dress code description
    this.dressCodeGuideline = data.dressCodeGuideline || null; // Upload guideline URL
    
    // STEP 2: Hiring Preference (hiring-preference.tsx)
    this.hiringType = data.hiringType || 'Instant Hire'; // 'Instant Hire' | 'Interview First'
    
    // Instant Hire Fields
    this.jobDuration = data.jobDuration || null; // Duration selection
    this.shiftTypes = data.shiftTypes || []; // ['Morning', 'Afternoon', 'Evening', 'Night']
    this.startDate = data.startDate || null; // Start date
    this.startTime = data.startTime || null; // Start time
    this.hoursPerDay = data.hoursPerDay || null; // Number of hours per day
    this.payPerHour = data.payPerHour || null; // Pay per hour in OMR
    this.paymentTerms = data.paymentTerms || null; // 'Within 1 Week' | 'Within 15 Days' | 'Within 30 Days'
    
    // Interview First Fields
    this.interviewDate = data.interviewDate || null; // Optional interview date
    this.interviewTime = data.interviewTime || null; // Optional interview time
    this.interviewDuration = data.interviewDuration || null; // Interview duration (15 min, 30 min, etc.)
    this.interviewLocation = data.interviewLocation || null; // Optional interview location
    this.interviewLanguages = data.interviewLanguages || ['English', 'Arabic']; // Interview languages
    this.workType = data.workType || 'hourly'; // 'hourly' | 'short' | 'full'
    
    // STEP 3: Requirements (requirements.tsx)
    this.requiredSkills = data.requiredSkills || []; // Array of skill names
    this.requiredLanguages = data.requiredLanguages || []; // Array of language names
    this.genderPreference = data.genderPreference || 'Both'; // 'Male' | 'Female' | 'Both'
    this.jobPerks = data.jobPerks || null; // Optional job perks description
    
    // STEP 4: Published (published.tsx) - Auto-generated fields
    this.jobStatus = data.jobStatus || 'draft'; // 'draft' | 'published' | 'paused' | 'closed'
    this.applicationStatus = data.applicationStatus || this.getApplicationStatusFromJobStatus(this.jobStatus); // 'Posted' | 'Canceled' | 'Draft'
    this.publishedAt = data.publishedAt || null;
    this.jobId = data.jobId || this.generateJobId(); // Display job ID
    
    // Job Analytics & Management
    this.applicationsCount = data.applicationsCount || 0;
    this.viewsCount = data.viewsCount || 0;
    this.hiredCount = data.hiredCount || 0;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    
    // Location & Company Details (inherited from company)
    this.companyName = data.companyName || null;
    this.brandName = data.brandName || null;
    this.locationAddress = data.locationAddress || null;
    this.governorate = data.governorate || null;
    
    // Search & Matching Fields
    this.searchTags = data.searchTags || []; // Generated from role, skills, location
    this.experienceLevel = data.experienceLevel || 'entry'; // Derived from requirements
  }

  /**
   * Generate unique job ID for display
   */
  generateJobId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `JOB-${timestamp}${random}`.toUpperCase();
  }


  /**
   * Get application status from job status
   */
  getApplicationStatusFromJobStatus(jobStatus) {
    switch (jobStatus) {
      case 'published':
        return 'Posted';
      case 'closed':
        return 'Canceled';
      case 'draft':
      default:
        return 'Draft';
    }
  }

  /**
   * Update application status based on job status changes
   */
  updateApplicationStatus() {
    this.applicationStatus = this.getApplicationStatusFromJobStatus(this.jobStatus);
  }

  /**
   * Generate search tags for job discovery
   */
  generateSearchTags() {
    const tags = [];
    
    // Add role name
    if (this.roleName) {
      tags.push(this.roleName.toLowerCase());
    }
    
    // Add skills
    if (this.requiredSkills && this.requiredSkills.length > 0) {
      tags.push(...this.requiredSkills.map(skill => skill.toLowerCase()));
    }
    
    // Add location
    if (this.governorate) {
      tags.push(this.governorate.toLowerCase());
    }
    
    // Add company/brand
    if (this.companyName) {
      tags.push(this.companyName.toLowerCase());
    }
    if (this.brandName) {
      tags.push(this.brandName.toLowerCase());
    }
    
    // Add hiring type
    tags.push(this.hiringType.toLowerCase().replace(' ', ''));
    
    // Add shift types
    if (this.shiftTypes && this.shiftTypes.length > 0) {
      tags.push(...this.shiftTypes.map(shift => shift.toLowerCase()));
    }
    
    this.searchTags = [...new Set(tags)]; // Remove duplicates
    return this.searchTags;
  }

  /**
   * Populate company and location data
   */
  async populateCompanyData() {
    try {
      const Company = require('./Company');
      
      // Get company data
      const company = await Company.findById(this.companyId);
      if (company) {
        this.companyName = company.companyName;
        
        // Find location in company's locations array
        if (this.brandLocationId && company.locations && company.locations.length > 0) {
          const location = company.locations.find(loc => loc.id === this.brandLocationId);
          if (location) {
            this.locationAddress = location.address;
            this.brandName = location.brand;
            // You can also set governorate/wilayat if available in location data
          }
        }
        
        // Save the updated data
        await this.update({
          companyName: this.companyName,
          locationAddress: this.locationAddress,
          brandName: this.brandName
        });
      }
    } catch (error) {
      console.error('Error populating company data:', error);
    }
  }

  /**
   * Check if job can be published
   */
  canPublish() {
    const requiredFields = [
      'companyId',
      'brandLocationId',
      'jobSummary',
      'hiringType'
    ];
    
    // Check that we have either roleId OR roleName (at least one role identifier)
    const hasRoleIdentifier = this.roleId || this.roleName;
    
    // Check instant hire specific requirements
    if (this.hiringType === 'Instant Hire') {
      requiredFields.push('payPerHour', 'hoursPerDay', 'startDate', 'paymentTerms');
    }
    
    // Check interview first specific requirements
    if (this.hiringType === 'Interview First') {
      requiredFields.push('workType');
    }
    
    // Check all required fields AND role identifier
    const allFieldsValid = requiredFields.every(field => this[field] !== null && this[field] !== undefined);
    
    return allFieldsValid && hasRoleIdentifier;
  }

  /**
   * Get missing fields for publishing
   */
  getMissingFields() {
    const requiredFields = [
      'companyId',
      'brandLocationId', 
      'jobSummary',
      'hiringType'
    ];
    
    // Check instant hire specific requirements
    if (this.hiringType === 'Instant Hire') {
      requiredFields.push('payPerHour', 'hoursPerDay', 'startDate', 'paymentTerms');
    }
    
    // Check interview first specific requirements
    if (this.hiringType === 'Interview First') {
      requiredFields.push('workType');
    }
    
    const missing = [];
    
    // Check role identifier
    if (!this.roleId && !this.roleName) {
      missing.push('roleId or roleName');
    }
    
    // Check other required fields
    requiredFields.forEach(field => {
      if (this[field] === null || this[field] === undefined || this[field] === '') {
        missing.push(field);
      }
    });
    
    return missing;
  }

  /**
   * Publish the job
   */
  async publish() {
    if (!this.canPublish()) {
      throw new Error('Job missing required fields for publishing');
    }

    this.jobStatus = 'published';
    this.applicationStatus = 'Posted';
    this.publishedAt = new Date().toISOString();
    this.generateSearchTags();

    return await this.update({
      jobStatus: this.jobStatus,
      applicationStatus: this.applicationStatus,
      publishedAt: this.publishedAt,
      searchTags: this.searchTags
    });
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      companyId: this.companyId,
      userId: this.userId,
      jobVenue: this.jobVenue,
      brandLocationId: this.brandLocationId,
      roleId: this.roleId,
      roleName: this.roleName,
      jobCoverImage: this.jobCoverImage,
      jobSummary: this.jobSummary,
      dressCode: this.dressCode,
      dressCodeGuideline: this.dressCodeGuideline,
      hiringType: this.hiringType,
      jobDuration: this.jobDuration,
      shiftTypes: this.shiftTypes,
      startDate: this.startDate,
      startTime: this.startTime,
      hoursPerDay: this.hoursPerDay,
      payPerHour: this.payPerHour,
      paymentTerms: this.paymentTerms,
      interviewDate: this.interviewDate,
      interviewTime: this.interviewTime,
      interviewLocation: this.interviewLocation,
      interviewLanguages: this.interviewLanguages,
      workType: this.workType,
      requiredSkills: this.requiredSkills,
      requiredLanguages: this.requiredLanguages,
      genderPreference: this.genderPreference,
      jobPerks: this.jobPerks,
      jobStatus: this.jobStatus,
      applicationStatus: this.applicationStatus,
      publishedAt: this.publishedAt,
      jobId: this.jobId,
      applicationsCount: this.applicationsCount,
      viewsCount: this.viewsCount,
      hiredCount: this.hiredCount,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      companyName: this.companyName,
      brandName: this.brandName,
      locationAddress: this.locationAddress,
      governorate: this.governorate,
      searchTags: this.searchTags,
      experienceLevel: this.experienceLevel
    };
  }

  /**
   * Convert to public JSON (for job listings)
   */
  toPublicJSON() {
    return {
      id: this.id,
      jobId: this.jobId,
      roleName: this.roleName,
      companyName: this.companyName,
      brandName: this.brandName,
      locationAddress: this.locationAddress,
      governorate: this.governorate,
      jobCoverImage: this.jobCoverImage,
      jobSummary: this.jobSummary,
      hiringType: this.hiringType,
      shiftTypes: this.shiftTypes,
      startDate: this.startDate,
      startTime: this.startTime,
      hoursPerDay: this.hoursPerDay,
      payPerHour: this.payPerHour,
      requiredSkills: this.requiredSkills,
      requiredLanguages: this.requiredLanguages,
      genderPreference: this.genderPreference,
      jobPerks: this.jobPerks,
      applicationStatus: this.applicationStatus,
      publishedAt: this.publishedAt,
      applicationsCount: this.applicationsCount,
      viewsCount: this.viewsCount
    };
  }

  /**
   * Create new job
   */
  static async create(companyId, jobData) {
    try {
      const job = new Job({
        companyId: companyId,
        userId: jobData.userId,
        ...jobData
      });

      const result = await databaseService.create(COLLECTIONS.JOBS, job.toJSON());
      return new Job({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Find job by internal database ID
   */
  static async findById(jobId) {
    try {
      const jobData = await databaseService.getById(COLLECTIONS.JOBS, jobId);
      return jobData ? new Job(jobData) : null;
    } catch (error) {
      console.error('Error finding job:', error);
      throw error;
    }
  }

  /**
   * Find job by display jobId (e.g., "JOB-MF0NQLYR051DW")
   */
  static async findByJobId(jobId) {
    try {
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS,
        [
          { field: 'jobId', operator: '==', value: jobId },
          { field: 'isActive', operator: '==', value: true }
        ]
      );
      return jobs.length > 0 ? new Job(jobs[0]) : null;
    } catch (error) {
      console.error('Error finding job by jobId:', error);
      throw error;
    }
  }

  /**
   * Find jobs by company ID
   */
  static async findByCompanyId(companyId, limit = 10, offset = 0) {
    try {
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS,
        [
          { field: 'companyId', operator: '==', value: companyId },
          { field: 'isActive', operator: '==', value: true }
        ],
        { field: 'createdAt', direction: 'desc' },
        limit
      );
      return jobs.map(jobData => new Job(jobData));
    } catch (error) {
      console.error('Error finding jobs by company:', error);
      throw error;
    }
  }

  /**
   * Search published jobs
   */
  static async searchJobs(filters = {}, limit = 20, offset = 0) {
    try {
      const searchFilters = [
        { field: 'jobStatus', operator: '==', value: 'published' },
        { field: 'isActive', operator: '==', value: true }
      ];
      
      // Add location filter
      if (filters.governorate) {
        searchFilters.push({ field: 'governorate', operator: '==', value: filters.governorate });
      }
      
      // Add role filter
      if (filters.role) {
        searchFilters.push({ field: 'roleName', operator: '==', value: filters.role });
      }
      
      // Add hiring type filter
      if (filters.hiringType) {
        searchFilters.push({ field: 'hiringType', operator: '==', value: filters.hiringType });
      }
      
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS,
        searchFilters,
        { field: 'publishedAt', direction: 'desc' },
        limit
      );
      
      return jobs.map(jobData => new Job(jobData));
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw error;
    }
  }

  /**
   * Update job
   */
  async update(updateData) {
    try {
      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // Update application status if job status is being changed
      if (updateData.jobStatus && updateData.jobStatus !== this.jobStatus) {
        updatedData.applicationStatus = this.getApplicationStatusFromJobStatus(updateData.jobStatus);
      }

      await databaseService.update(COLLECTIONS.JOBS, this.id, updatedData);

      // Update local instance
      Object.keys(updatedData).forEach(key => {
        this[key] = updatedData[key];
      });

      // Update application status on local instance
      if (updatedData.applicationStatus) {
        this.applicationStatus = updatedData.applicationStatus;
      }

      return this;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }

  /**
   * Delete job (soft delete)
   */
  async delete() {
    try {
      await this.update({ isActive: false });
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViews() {
    try {
      await this.update({ viewsCount: this.viewsCount + 1 });
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  }

  /**
   * Increment applications count
   */
  async incrementApplications() {
    try {
      await this.update({ applicationsCount: this.applicationsCount + 1 });
    } catch (error) {
      console.error('Error incrementing applications:', error);
      throw error;
    }
  }

  /**
   * Decrement applications count (when applications are withdrawn/deleted)
   */
  async decrementApplications() {
    try {
      const newCount = Math.max(0, this.applicationsCount - 1); // Ensure it doesn't go below 0
      await this.update({ applicationsCount: newCount });
    } catch (error) {
      console.error('Error decrementing applications:', error);
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  static async getStats(companyId = null) {
    try {
      const filters = companyId ? [
        { field: 'companyId', operator: '==', value: companyId },
        { field: 'isActive', operator: '==', value: true }
      ] : [
        { field: 'isActive', operator: '==', value: true }
      ];
      
      const allJobs = await databaseService.query(COLLECTIONS.JOBS, filters);
      
      const stats = {
        total: allJobs.length,
        published: allJobs.filter(job => job.jobStatus === 'published').length,
        draft: allJobs.filter(job => job.jobStatus === 'draft').length,
        paused: allJobs.filter(job => job.jobStatus === 'paused').length,
        closed: allJobs.filter(job => job.jobStatus === 'closed').length,
        instantHire: allJobs.filter(job => job.hiringType === 'Instant Hire').length,
        interviewFirst: allJobs.filter(job => job.hiringType === 'Interview First').length,
        totalApplications: allJobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0),
        totalViews: allJobs.reduce((sum, job) => sum + (job.viewsCount || 0), 0),
        totalHired: allJobs.reduce((sum, job) => sum + (job.hiredCount || 0), 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting job stats:', error);
      throw error;
    }
  }

  /**
   * Get job recommendations based on user roles
   * @param {Array} roles - Array of role names to match
   * @param {number} limit - Maximum number of jobs to return
   * @param {number} offset - Number of jobs to skip (not supported by current query method)
   * @returns {Promise<Job[]>} - Array of recommended jobs
   */
  static async getRecommendationsByRoles(roles = [], limit = 20, offset = 0) {
    try {
      const searchFilters = [
        { field: 'jobStatus', operator: '==', value: 'published' },
        { field: 'isActive', operator: '==', value: true }
      ];

      // Get all published jobs first
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS, 
        searchFilters,
        { field: 'createdAt', direction: 'desc' },
        limit * 2 // Get more to filter locally
      );

      let filteredJobs = jobs.data || jobs;
      
      // Filter by roles if provided
      if (roles && roles.length > 0) {
        filteredJobs = filteredJobs.filter(jobData => {
          return roles.some(role => 
            jobData.roleName && jobData.roleName.toLowerCase().includes(role.toLowerCase())
          );
        });
      }

      // Apply manual pagination
      const startIndex = offset || 0;
      const endIndex = startIndex + (limit || 20);
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      return paginatedJobs.map(jobData => new Job(jobData));
    } catch (error) {
      console.error('Error getting job recommendations by roles:', error);
      throw error;
    }
  }

  /**
   * Get recent jobs from last N days
   * @param {number} days - Number of days to look back
   * @param {number} limit - Maximum number of jobs to return
   * @param {number} offset - Number of jobs to skip
   * @returns {Promise<Job[]>} - Array of recent jobs
   */
  static async getRecentJobs(days = 10, limit = 20, offset = 0) {
    try {
      // Calculate the date N days ago
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const searchFilters = [
        { field: 'jobStatus', operator: '==', value: 'published' },
        { field: 'isActive', operator: '==', value: true }
      ];

      // Get all published jobs first
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS, 
        searchFilters,
        { field: 'publishedAt', direction: 'desc' },
        limit * 2 // Get more to filter locally
      );

      let filteredJobs = jobs.data || jobs;
      
      // Filter by publication date (last N days)
      filteredJobs = filteredJobs.filter(jobData => {
        if (!jobData.publishedAt) return false;
        
        const publishedDate = new Date(jobData.publishedAt);
        return publishedDate >= daysAgo;
      });

      // Apply manual pagination
      const startIndex = offset || 0;
      const endIndex = startIndex + (limit || 20);
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      return paginatedJobs.map(jobData => new Job(jobData));
    } catch (error) {
      console.error('Error getting recent jobs:', error);
      throw error;
    }
  }

  /**
   * Advanced job search with comprehensive filters
   * @param {Object} filters - Search filters object
   * @param {number} limit - Maximum number of jobs to return
   * @param {number} offset - Number of jobs to skip
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order (asc/desc)
   * @returns {Promise<{jobs: Job[], totalJobs: number, hasMore: boolean}>}
   */
  static async advancedSearchJobs(filters = {}, limit = 20, offset = 0, sortBy = 'publishedAt', sortOrder = 'desc') {
    try {
      // Base filters - only published and active jobs
      const searchFilters = [
        { field: 'jobStatus', operator: '==', value: 'published' },
        { field: 'isActive', operator: '==', value: true }
      ];

      // Get all published jobs first, then filter locally for complex logic
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS, 
        searchFilters,
        { field: sortBy, direction: sortOrder },
        (limit + offset) * 2 // Get more to allow for filtering
      );

      let filteredJobs = jobs.data || jobs;

      // Apply text search filter
      if (filters.q) {
        const searchTerm = filters.q.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
          (job.roleName && job.roleName.toLowerCase().includes(searchTerm)) ||
          (job.jobSummary && job.jobSummary.toLowerCase().includes(searchTerm)) ||
          (job.companyName && job.companyName.toLowerCase().includes(searchTerm)) ||
          (job.brandName && job.brandName.toLowerCase().includes(searchTerm))
        );
      }

      // Apply category filter (map to role names)
      if (filters.category && filters.category !== 'all') {
        const categoryRoleMap = {
          'fashion': ['Sales Associate', 'Fashion Consultant', 'Retail Associate'],
          'fast-food': ['Cashier', 'Cook', 'Server', 'Kitchen Assistant'],
          'sportswear': ['Sales Associate', 'Fitness Instructor', 'Store Associate'],
          'security': ['Security Guard', 'Security Officer'],
          'customer-service': ['Customer Service', 'Customer Support', 'Help Desk']
        };
        
        const categoryRoles = categoryRoleMap[filters.category] || [];
        if (categoryRoles.length > 0) {
          filteredJobs = filteredJobs.filter(job => 
            job.roleName && categoryRoles.some(role => 
              job.roleName.toLowerCase().includes(role.toLowerCase())
            )
          );
        }
      }

      // Apply location filters
      if (filters.governorate) {
        filteredJobs = filteredJobs.filter(job => 
          job.governorate && job.governorate.toLowerCase() === filters.governorate.toLowerCase()
        );
      }


      // Apply role filters
      if (filters.roles && filters.roles.length > 0) {
        filteredJobs = filteredJobs.filter(job => 
          job.roleName && filters.roles.some(role => 
            job.roleName.toLowerCase().includes(role.toLowerCase())
          )
        );
      }

      // Apply hiring type filter
      if (filters.hiringType) {
        filteredJobs = filteredJobs.filter(job => 
          job.hiringType === filters.hiringType
        );
      }

      // Apply work type filter
      if (filters.workType) {
        filteredJobs = filteredJobs.filter(job => 
          job.workType === filters.workType
        );
      }

      // Apply shift types filter
      if (filters.shiftTypes && filters.shiftTypes.length > 0) {
        filteredJobs = filteredJobs.filter(job => 
          job.shiftTypes && job.shiftTypes.some(shift => 
            filters.shiftTypes.includes(shift)
          )
        );
      }

      // Apply skills filter
      if (filters.skills && filters.skills.length > 0) {
        filteredJobs = filteredJobs.filter(job => 
          job.requiredSkills && job.requiredSkills.some(skill => 
            filters.skills.some(filterSkill => 
              skill.toLowerCase().includes(filterSkill.toLowerCase())
            )
          )
        );
      }

      // Apply languages filter
      if (filters.languages && filters.languages.length > 0) {
        filteredJobs = filteredJobs.filter(job => 
          job.requiredLanguages && job.requiredLanguages.some(lang => 
            filters.languages.some(filterLang => 
              lang.toLowerCase().includes(filterLang.toLowerCase())
            )
          )
        );
      }

      // Apply gender preference filter
      if (filters.genderPreference && filters.genderPreference !== 'Both') {
        filteredJobs = filteredJobs.filter(job => 
          !job.genderPreference || 
          job.genderPreference === 'Both' || 
          job.genderPreference === filters.genderPreference
        );
      }

      // Apply pay range filters
      if (filters.minPay !== null) {
        filteredJobs = filteredJobs.filter(job => 
          job.payPerHour && job.payPerHour >= filters.minPay
        );
      }

      if (filters.maxPay !== null) {
        filteredJobs = filteredJobs.filter(job => 
          job.payPerHour && job.payPerHour <= filters.maxPay
        );
      }

      // Apply hours filters
      if (filters.minHours !== null) {
        filteredJobs = filteredJobs.filter(job => 
          job.hoursPerDay && job.hoursPerDay >= filters.minHours
        );
      }

      if (filters.maxHours !== null) {
        filteredJobs = filteredJobs.filter(job => 
          job.hoursPerDay && job.hoursPerDay <= filters.maxHours
        );
      }

      // Apply date filters
      if (filters.publishedAfter) {
        filteredJobs = filteredJobs.filter(job => 
          job.publishedAt && new Date(job.publishedAt) >= filters.publishedAfter
        );
      }

      if (filters.startDateAfter) {
        filteredJobs = filteredJobs.filter(job => 
          job.startDate && new Date(job.startDate) >= filters.startDateAfter
        );
      }

      // Get total count before pagination
      const totalJobs = filteredJobs.length;

      // Apply pagination
      const paginatedJobs = filteredJobs.slice(offset, offset + limit);
      const hasMore = offset + limit < totalJobs;

      return {
        jobs: paginatedJobs.map(jobData => new Job(jobData)),
        totalJobs,
        hasMore
      };
    } catch (error) {
      console.error('Error in advanced job search:', error);
      throw error;
    }
  }

  /**
   * Save job for user
   */
  static async saveJobForUser(jobId, userId) {
    try {
      // Check if already saved
      const existingSaved = await databaseService.query(
        'savedJobs',
        [
          { field: 'jobId', operator: '==', value: jobId },
          { field: 'userId', operator: '==', value: userId }
        ]
      );

      if (existingSaved.length > 0) {
        throw new Error('Job already saved');
      }

      // Save job
      const savedJobData = {
        jobId,
        userId,
        savedAt: new Date().toISOString(),
        isActive: true
      };

      const savedJob = await databaseService.create('savedJobs', savedJobData);
      return { id: savedJob.id, savedAt: savedJobData.savedAt };
    } catch (error) {
      console.error('Error saving job for user:', error);
      throw error;
    }
  }

  /**
   * Remove saved job for user
   */
  static async unsaveJobForUser(jobId, userId) {
    try {
      // Find saved job
      const savedJobs = await databaseService.query(
        'savedJobs',
        [
          { field: 'jobId', operator: '==', value: jobId },
          { field: 'userId', operator: '==', value: userId }
        ]
      );

      if (savedJobs.length === 0) {
        return false;
      }

      // Remove saved job
      await databaseService.delete('savedJobs', savedJobs[0].id);
      return true;
    } catch (error) {
      console.error('Error removing saved job for user:', error);
      throw error;
    }
  }

  /**
   * Get saved jobs for user
   */
  static async getSavedJobsForUser(userId, limit = 20, offset = 0) {
    try {
      // Get saved job entries
      const savedJobEntries = await databaseService.query(
        'savedJobs',
        [
          { field: 'userId', operator: '==', value: userId },
          { field: 'isActive', operator: '==', value: true }
        ]
      );

      const totalJobs = savedJobEntries.length;
      const paginatedEntries = savedJobEntries.slice(offset, offset + limit);

      // Get job details for saved jobs
      const jobs = [];
      for (const entry of paginatedEntries) {
        try {
          const job = await Job.findById(entry.jobId);
          if (job && job.jobStatus === 'published' && job.isActive) {
            jobs.push(job);
          }
        } catch (error) {
          console.error(`Error fetching saved job ${entry.jobId}:`, error);
          // Continue with other jobs
        }
      }

      return {
        jobs,
        totalJobs,
        hasMore: offset + limit < totalJobs
      };
    } catch (error) {
      console.error('Error getting saved jobs for user:', error);
      throw error;
    }
  }

  /**
   * Check if job is saved by user
   */
  static async isJobSavedByUser(jobId, userId) {
    try {
      const savedJobs = await databaseService.query(
        'savedJobs',
        [
          { field: 'jobId', operator: '==', value: jobId },
          { field: 'userId', operator: '==', value: userId }
        ]
      );

      return savedJobs.length > 0;
    } catch (error) {
      console.error('Error checking if job is saved:', error);
      return false;
    }
  }
}

module.exports = Job;