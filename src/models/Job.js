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
    this.wilayat = data.wilayat || null;
    
    // Search & Matching Fields
    this.searchTags = data.searchTags || []; // Generated from role, skills, location
    this.salaryRange = data.salaryRange || this.calculateSalaryRange();
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
   * Calculate salary range based on pay per hour and hours
   */
  calculateSalaryRange() {
    if (!this.payPerHour || !this.hoursPerDay) return null;
    
    const dailySalary = this.payPerHour * this.hoursPerDay;
    const weeklySalary = dailySalary * 5; // Assuming 5 working days
    const monthlySalary = weeklySalary * 4; // Assuming 4 weeks
    
    return {
      hourly: this.payPerHour,
      daily: dailySalary,
      weekly: weeklySalary,
      monthly: monthlySalary,
      currency: 'OMR'
    };
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
    if (this.wilayat) {
      tags.push(this.wilayat.toLowerCase());
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
   * Check if job can be published
   */
  canPublish() {
    const requiredFields = [
      'companyId',
      'brandLocationId',
      'roleId',
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
    
    return requiredFields.every(field => this[field] !== null && this[field] !== undefined);
  }

  /**
   * Publish the job
   */
  async publish() {
    if (!this.canPublish()) {
      throw new Error('Job missing required fields for publishing');
    }
    
    this.jobStatus = 'published';
    this.publishedAt = new Date().toISOString();
    this.generateSearchTags();
    
    return await this.update({
      jobStatus: this.jobStatus,
      publishedAt: this.publishedAt,
      searchTags: this.searchTags
    });
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      id: this.id,
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
      wilayat: this.wilayat,
      searchTags: this.searchTags,
      salaryRange: this.salaryRange,
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
      wilayat: this.wilayat,
      jobCoverImage: this.jobCoverImage,
      jobSummary: this.jobSummary,
      hiringType: this.hiringType,
      shiftTypes: this.shiftTypes,
      startDate: this.startDate,
      startTime: this.startTime,
      hoursPerDay: this.hoursPerDay,
      payPerHour: this.payPerHour,
      salaryRange: this.salaryRange,
      requiredSkills: this.requiredSkills,
      requiredLanguages: this.requiredLanguages,
      genderPreference: this.genderPreference,
      jobPerks: this.jobPerks,
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
   * Find job by ID
   */
  static async findById(jobId) {
    try {
      const jobData = await databaseService.findById(COLLECTIONS.JOBS, jobId);
      return jobData ? new Job(jobData) : null;
    } catch (error) {
      console.error('Error finding job:', error);
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
        { companyId: companyId },
        { 
          orderBy: { field: 'createdAt', direction: 'desc' },
          limit: limit,
          offset: offset
        }
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
      const searchFilters = { jobStatus: 'published', isActive: true };
      
      // Add location filter
      if (filters.governorate) {
        searchFilters.governorate = filters.governorate;
      }
      
      // Add role filter
      if (filters.role) {
        searchFilters.roleName = filters.role;
      }
      
      // Add hiring type filter
      if (filters.hiringType) {
        searchFilters.hiringType = filters.hiringType;
      }
      
      const jobs = await databaseService.query(
        COLLECTIONS.JOBS,
        searchFilters,
        { 
          orderBy: { field: 'publishedAt', direction: 'desc' },
          limit: limit,
          offset: offset
        }
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
      
      await databaseService.update(COLLECTIONS.JOBS, this.id, updatedData);
      
      // Update local instance
      Object.keys(updatedData).forEach(key => {
        this[key] = updatedData[key];
      });
      
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
   * Get job statistics
   */
  static async getStats(companyId = null) {
    try {
      const filters = companyId ? { companyId } : {};
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
}

module.exports = Job;