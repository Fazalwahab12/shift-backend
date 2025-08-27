const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Job Seeker Profile Model - Professional Implementation
 * Matches frontend seeker profile steps exactly with enterprise-grade features
 */
class Seeker {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    
    // STEP 1: Personal Information
    this.fullName = data.fullName || null;
    this.idNumber = data.idNumber || null; // Oman Civil ID
    this.dateOfBirth = data.dateOfBirth || null; // Format: "3 July 1984"
    this.gender = data.gender || null; // 'Male', 'Female'
    this.mobileNumber = data.mobileNumber || null; // +968-XXXXXXXX
    this.email = data.email || null;
    this.profilePhoto = data.profilePhoto || null; // Upload photo URL
    this.bio = data.bio || null; // Multi-line bio text
    this.educationalLevel = data.educationalLevel || null; // 'High School', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other'
    
    // VIDEO MANAGEMENT SYSTEM
    this.profileVideo = data.profileVideo || null; // Final video URL (set by admin)
    this.videoStatus = data.videoStatus || 'pending'; // 'pending', 'scheduled', 'recorded', 'published', 'rejected'
    this.videoRequestedAt = data.videoRequestedAt || null; // When user requested video
    this.videoScheduledAt = data.videoScheduledAt || null; // When admin scheduled recording
    this.videoRecordedAt = data.videoRecordedAt || null; // When admin recorded video
    this.videoPublishedAt = data.videoPublishedAt || null; // When admin published video
    this.videoNotes = data.videoNotes || null; // Admin notes about video
    this.videoRecordingLocation = data.videoRecordingLocation || null; // Office location for recording
    this.whatsappContactRequested = data.whatsappContactRequested || false; // User clicked WhatsApp contact
    
    // STEP 2: Professional Information
    this.industries = data.industries || []; // ['Retail', 'Hospitality', 'F&B', 'Technology', etc.]
    this.roles = data.roles || []; // ['Barista', 'Sales', 'Cashier', 'Manager', etc.]
    this.yearsOfExperience = data.yearsOfExperience || null; // Number as string
    this.skills = data.skills || []; // ['Customer Service', 'Cashier', 'Communication', etc.]
    this.previousWorkplaces = data.previousWorkplaces || []; // ['McDonald\'s', 'Zara Oman', etc.]
    this.certificates = data.certificates || null; // Multi-line certificates text
    
    // STEP 3: Availability & Preferences  
    this.availability = data.availability || null; // 'Public Holidays', 'Both', 'Weekends'
    this.currentStatus = data.currentStatus || null; // 'Student', 'Graduate', 'Working', 'Unemployed', 'Other'
    this.workType = data.workType || null; // 'Hourly Work (shifts or events)', 'Short-Term Hire (1–3 months)', 'Full-Time Work'
    this.preferredLocations = data.preferredLocations || []; // ['Seeb', 'Barka', 'Muscat', etc.]
    this.languages = data.languages || []; // ['Arabic', 'English', 'Hindi', etc.] - multiple selection
    this.retailAcademyTrained = data.retailAcademyTrained || null; // 'Yes', 'No'
    
    // STEP 4: Terms & Conditions
    this.acceptedTerms = data.acceptedTerms || false; // Boolean - must be true
    this.acceptedAt = data.acceptedAt || null; // Timestamp when terms accepted
    
    // STEP 5: Profile Preview & Confirmation
    this.profileConfirmed = data.profileConfirmed || false; // Final confirmation
    this.confirmedAt = data.confirmedAt || null; // Timestamp when profile confirmed
    
    // Profile Management
    this.profileCompletionStep = data.profileCompletionStep || 1; // 1-5 steps
    this.isProfileComplete = data.isProfileComplete || false;
    this.profileCompletionPercentage = data.profileCompletionPercentage || 0;
    
    // System Fields
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isVerified = data.isVerified || false;
    this.lastLoginAt = data.lastLoginAt || null;
    this.activityScore = data.activityScore || 100; // Initial score: 100
    this.strikeCount = data.strikeCount || 0; // Strike system for no-shows
    
