const { databaseService, COLLECTIONS } = require('../config/database');
const notificationController = require('../controllers/notificationController');

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
    this.videoUrl = data.videoUrl || null; // Admin uploaded video URL/path
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
    
    // Blocking status tracking
    this.blockedByCompanies = data.blockedByCompanies || []; // Companies that have blocked this seeker
    this.totalBlocks = data.totalBlocks || 0; // Total times blocked (for analytics)
    
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
      const createdSeeker = new Seeker({ id: result.id, ...result });

      // Send seeker profile created notification
      try {
        const seekerData = {
          id: createdSeeker.id,
          name: createdSeeker.fullName,
          firstName: createdSeeker.fullName ? createdSeeker.fullName.split(' ')[0] : 'Job Seeker',
          lastName: createdSeeker.fullName ? createdSeeker.fullName.split(' ').slice(1).join(' ') : '',
          email: createdSeeker.email
        };
        
        await notificationController.sendJobSeekerProfileCreated(seekerData);
        console.log('✅ Seeker creation notification sent successfully');
      } catch (notificationError) {
        console.error('⚠️  Failed to send seeker creation notification:', notificationError);
      }

      return createdSeeker;
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

      if (seekers.length === 0) {
        return null;
      }

      if (seekers.length > 1) {
        console.warn(`⚠️  CRITICAL: Multiple seekers found for userId: ${userId}`);
        // Return the most recently created seeker to handle duplicates
        const sortedSeekers = seekers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return new Seeker(sortedSeekers[0]);
      }

      return new Seeker(seekers[0]);
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
   * Record that seeker has been blocked by a company
   */
  async recordBlockedByCompany(companyId, companyName, reason, blockedAt) {
    try {
      // Check if already recorded
      const existingBlock = this.blockedByCompanies.find(block => 
        block.companyId === companyId && block.isActive
      );
      
      if (existingBlock) {
        return this; // Already recorded
      }

      const blockEntry = {
        companyId: companyId,
        companyName: companyName,
        reason: reason,
        blockedAt: blockedAt,
        isActive: true
      };

      this.blockedByCompanies.push(blockEntry);
      this.totalBlocks += 1;

      // Reduce activity score for being blocked
      const newScore = Math.max(0, this.activityScore - 10);

      await this.update({
        blockedByCompanies: this.blockedByCompanies,
        totalBlocks: this.totalBlocks,
        activityScore: newScore,
        updatedAt: new Date().toISOString()
      });

      console.log(`🚫 Seeker ${this.id} recorded as blocked by company ${companyId}`);
      return this;
    } catch (error) {
      console.error('Error recording block by company:', error);
      throw error;
    }
  }

  /**
   * Record that seeker has been unblocked by a company
   */
  async recordUnblockedByCompany(companyId, unblockReason, unblockedAt) {
    try {
      const blockIndex = this.blockedByCompanies.findIndex(block => 
        block.companyId === companyId && block.isActive
      );

      if (blockIndex === -1) {
        return this; // Not found or already inactive
      }

      // Mark as inactive
      this.blockedByCompanies[blockIndex].isActive = false;
      this.blockedByCompanies[blockIndex].unblockedAt = unblockedAt;
      this.blockedByCompanies[blockIndex].unblockReason = unblockReason;

      // Improve activity score slightly for being unblocked
      const newScore = Math.min(100, this.activityScore + 5);

      await this.update({
        blockedByCompanies: this.blockedByCompanies,
        activityScore: newScore,
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Seeker ${this.id} recorded as unblocked by company ${companyId}`);
      return this;
    } catch (error) {
      console.error('Error recording unblock by company:', error);
      throw error;
    }
  }

  /**
   * Check if seeker is blocked by a specific company
   */
  isBlockedByCompany(companyId) {
    return this.blockedByCompanies.some(block => 
      block.companyId === companyId && block.isActive
    );
  }

  /**
   * Get list of companies that have blocked this seeker
   */
  getBlockingCompanies(activeOnly = true) {
    if (activeOnly) {
      return this.blockedByCompanies.filter(block => block.isActive);
    }
    return this.blockedByCompanies;
  }

  /**
   * Get blocking statistics for this seeker
   */
  getBlockingStats() {
    const activeBlocks = this.blockedByCompanies.filter(block => block.isActive);
    const historicalBlocks = this.blockedByCompanies.length;

    // Group by reason
    const reasonStats = {};
    activeBlocks.forEach(block => {
      const reason = block.reason || 'No reason provided';
      reasonStats[reason] = (reasonStats[reason] || 0) + 1;
    });

    return {
      currentlyBlockedByCompanies: activeBlocks.length,
      totalHistoricalBlocks: historicalBlocks,
      totalBlocksRecorded: this.totalBlocks,
      activeBlocks: activeBlocks.map(block => ({
        companyId: block.companyId,
        companyName: block.companyName,
        reason: block.reason,
        blockedAt: block.blockedAt
      })),
      reasonBreakdown: reasonStats,
      impactOnActivityScore: this.totalBlocks * 10 // Each block reduces score by 10
    };
  }

  /**
   * Check if seeker can apply to jobs (not blocked everywhere)
   */
  canApplyToJobs() {
    const baseEligibility = this.isAvailableForJobs();
    const tooManyBlocks = this.totalBlocks >= 10; // Threshold for too many blocks
    
    return baseEligibility && !tooManyBlocks;
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
      videoUrl: this.videoUrl,
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
      
      // Blocking status tracking
      blockedByCompanies: this.blockedByCompanies,
      totalBlocks: this.totalBlocks,
      
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
      seekerId: this.id, // Add seekerId for frontend compatibility
      userId: this.userId,
      
      // Personal Information (including previously missing fields)
      fullName: this.fullName,
      idNumber: this.idNumber,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      mobileNumber: this.mobileNumber,
      email: this.email,
      profilePhoto: this.profilePhoto && !this.profilePhoto.includes('placeholder-storage.com') ? this.profilePhoto : null,
      profileVideo: this.profileVideo, // Only show if published
      videoUrl: this.videoUrl, // Admin uploaded video URL
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
      strikeCount: this.strikeCount,
      videoStatus: this.videoStatus,
      status: this.getStatus(),
      profileCompletionPercentage: this.getProfileCompletionPercentage(),
      isAvailableForJobs: this.isAvailableForJobs,
      
      // Timestamps
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }

  /**
   * Clean up placeholder URLs from profile data
   */
  cleanupPlaceholderUrls() {
    if (this.profilePhoto && this.profilePhoto.includes('placeholder-storage.com')) {
      this.profilePhoto = null;
    }
  }

  /**
   * Clean up all placeholder URLs from database
   */
  static async cleanupAllPlaceholderUrls() {
    try {
      const seekers = await Seeker.search({});
      let cleanedCount = 0;
      
      for (const seeker of seekers) {
        if (seeker.profilePhoto && seeker.profilePhoto.includes('placeholder-storage.com')) {
          seeker.profilePhoto = null;
          await seeker.update({ profilePhoto: null });
          cleanedCount++;
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} placeholder URLs from seeker profiles`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up placeholder URLs:', error);
      throw error;
    }
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
      profilePhoto: this.profilePhoto && !this.profilePhoto.includes('placeholder-storage.com') ? this.profilePhoto : null,
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
      isAvailableForJobs: this.isAvailableForJobs,
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      acceptedAt: this.acceptedAt,
      confirmedAt: this.confirmedAt
    };
  }

  /**
   * Get seeker recommendations based on roles and skills
   */
  static async getRecommendationsByRolesAndSkills(roles = [], skills = [], limit = 20, offset = 0) {
    try {
      const searchFilters = [
        { field: 'profileConfirmed', operator: '==', value: true },
        { field: 'isActive', operator: '==', value: true }
      ];

      // Get all active and confirmed seekers first
      const seekers = await databaseService.query(
        COLLECTIONS.SEEKERS, 
        searchFilters,
        { field: 'updatedAt', direction: 'desc' },
        limit * 2 // Get more to filter locally
      );

      let filteredSeekers = seekers.data || seekers;
      
      // Filter by roles and skills if provided
      if ((roles && roles.length > 0) || (skills && skills.length > 0)) {
        filteredSeekers = filteredSeekers.filter(seekerData => {
          let matchesRole = false;
          let matchesSkill = false;
          
          // Check role match
          if (roles && roles.length > 0 && seekerData.roles && seekerData.roles.length > 0) {
            matchesRole = roles.some(role => 
              seekerData.roles.some(seekerRole =>
                seekerRole.toLowerCase().includes(role.toLowerCase()) ||
                role.toLowerCase().includes(seekerRole.toLowerCase())
              )
            );
          }
          
          // Check skill match  
          if (skills && skills.length > 0 && seekerData.skills && seekerData.skills.length > 0) {
            matchesSkill = skills.some(skill => 
              seekerData.skills.some(seekerSkill =>
                seekerSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(seekerSkill.toLowerCase())
              )
            );
          }
          
          // Return seekers that match either roles or skills (OR logic)
          return matchesRole || matchesSkill;
        });
      }

      // Apply manual pagination
      const startIndex = offset || 0;
      const endIndex = startIndex + (limit || 20);
      const paginatedSeekers = filteredSeekers.slice(startIndex, endIndex);

      // Convert to Seeker instances
      return paginatedSeekers.map(seekerData => new Seeker(seekerData));

    } catch (error) {
      console.error('Error getting seeker recommendations:', error);
      throw error;
    }
  }

  /**
   * Save seeker for company user
   */
  static async saveSeekerForCompany(seekerId, companyUserId) {
    try {
      // Check if already saved
      const existingSaved = await databaseService.query(
        COLLECTIONS.SAVED_SEEKERS,
        [
          { field: 'seekerId', operator: '==', value: seekerId },
          { field: 'companyUserId', operator: '==', value: companyUserId }
        ]
      );

      if (existingSaved.length > 0) {
        throw new Error('Seeker already saved');
      }

      // Save seeker
      const savedSeekerData = {
        seekerId: seekerId,
        companyUserId: companyUserId,
        savedAt: new Date().toISOString(),
        isActive: true
      };

      const savedSeekerId = await databaseService.create(COLLECTIONS.SAVED_SEEKERS, savedSeekerData);
      
      return {
        id: savedSeekerId,
        ...savedSeekerData
      };
    } catch (error) {
      console.error('Error saving seeker for company:', error);
      throw error;
    }
  }

  /**
   * Remove saved seeker for company user
   */
  static async unsaveSeekerForCompany(seekerId, companyUserId) {
    try {
      // Find saved seeker
      const savedSeekers = await databaseService.query(
        COLLECTIONS.SAVED_SEEKERS,
        [
          { field: 'seekerId', operator: '==', value: seekerId },
          { field: 'companyUserId', operator: '==', value: companyUserId }
        ]
      );

      if (savedSeekers.length === 0) {
        return false;
      }

      // Remove saved seeker
      await databaseService.delete(COLLECTIONS.SAVED_SEEKERS, savedSeekers[0].id);
      return true;
    } catch (error) {
      console.error('Error removing saved seeker for company:', error);
      throw error;
    }
  }

  /**
   * Get saved seekers for company user
   */
  static async getSavedSeekersForCompany(companyUserId, limit = 20, offset = 0) {
    try {
      // Get saved seeker entries
      const savedSeekerEntries = await databaseService.query(
        COLLECTIONS.SAVED_SEEKERS,
        [
          { field: 'companyUserId', operator: '==', value: companyUserId },
          { field: 'isActive', operator: '==', value: true }
        ]
      );

      const totalSeekers = savedSeekerEntries.length;
      const paginatedEntries = savedSeekerEntries.slice(offset, offset + limit);

      // Get seeker details for saved seekers
      const seekers = [];
      for (const entry of paginatedEntries) {
        try {
          const seekerData = await databaseService.getById(COLLECTIONS.SEEKERS, entry.seekerId);
          if (seekerData) {
            const seeker = new Seeker(seekerData);
            // Add saved metadata
            seekers.push({
              ...seeker.toPublicJSON(),
              savedAt: entry.savedAt,
              savedId: entry.id
            });
          }
        } catch (error) {
          console.error('Error loading saved seeker details:', error);
          // Continue with other seekers
        }
      }

      return {
        seekers: seekers,
        totalSeekers: totalSeekers,
        hasMore: (offset + limit) < totalSeekers
      };
    } catch (error) {
      console.error('Error getting saved seekers for company:', error);
      throw error;
    }
  }

  /**
   * Check if seeker is saved by company user
   */
  static async isSeekerSavedByCompany(seekerId, companyUserId) {
    try {
      const savedSeekers = await databaseService.query(
        COLLECTIONS.SAVED_SEEKERS,
        [
          { field: 'seekerId', operator: '==', value: seekerId },
          { field: 'companyUserId', operator: '==', value: companyUserId },
          { field: 'isActive', operator: '==', value: true }
        ]
      );

      return savedSeekers.length > 0;
    } catch (error) {
      console.error('Error checking if seeker is saved:', error);
      return false;
    }
  }
}

module.exports = Seeker;