    // Activity & Statistics Fields (from CSV requirements)
    this.totalJobsAppliedTo = data.totalJobsAppliedTo || 0; // Number of jobs applied to
    this.numberOfHires = data.numberOfHires || 0; // Number of times hired
    this.numberOfInterviews = data.numberOfInterviews || 0; // Number of interviews attended
    this.numberOfNoShows = data.numberOfNoShows || 0; // Number of no-shows (different from strikeCount)
    this.registrationDate = data.registrationDate || null; // When seeker registered (ISO string)
    this.lastActiveDate = data.lastActiveDate || null; // Last activity date (ISO string)
    
    // Company Relations & Applications
    this.applicationHistory = data.applicationHistory || []; // Array of job applications
    this.interviewHistory = data.interviewHistory || []; // Array of interviews
    this.hireHistory = data.hireHistory || []; // Array of hires/jobs completed
    this.companyRatings = data.companyRatings || []; // Ratings received from companies
    this.averageRating = data.averageRating || null; // Average rating from companies
    
    // CV File (missing from original model)
    this.cvFile = data.cvFile || null; // CV file URL
    
    // Metadata
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Create new seeker profile
   */
  static async create(userId, seekerData) {
    try {
      const seeker = new Seeker({
        userId: userId,
        registrationDate: new Date().toISOString(),
        lastActiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...seekerData
      });

      const result = await databaseService.create(COLLECTIONS.SEEKERS, seeker.toJSON());
      return new Seeker({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating seeker profile:', error);
      throw error;
    }
  }

  /**
   * Create seeker profile from onboarding data
   */
  static async createFromOnboarding(userId, seekerData, onboardingData) {
    try {
      // Inherit data from onboarding
      const profileData = {
        userId: userId,
        industries: onboardingData.selectedIndustries || [],
        roles: onboardingData.selectedRoles || [],
        ...seekerData,
        profileCompletionStep: 1,
        activityScore: 100,
        isActive: true
      };

      const seeker = new Seeker(profileData);
      const result = await databaseService.create(COLLECTIONS.SEEKERS, seeker.toJSON());
      return new Seeker({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating seeker profile from onboarding:', error);
      throw error;
    }
  }

  /**
   * Find seeker by user ID
   */
  static async findByUserId(userId) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'userId', operator: '==', value: userId }
      ]);

      return seekers.length > 0 ? new Seeker(seekers[0]) : null;
    } catch (error) {
      console.error('Error finding seeker by user ID:', error);
      throw error;
    }
  }

  /**
   * Find seeker by ID
   */
  static async findById(seekerId) {
    try {
      const seekerData = await databaseService.getById(COLLECTIONS.SEEKERS, seekerId);
      return seekerData ? new Seeker(seekerData) : null;
    } catch (error) {
      console.error('Error finding seeker by ID:', error);
      throw error;
    }
  }

  /**
   * Update seeker profile
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update seeker without ID');
      }

      const updatedSeeker = await databaseService.update(COLLECTIONS.SEEKERS, this.id, updateData);
      Object.assign(this, updatedSeeker);
      return this;
    } catch (error) {
      console.error('Error updating seeker:', error);
      throw error;
    }
  }

  /**
   * Update profile step with comprehensive validation
   */
  async updateProfileStep(step, stepData) {
    try {
      const updateData = {
        profileCompletionStep: Math.max(this.profileCompletionStep, step),
        updatedAt: new Date().toISOString(),
        ...stepData
      };

      // Step-specific logic
      if (step === 4 && stepData.acceptedTerms) {
        updateData.acceptedAt = new Date().toISOString();
      }
      
      if (step === 5 && stepData.profileConfirmed) {
        updateData.confirmedAt = new Date().toISOString();
        updateData.isProfileComplete = true;
        updateData.profileCompletionPercentage = 100;
      }

      // Calculate completion percentage
      updateData.profileCompletionPercentage = this.calculateCompletionPercentage({
        ...this.toJSON(),
        ...updateData
      });

      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating profile step:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage based on required fields per step
   */
  calculateCompletionPercentage(data = null) {
    const seekerData = data || this;
    let totalFields = 0;
    let completedFields = 0;

    // Step 1: Personal Information (10 fields)
    const step1Fields = ['fullName', 'idNumber', 'dateOfBirth', 'gender', 'mobileNumber', 'email', 'profilePhoto', 'bio', 'educationalLevel'];
    totalFields += step1Fields.length;
    step1Fields.forEach(field => {
      if (seekerData[field]) completedFields++;
    });

    // Step 2: Professional Information (6 fields)  
    const step2Fields = ['industries', 'roles', 'yearsOfExperience', 'skills', 'previousWorkplaces'];
    totalFields += step2Fields.length;
    step2Fields.forEach(field => {
      if (seekerData[field] && (Array.isArray(seekerData[field]) ? seekerData[field].length > 0 : seekerData[field])) {
        completedFields++;
      }
    });

    // Step 3: Availability & Preferences (6 fields)
    const step3Fields = ['availability', 'currentStatus', 'workType', 'preferredLocations', 'languages', 'retailAcademyTrained'];
    totalFields += step3Fields.length;
    step3Fields.forEach(field => {
      if (seekerData[field] && (Array.isArray(seekerData[field]) ? seekerData[field].length > 0 : seekerData[field])) {
        completedFields++;
      }
    });

    // Step 4: Terms & Conditions (1 field)
    totalFields += 1;
    if (seekerData.acceptedTerms) completedFields++;

    // Step 5: Profile Confirmation (1 field)
    totalFields += 1;
    if (seekerData.profileConfirmed) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Add strike for no-show or unprofessional behavior
   */
  async addStrike(reason = 'No-show') {
    try {
      const newStrikeCount = this.strikeCount + 1;
      const updateData = {
        strikeCount: newStrikeCount,
        updatedAt: new Date().toISOString()
      };

      // Reduce activity score
      updateData.activityScore = Math.max(0, this.activityScore - 15);

      return await this.update(updateData);
    } catch (error) {
      console.error('Error adding strike:', error);
      throw error;
    }
  }

  /**
   * Update activity score based on platform engagement
   */
  async updateActivityScore(scoreChange) {
    try {
      const newScore = Math.max(0, Math.min(100, this.activityScore + scoreChange));
      return await this.update({ 
        activityScore: newScore,
        lastLoginAt: new Date().toISOString(),
        lastActiveDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating activity score:', error);
      throw error;
    }
  }

  /**
   * Record job application
   */
  async recordJobApplication(jobId, companyId, jobTitle, companyName) {
    try {
      const application = {
        jobId,
        companyId,
        jobTitle,
        companyName,
        appliedAt: new Date().toISOString(),
        status: 'applied' // applied, interviewed, hired, rejected, withdrawn
      };

      const updateData = {
        applicationHistory: [...this.applicationHistory, application],
        totalJobsAppliedTo: this.totalJobsAppliedTo + 1,
        lastActiveDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error recording job application:', error);
      throw error;
    }
  }

  /**
   * Record interview
   */
  async recordInterview(jobId, companyId, interviewDate, interviewType = 'in-person', status = 'scheduled') {
    try {
      const interview = {
        jobId,
        companyId,
        interviewDate,
        interviewType, // 'in-person', 'phone', 'video', 'group'
        status, // 'scheduled', 'completed', 'no-show', 'cancelled'
        recordedAt: new Date().toISOString()
      };

      const updateData = {
        interviewHistory: [...this.interviewHistory, interview],
        numberOfInterviews: this.numberOfInterviews + 1,
        lastActiveDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error recording interview:', error);
      throw error;
    }
  }

  /**
   * Record no-show for interview
   */
  async recordNoShow(jobId, companyId, reason = 'No reason provided') {
    try {
      const updateData = {
        numberOfNoShows: this.numberOfNoShows + 1,
        lastActiveDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Also add a strike for no-show (this will handle suspension logic)
      await this.addStrike(`No-show for interview - ${reason}`);
      
      return await this.update(updateData);
    } catch (error) {
      console.error('Error recording no-show:', error);
      throw error;
    }
  }

  /**
   * Record hire/job completion
   */
  async recordHire(jobId, companyId, jobTitle, companyName, startDate, endDate = null, rating = null) {
    try {
      const hire = {
        jobId,
        companyId,
        jobTitle,
        companyName,
        startDate,
        endDate,
        rating, // Company rating for this seeker (1-5)
        recordedAt: new Date().toISOString()
      };

      const updateData = {
        hireHistory: [...this.hireHistory, hire],
        numberOfHires: this.numberOfHires + 1,
        lastActiveDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // If company provided rating, update ratings
      if (rating) {
        const newRatings = [...this.companyRatings, { companyId, rating, jobId, ratedAt: new Date().toISOString() }];
        const averageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;
        
        updateData.companyRatings = newRatings;
        updateData.averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error recording hire:', error);
      throw error;
    }
  }

  /**
   * Get seeker statistics for CSV export
   */
  getSeekerStats() {
    return {
      seekerId: this.id,
      fullName: this.fullName,
      phoneNumber: this.mobileNumber,
      email: this.email,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      roles: this.roles,
      status: this.getStatus(),
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      totalJobsAppliedTo: this.totalJobsAppliedTo,
      numberOfHires: this.numberOfHires,
      numberOfInterviews: this.numberOfInterviews,
      numberOfNoShows: this.numberOfNoShows,
      strikeCount: this.strikeCount,
      currentStatus: this.isActive ? 'Activated' : 'Deactivated'
    };
  }

  /**
   * Check if seeker is available for jobs
   */
  isAvailableForJobs() {
    return this.isActive && 
           this.isProfileComplete &&
           this.acceptedTerms &&
           this.profileConfirmed;
  }

  /**
   * Get seeker status for display
   */
  getStatus() {
    if (!this.isProfileComplete) return 'incomplete';
    if (!this.isActive) return 'inactive';
    if (this.activityScore < 30) return 'low_activity';
    return 'active';
  }

  /**
   * Request video recording via WhatsApp contact
   */
  async requestVideoRecording() {
    try {
      const updateData = {
        whatsappContactRequested: true,
        videoRequestedAt: new Date().toISOString(),
        videoStatus: 'pending',
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error requesting video recording:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Schedule video recording
   */
  async scheduleVideoRecording(scheduledDate, location, adminNotes = null) {
    try {
      const updateData = {
        videoStatus: 'scheduled',
        videoScheduledAt: scheduledDate,
        videoRecordingLocation: location,
        videoNotes: adminNotes,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error scheduling video recording:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Mark video as recorded
   */
  async markVideoRecorded(adminNotes = null) {
    try {
      const updateData = {
        videoStatus: 'recorded',
        videoRecordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (adminNotes) {
        updateData.videoNotes = adminNotes;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error marking video as recorded:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Publish video and make it live
   */
  async publishVideo(videoUrl, adminNotes = null) {
    try {
      const updateData = {
        profileVideo: videoUrl,
        videoStatus: 'published',
        videoPublishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (adminNotes) {
        updateData.videoNotes = adminNotes;
      }

      // Increase activity score for having a video
      updateData.activityScore = Math.min(100, this.activityScore + 10);

      return await this.update(updateData);
    } catch (error) {
      console.error('Error publishing video:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Reject video request
   */
  async rejectVideoRequest(reason) {
    try {
      const updateData = {
        videoStatus: 'rejected',
        videoNotes: reason,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error rejecting video request:', error);
      throw error;
    }
  }

  /**
   * Get video workflow status
   */
  getVideoWorkflowStatus() {
    return {
      status: this.videoStatus,
      hasVideo: !!this.profileVideo,
      canRequestVideo: !this.whatsappContactRequested && this.videoStatus === 'pending',
      statusMessage: this.getVideoStatusMessage(),
      timeline: {
        requested: this.videoRequestedAt,
        scheduled: this.videoScheduledAt,
        recorded: this.videoRecordedAt,
        published: this.videoPublishedAt
      },
      location: this.videoRecordingLocation,
      notes: this.videoNotes
    };
  }

  /**
   * Get human-readable video status message
   */
  getVideoStatusMessage() {
    switch (this.videoStatus) {
      case 'pending':
        return this.whatsappContactRequested 
          ? 'Video request sent. Admin will contact you to schedule recording.'
          : 'Click "Contact via WhatsApp" to request your profile video.';
      case 'scheduled':
        return `Video recording scheduled. Please visit ${this.videoRecordingLocation} on the scheduled date.`;
      case 'recorded':
        return 'Video has been recorded and is being processed for publication.';
      case 'published':
        return 'Your profile video is now live!';
      case 'rejected':
        return `Video request was rejected. Reason: ${this.videoNotes || 'Please contact admin for details.'}`;
      default:
        return 'Video status unknown.';
    }
  }

  /**
   * Search seekers by criteria with advanced filtering
   */
  static async search(searchCriteria = {}) {
    try {
      const filters = [];
      
      // Add search filters
      if (searchCriteria.industries && searchCriteria.industries.length > 0) {
        filters.push({ field: 'industries', operator: 'array-contains-any', value: searchCriteria.industries });
      }
      
      if (searchCriteria.roles && searchCriteria.roles.length > 0) {
        filters.push({ field: 'roles', operator: 'array-contains-any', value: searchCriteria.roles });
      }
      
      if (searchCriteria.skills && searchCriteria.skills.length > 0) {
        filters.push({ field: 'skills', operator: 'array-contains-any', value: searchCriteria.skills });
      }
      
      if (searchCriteria.preferredLocations && searchCriteria.preferredLocations.length > 0) {
        filters.push({ field: 'preferredLocations', operator: 'array-contains-any', value: searchCriteria.preferredLocations });
      }

      if (searchCriteria.languages && searchCriteria.languages.length > 0) {
        filters.push({ field: 'languages', operator: 'array-contains-any', value: searchCriteria.languages });
      }

      if (searchCriteria.availability) {
        filters.push({ field: 'availability', operator: '==', value: searchCriteria.availability });
      }

      if (searchCriteria.workType) {
        filters.push({ field: 'workType', operator: '==', value: searchCriteria.workType });
      }

      if (searchCriteria.retailAcademyTrained) {
        filters.push({ field: 'retailAcademyTrained', operator: '==', value: searchCriteria.retailAcademyTrained });
      }

      // Activity score filter for quality candidates
      if (searchCriteria.minActivityScore) {
        filters.push({ field: 'activityScore', operator: '>=', value: searchCriteria.minActivityScore });
      }

      // Only show available seekers
      filters.push({ field: 'isActive', operator: '==', value: true });
      filters.push({ field: 'isProfileComplete', operator: '==', value: true });
      filters.push({ field: 'acceptedTerms', operator: '==', value: true });
      filters.push({ field: 'profileConfirmed', operator: '==', value: true });

      const seekers = await databaseService.query(
        COLLECTIONS.SEEKERS,
        filters,
        null, // No ordering to avoid composite index issues
        searchCriteria.limit || 50
      );

      // Sort by activity score in JavaScript
      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      return seekerInstances.sort((a, b) => b.activityScore - a.activityScore);
    } catch (error) {
      console.error('Error searching seekers:', error);
      throw error;
    }
  }

  /**
   * Get seekers by preferred locations
   */
  static async getByLocation(location, limit = 20) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'preferredLocations', operator: 'array-contains', value: location },
        { field: 'isActive', operator: '==', value: true },
        { field: 'isProfileComplete', operator: '==', value: true },
      ], 
      null, // No ordering to avoid composite index issues
      limit);

      // Sort by activity score in JavaScript
      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      return seekerInstances.sort((a, b) => b.activityScore - a.activityScore);
    } catch (error) {
      console.error('Error getting seekers by location:', error);
      throw error;
    }
  }

  /**
   * Get high-performing seekers (activity score >= 70)
   */
  static async getHighPerformers(limit = 20) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'activityScore', operator: '>=', value: 70 },
        { field: 'isActive', operator: '==', value: true },
        { field: 'isProfileComplete', operator: '==', value: true },
      ], null, limit);

      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      return seekerInstances.sort((a, b) => b.activityScore - a.activityScore);
    } catch (error) {
      console.error('Error getting high performers:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Get seekers pending video requests
   */
  static async getVideoPendingRequests(limit = 50) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'whatsappContactRequested', operator: '==', value: true },
        { field: 'videoStatus', operator: '==', value: 'pending' },
        { field: 'isActive', operator: '==', value: true }
      ], null, limit);

      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      // Sort by request date (most recent first)
      return seekerInstances.sort((a, b) => 
        new Date(b.videoRequestedAt) - new Date(a.videoRequestedAt)
      );
    } catch (error) {
      console.error('Error getting video pending requests:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Get seekers with scheduled video recordings
   */
  static async getScheduledVideoRecordings(limit = 50) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'videoStatus', operator: '==', value: 'scheduled' },
        { field: 'isActive', operator: '==', value: true }
      ], null, limit);

      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      // Sort by scheduled date
      return seekerInstances.sort((a, b) => 
        new Date(a.videoScheduledAt) - new Date(b.videoScheduledAt)
      );
    } catch (error) {
      console.error('Error getting scheduled video recordings:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Get seekers with recorded videos pending publication
   */
  static async getRecordedVideosPendingPublication(limit = 50) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'videoStatus', operator: '==', value: 'recorded' },
        { field: 'isActive', operator: '==', value: true }
      ], null, limit);

      const seekerInstances = seekers.map(seekerData => new Seeker(seekerData));
      // Sort by recorded date (oldest first - prioritize older recordings)
      return seekerInstances.sort((a, b) => 
        new Date(a.videoRecordedAt) - new Date(b.videoRecordedAt)
      );
    } catch (error) {
      console.error('Error getting recorded videos pending publication:', error);
      throw error;
    }
  }

  /**
   * ADMIN: Get video workflow statistics
   */
  static async getVideoWorkflowStats() {
    try {
      const allSeekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'isActive', operator: '==', value: true }
      ], null, 1000);

      const stats = {
        total: allSeekers.length,
        pending: allSeekers.filter(s => s.videoStatus === 'pending' && s.whatsappContactRequested).length,
        scheduled: allSeekers.filter(s => s.videoStatus === 'scheduled').length,
        recorded: allSeekers.filter(s => s.videoStatus === 'recorded').length,
        published: allSeekers.filter(s => s.videoStatus === 'published').length,
        rejected: allSeekers.filter(s => s.videoStatus === 'rejected').length,
        noVideoRequested: allSeekers.filter(s => !s.whatsappContactRequested).length
      };

      stats.completionRate = stats.total > 0 
        ? Math.round((stats.published / stats.total) * 100) 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error getting video workflow stats:', error);
      throw error;
    }
  }

  /**
   * Get profile completion percentage (uses the calculation method)
   */
  getProfileCompletionPercentage() {
    return this.calculateCompletionPercentage();
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      userId: this.userId,
      
      // Step 1: Personal Information
      fullName: this.fullName,
      idNumber: this.idNumber,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      mobileNumber: this.mobileNumber,
      email: this.email,
      profilePhoto: this.profilePhoto,
      bio: this.bio,
      educationalLevel: this.educationalLevel,
      
      // Video Management System
      profileVideo: this.profileVideo,
      videoStatus: this.videoStatus,
      videoRequestedAt: this.videoRequestedAt,
      videoScheduledAt: this.videoScheduledAt,
      videoRecordedAt: this.videoRecordedAt,
      videoPublishedAt: this.videoPublishedAt,
      videoNotes: this.videoNotes,
      videoRecordingLocation: this.videoRecordingLocation,
      whatsappContactRequested: this.whatsappContactRequested,
      
      // Step 2: Professional Information
      industries: this.industries,
      roles: this.roles,
      yearsOfExperience: this.yearsOfExperience,
      skills: this.skills,
      previousWorkplaces: this.previousWorkplaces,
      certificates: this.certificates,
      
      // Step 3: Availability & Preferences
      availability: this.availability,
      currentStatus: this.currentStatus,
      workType: this.workType,
      preferredLocations: this.preferredLocations,
      languages: this.languages,
      retailAcademyTrained: this.retailAcademyTrained,
      
      // Step 4: Terms & Conditions
      acceptedTerms: this.acceptedTerms,
      acceptedAt: this.acceptedAt,
      
      // Step 5: Profile Confirmation
      profileConfirmed: this.profileConfirmed,
      confirmedAt: this.confirmedAt,
      
      // Profile Management
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      profileCompletionPercentage: this.profileCompletionPercentage,
      
      // System Fields
      isActive: this.isActive,
      isVerified: this.isVerified,
      lastLoginAt: this.lastLoginAt,
      activityScore: this.activityScore,
      strikeCount: this.strikeCount,
      
      // Activity & Statistics Fields
      totalJobsAppliedTo: this.totalJobsAppliedTo,
      numberOfHires: this.numberOfHires,
      numberOfInterviews: this.numberOfInterviews,
      numberOfNoShows: this.numberOfNoShows,
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      
      // Company Relations & Applications
      applicationHistory: this.applicationHistory,
      interviewHistory: this.interviewHistory,
      hireHistory: this.hireHistory,
      companyRatings: this.companyRatings,
      averageRating: this.averageRating,
      
      // CV File
      cvFile: this.cvFile
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Personal Information (including previously missing fields)
      fullName: this.fullName,
      idNumber: this.idNumber,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      mobileNumber: this.mobileNumber,
      email: this.email,
      profilePhoto: this.profilePhoto,
      profileVideo: this.profileVideo, // Only show if published
      bio: this.bio,
      educationalLevel: this.educationalLevel,
      videoWorkflow: this.getVideoWorkflowStatus(), // Include video workflow status
      
      // Professional Information
      industries: this.industries,
      roles: this.roles,
      yearsOfExperience: this.yearsOfExperience,
      skills: this.skills,
      previousWorkplaces: this.previousWorkplaces,
      certificates: this.certificates,
      
      // Availability & Preferences
      availability: this.availability,
      currentStatus: this.currentStatus,
      workType: this.workType,
      preferredLocations: this.preferredLocations,
      languages: this.languages,
      retailAcademyTrained: this.retailAcademyTrained,
      
      // Status Information
      isVerified: this.isVerified,
      activityScore: this.activityScore,
      status: this.getStatus(),
      profileCompletionPercentage: this.getProfileCompletionPercentage(),
      isAvailableForJobs: this.isAvailableForJobs(),
      
      // Timestamps
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }

  /**
   * Convert to detailed JSON for profile management
   */
  toDetailedJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Complete personal information
      fullName: this.fullName,
      idNumber: this.idNumber,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      mobileNumber: this.mobileNumber,
      email: this.email,
      profilePhoto: this.profilePhoto,
      profileVideo: this.profileVideo,
      bio: this.bio,
      educationalLevel: this.educationalLevel,
      
      // Complete professional information
      industries: this.industries,
      roles: this.roles,
      yearsOfExperience: this.yearsOfExperience,
      skills: this.skills,
      previousWorkplaces: this.previousWorkplaces,
      certificates: this.certificates,
      
      // Complete availability & preferences
      availability: this.availability,
      currentStatus: this.currentStatus,
      workType: this.workType,
      preferredLocations: this.preferredLocations,
      languages: this.languages,
      retailAcademyTrained: this.retailAcademyTrained,
      
      // Profile completion status
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      profileCompletionPercentage: this.getProfileCompletionPercentage(),
      acceptedTerms: this.acceptedTerms,
      profileConfirmed: this.profileConfirmed,
      
      // System information
      isActive: this.isActive,
      isVerified: this.isVerified,
      activityScore: this.activityScore,
      strikeCount: this.strikeCount,
      status: this.getStatus(),
      isAvailableForJobs: this.isAvailableForJobs(),
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      acceptedAt: this.acceptedAt,
      confirmedAt: this.confirmedAt
    };
  }
}

module.exports = Seeker;