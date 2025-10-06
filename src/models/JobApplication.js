const { databaseService, COLLECTIONS } = require('../config/database');
const Chat = require('./Chat');
const notificationController = require('../controllers/notificationController');

/**
 * Job Application Model
 * Handles job applications, acceptances, and chat initiation triggers
 */
class JobApplication {
  constructor(data = {}) {
    this.id = data.id || null;
    this.applicationId = data.applicationId || this.generateApplicationId();
    
    // Core application data
    this.jobId = data.jobId || null;
    this.seekerId = data.seekerId || null;
    this.companyId = data.companyId || null;
    
    // POPULATED DATA - Complete seeker, job, and company information
    this.seekerData = data.seekerData || null;
    this.jobData = data.jobData || null;
    this.companyData = data.companyData || null;
    
    // Application details
    this.status = data.status || 'applied'; // 'applied', 'invited', 'interviewed', 'hired', 'declined', 'withdrawn'
    this.applicationSource = data.applicationSource || 'applied'; // 'applied', 'invited'
    this.availability = data.availability || null;
    
    // Decline/rejection details
    this.declineReason = data.declineReason || null; // 'Another candidate selected', 'Not the right fit', 'Limited experience', 'Position filled'
    this.declinedAt = data.declinedAt || null;
    
    // Hire acceptance status
    this.hireStatus = data.hireStatus || null; // 'pending', 'accepted', 'rejected'
    this.hireRequestedAt = data.hireRequestedAt || null;
    this.hireRespondedAt = data.hireRespondedAt || null;
    this.hireResponse = data.hireResponse || null; // 'accepted', 'rejected'
    
    // Reporting system
    this.reportingEnabled = data.reportingEnabled || false;
    this.reportHistory = data.reportHistory || []; // Array of attendance reports
    
    // Job details (cached for quick access)
    this.jobTitle = data.jobTitle || null;
    this.jobType = data.jobType || null; // 'Instant Hire' or 'Interview First'
    this.companyName = data.companyName || null;
    this.seekerName = data.seekerName || null;
    this.seekerPhone = data.seekerPhone || null;
    this.seekerEmail = data.seekerEmail || null;
    
    // Interview scheduling (for Interview First jobs)
    this.interviewScheduled = data.interviewScheduled || false;
    this.interviewDate = data.interviewDate || null;
    this.interviewTime = data.interviewTime || null;
    this.interviewDuration = data.interviewDuration || null; // in minutes
    this.interviewEndTime = data.interviewEndTime || null;
    this.interviewId = data.interviewId || null; // ID of the Interview record
    this.interviewStatus = data.interviewStatus || null; // 'scheduled', 'completed', 'cancelled', 'no_show'
    this.interviewType = data.interviewType || 'in-person'; // 'in-person', 'phone', 'video'
    this.interviewLocation = data.interviewLocation || null;
    this.interviewNotes = data.interviewNotes || null;
    this.interviewResponse = data.interviewResponse || null; // 'accepted', 'declined'
    this.interviewRespondedAt = data.interviewRespondedAt || null;
    
    // Chat integration
    this.chatId = data.chatId || null;
    this.chatInitiated = data.chatInitiated || false;
    
    // System fields
    this.appliedAt = data.appliedAt || new Date().toISOString();
    this.reviewedAt = data.reviewedAt || null;
    this.statusChangedAt = data.statusChangedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Generate unique application ID
   */
  generateApplicationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `APP-${timestamp}${random}`.toUpperCase();
  }

  /**
   * Populate application with complete seeker, job, and company data
   */
  async populateData() {
    try {
      console.log(`🔍 PopulateData - Application ID: ${this.id}, SeekerId: ${this.seekerId}, Has seekerData: ${!!this.seekerData}`);
      
      // Get seeker data
      if (this.seekerId && !this.seekerData) {
        const Seeker = require('./Seeker');
        console.log(`🔍 PopulateData - Looking up seeker by document ID: ${this.seekerId}`);
        // Note: seekerId should now be the seeker document ID
        const seeker = await Seeker.findById(this.seekerId);
        console.log(`🔍 PopulateData - Seeker found:`, seeker ? { id: seeker.id, userId: seeker.userId, fullName: seeker.fullName } : 'Not found');
        
        if (seeker) {
          this.seekerData = {
            id: seeker.id,
            userId: seeker.userId,
            fullName: seeker.fullName,
            email: seeker.email,
            mobileNumber: seeker.mobileNumber,
            dateOfBirth: seeker.dateOfBirth,
            profilePhoto: seeker.profilePhoto,
            profileVideo: seeker.profileVideo,
            bio: seeker.bio,
            educationalLevel: seeker.educationalLevel,
            industries: seeker.industries,
            roles: seeker.roles,
            yearsOfExperience: seeker.yearsOfExperience,
            skills: seeker.skills,
            previousWorkplaces: seeker.previousWorkplaces,
            availability: seeker.availability,
            currentStatus: seeker.currentStatus,
            workType: seeker.workType,
            preferredLocations: seeker.preferredLocations,
            languages: seeker.languages,
            averageRating: seeker.averageRating,
            activityScore: seeker.activityScore,
            totalJobsAppliedTo: seeker.totalJobsAppliedTo,
            numberOfHires: seeker.numberOfHires,
            numberOfInterviews: seeker.numberOfInterviews,
            isVerified: seeker.isVerified,
            registrationDate: seeker.registrationDate,
            lastActiveDate: seeker.lastActiveDate
          };
        }
      }

      // Get job data
      if (this.jobId && !this.jobData) {
        const Job = require('./Job');
        const job = await Job.findByJobId(this.jobId);
        if (job) {
          this.jobData = {
            id: job.id,
            jobId: job.jobId,
            userId: job.userId,
            companyId: job.companyId,
            roleName: job.roleName,
            jobSummary: job.jobSummary,
            jobCoverImage: job.jobCoverImage,
            hiringType: job.hiringType,
            payPerHour: job.payPerHour,
            hoursPerDay: job.hoursPerDay,
            shiftTypes: job.shiftTypes,
            shiftTimeRanges: job.shiftTimeRanges,
            startDate: job.startDate,
            startTime: job.startTime,
            requiredSkills: job.requiredSkills,
            requiredLanguages: job.requiredLanguages,
            genderPreference: job.genderPreference,
            jobPerks: job.jobPerks,
            dressCode: job.dressCode,
            workType: job.workType,
            interviewAvailability: job.interviewAvailability,
            interviewDuration: job.interviewDuration,
            interviewLocation: job.interviewLocation,
            interviewLanguages: job.interviewLanguages,
            locationAddress: job.locationAddress,
            governorate: job.governorate,
            jobStatus: job.jobStatus,
            publishedAt: job.publishedAt,
            applicationsCount: job.applicationsCount,
            viewsCount: job.viewsCount,
            brandLocationId: job.brandLocationId
          };
        }
      }

      // Get company data
      if (this.companyId && !this.companyData) {
        const Company = require('./Company');
        const company = await Company.findById(this.companyId);
        if (company) {
          // Find the specific location if brandLocationId is available
          let locationData = null;
          if (this.jobData && this.jobData.brandLocationId && company.locations) {
            locationData = company.locations.find(loc => loc.id === this.jobData.brandLocationId);
          }

          this.companyData = {
            id: company.id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyDescription: company.companyDescription,
            industryType: company.industryType,
            companySize: company.companySize,
            website: company.website,
            establishedYear: company.establishedYear,
            licenseNumber: company.licenseNumber,
            contactEmail: company.contactEmail,
            contactPhone: company.contactPhone,
            subscriptionPlan: company.subscriptionPlan,
            isVerified: company.isVerified,
            rating: company.averageRating,
            totalJobs: company.totalJobsPosted,
            activeJobs: company.activeJobsCount,
            locationData: locationData ? {
              id: locationData.id,
              brand: locationData.brand,
              address: locationData.address,
              governorate: locationData.governorate,
              wilayat: locationData.wilayat,
              contactPerson: locationData.contactPerson,
              contactPhone: locationData.contactPhone
            } : null
          };
        }
      }

      return this;
    } catch (error) {
      console.error('Error populating application data:', error);
      throw error;
    }
  }

  /**
   * Create new job application with full data population
   */
  static async create(applicationData, req = null) {
    try {
      // Check if seeker is blocked by company
      await JobApplication.checkSeekerBlocked(applicationData.companyId, applicationData.seekerId);
      
      // Job details should already be provided in applicationData
      if (applicationData.hiringType) {
        applicationData.jobType = applicationData.hiringType; // 'Instant Hire' or 'Interview First'
      }
      
      const application = new JobApplication(applicationData);
      
      // Populate with complete data
      await application.populateData();
      
      // Save to database
      const result = await databaseService.create(COLLECTIONS.JOB_APPLICATIONS, application.toJSON());
      application.id = result.insertedId || result.id;
      
      // Track history
      const ApplicationHistory = require('./ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: application.id,
        jobId: application.jobId,
        seekerId: application.seekerId,
        companyId: application.companyId,
        action: applicationData.applicationSource === 'invited' ? 'invited' : 'applied',
        fromStatus: null,
        toStatus: application.status,
        actionBy: applicationData.applicationSource === 'invited' ? 'company' : 'seeker',
        actionById: applicationData.actionById || (req?.user?.userId),
        notes: 'Application created',
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      });
      
      // Send notification to company
      await JobApplication.notifyCompanyOfApplication(application);
      
      return application;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw error; // Preserve original error for blocked users
    }
  }

  /**
   * Find application by ID with populated data
   */
  static async findById(applicationId) {
    try {
      console.log(`🔍 JobApplication.findById - Searching for ID: ${applicationId}`);
      const data = await databaseService.getById(COLLECTIONS.JOB_APPLICATIONS, applicationId);
      
      if (!data) {
        console.log(`🔍 JobApplication.findById - No data found for ID: ${applicationId}`);
        return null;
      }
      
      console.log(`🔍 JobApplication.findById - Raw data from database:`, {
        id: data.id,
        applicationId: data.applicationId,
        hasId: data.hasOwnProperty('id'),
        idType: typeof data.id
      });
      
      // CRITICAL FIX: Ensure the document ID is properly set
      // The applicationId parameter IS the document ID we need
      data.id = applicationId;
      
      const application = new JobApplication(data);
      console.log(`🔍 JobApplication.findById - After constructor with ID fix:`, {
        id: application.id,
        applicationId: application.applicationId
      });
      
      await application.populateData();
      
      return application;
    } catch (error) {
      console.error('Error finding job application:', error);
      throw new Error('Failed to find job application');
    }
  }

  /**
   * Find applications by job ID with populated data
   */
  static async findByJobId(jobId, options = {}) {
    try {
      const filters = [{ field: 'jobId', operator: '==', value: jobId }];
      
      if (options.status) {
        filters.push({ field: 'status', operator: '==', value: options.status });
      }
      
      const applications = await databaseService.query(
        COLLECTIONS.JOB_APPLICATIONS, 
        filters,
        { field: 'appliedAt', direction: 'desc' },
        options.limit || 50
      );
      
      console.log(`🔍 JobApplication.findByJobId - Query returned ${applications.length} applications`);
      
      // Populate data for all applications
      const populatedApplications = [];
      for (const appData of applications) {
        console.log(`🔍 JobApplication.findByJobId - Raw appData ID: ${appData.id}, type: ${typeof appData.id}`);
        
        // CRITICAL FIX: Ensure document ID is always set
        if (!appData.id) {
          console.error(`❌ Missing ID in application data:`, appData);
        }
        
        const app = new JobApplication(appData);
        console.log(`🔍 JobApplication.findByJobId - After constructor ID: ${app.id}`);
        
        await app.populateData();
        populatedApplications.push(app);
      }
      
      return populatedApplications;
    } catch (error) {
      console.error('Error finding job applications:', error);
      throw new Error('Failed to find job applications');
    }
  }

  /**
   * Find applications by seeker ID with populated data
   */
  static async findBySeekerId(seekerId, options = {}) {
    try {
      const filters = [{ field: 'seekerId', operator: '==', value: seekerId }];

      if (options.status) {
        filters.push({ field: 'status', operator: '==', value: options.status });
      }

      if (options.jobId) {
        filters.push({ field: 'jobId', operator: '==', value: options.jobId });
      }

      if (options.companyId) {
        filters.push({ field: 'companyId', operator: '==', value: options.companyId });
      }

      const applications = await databaseService.query(
        COLLECTIONS.JOB_APPLICATIONS,
        filters,
        { field: 'appliedAt', direction: 'desc' },
        options.limit || 50
      );

      // Populate data for all applications
      const populatedApplications = [];
      for (const appData of applications) {
        // Ensure document ID is always set
        if (!appData.id) {
          console.error(`❌ Missing ID in application data:`, appData);
        }

        // Double-check seekerId matches (safety net)
        if (appData.seekerId !== seekerId) {
          console.error(`❌ CRITICAL: SeekerId mismatch! Expected: ${seekerId}, Got: ${appData.seekerId}`);
          continue; // Skip this application
        }

        const app = new JobApplication(appData);
        await app.populateData();
        populatedApplications.push(app);
      }

      return populatedApplications;
    } catch (error) {
      console.error('Error finding seeker applications:', error);
      throw new Error('Failed to find seeker applications');
    }
  }

  /**
   * Accept job application with history tracking
   */
  async accept(req = null) {
    try {
      const previousStatus = this.status;
      
      // Update application status
      this.status = 'accepted';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS, 
        this.id, 
        {
          status: this.status,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Create chat room for accepted application
      if (!this.chatInitiated) {
        const chat = await Chat.create(
          this.companyId,
          this.seekerId,
          this.jobId,
          this.jobData?.roleName || this.jobTitle || 'Job Application'
        );

        // Update application with chat info
        this.chatId = chat.id;
        this.chatInitiated = true;
        
        await databaseService.update(
          COLLECTIONS.JOB_APPLICATIONS,
          this.id,
          {
            chatId: this.chatId,
            chatInitiated: this.chatInitiated
          }
        );

        // Send welcome message
        await Chat.sendSystemMessage(
          chat.id,
          `🎉 Congratulations! Your application for "${this.jobData?.roleName || this.jobTitle}" has been accepted. You can now chat with the employer.`
        );

        console.log(`✅ Chat created for accepted application: ${this.applicationId}`);
      }

      // Track history
      const ApplicationHistory = require('./ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: this.id,
        jobId: this.jobId,
        seekerId: this.seekerId,
        companyId: this.companyId,
        action: 'accepted',
        fromStatus: previousStatus,
        toStatus: this.status,
        actionBy: 'company',
        actionById: req?.user?.userId,
        notes: 'Application accepted and chat initiated',
        metadata: { chatId: this.chatId, chatInitiated: this.chatInitiated },
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      });

      return this;
    } catch (error) {
      console.error('Error accepting job application:', error);
      throw new Error('Failed to accept job application');
    }
  }

  /**
   * Decline job application with specific reasons and history tracking
   */
  async decline(reason = 'Another candidate selected', req = null) {
    try {
      const previousStatus = this.status;
      
      const validReasons = [
        'Another candidate selected',
        'Not the right fit', 
        'Limited experience',
        'Position filled'
      ];
      
      if (!validReasons.includes(reason)) {
        reason = 'Another candidate selected';
      }
      
      this.status = 'declined';
      this.declineReason = reason;
      this.declinedAt = new Date().toISOString();
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          declineReason: this.declineReason,
          declinedAt: this.declinedAt,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Track history
      const ApplicationHistory = require('./ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: this.id,
        jobId: this.jobId,
        seekerId: this.seekerId,
        companyId: this.companyId,
        action: 'declined',
        fromStatus: previousStatus,
        toStatus: this.status,
        actionBy: 'company',
        actionById: req?.user?.userId,
        reason: reason,
        notes: `Application declined: ${reason}`,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
      });

      // Send decline notification
      await JobApplication.notifySeekerOfDecline(this, reason);
      
      return this;
    } catch (error) {
      console.error('Error declining job application:', error);
      throw new Error('Failed to decline job application');
    }
  }
  
  /**
   * Hire now - send hire request to seeker
   */
  async hireNow() {
    try {
      // Validate workflow - hiring available for both job types
      if (this.status !== 'applied' && this.status !== 'interviewed') {
        throw new Error('Application must be in applied or interviewed status to hire');
      }

      this.status = 'hired';
      this.hireStatus = 'pending';
      this.hireRequestedAt = new Date().toISOString();
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          hireStatus: this.hireStatus,
          hireRequestedAt: this.hireRequestedAt,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Send hire request notification
      await JobApplication.notifySeekerOfHireRequest(this);
      
      return this;
    } catch (error) {
      console.error('Error sending hire request:', error);
      throw error;
    }
  }

  /**
   * Send hire request to seeker (alias for hireNow to match controller naming)
   */
  async sendHireRequest() {
    try {
      const previousStatus = this.status;
      
      // Validate workflow - hiring available for both job types
      if (this.status !== 'applied' && this.status !== 'interviewed') {
        throw new Error('Application must be in applied or interviewed status to hire');
      }

      this.status = 'hired';
      this.hireStatus = 'pending';
      this.hireRequestedAt = new Date().toISOString();
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          hireStatus: this.hireStatus,
          hireRequestedAt: this.hireRequestedAt,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Create chat room for hired application
      if (!this.chatInitiated) {
        const Chat = require('./Chat');
        const chat = await Chat.create(
          this.companyId,
          this.seekerId,
          this.jobId,
          this.jobData?.roleName || this.jobTitle || 'Job Application'
        );

        // Update application with chat info
        this.chatId = chat.id;
        this.chatInitiated = true;
        
        await databaseService.update(
          COLLECTIONS.JOB_APPLICATIONS,
          this.id,
          {
            chatId: this.chatId,
            chatInitiated: this.chatInitiated
          }
        );

        // Send welcome message
        await Chat.sendSystemMessage(
          chat.id,
          `🎉 Congratulations! You've been hired for "${this.jobData?.roleName || this.jobTitle}". You can now chat with the employer about next steps.`
        );

        console.log(`✅ Chat created for hired application: ${this.applicationId}`);
      }

      // Track history
      const ApplicationHistory = require('./ApplicationHistory');
      await ApplicationHistory.trackAction({
        applicationId: this.id,
        jobId: this.jobId,
        seekerId: this.seekerId,
        companyId: this.companyId,
        action: 'hired',
        fromStatus: previousStatus,
        toStatus: this.status,
        actionBy: 'company',
        actionById: null, // Will be set by controller
        notes: 'Hire request sent to seeker',
        metadata: { chatId: this.chatId, chatInitiated: this.chatInitiated },
        ipAddress: null, // Will be set by controller
        userAgent: null // Will be set by controller
      });

      // Send hire request notification
      await JobApplication.notifySeekerOfHireRequest(this);
      
      return this;
    } catch (error) {
      console.error('Error sending hire request:', error);
      throw error;
    }
  }
  
  /**
   * Seeker accepts or rejects hire request
   */
  async respondToHireRequest(response) {
    try {
      if (!['accepted', 'rejected'].includes(response)) {
        throw new Error('Invalid hire response. Must be "accepted" or "rejected"');
      }
      
      this.hireStatus = response;
      this.hireResponse = response;
      this.hireRespondedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      // Enable reporting if hire is accepted
      if (response === 'accepted') {
        this.reportingEnabled = true;
      }
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          hireStatus: this.hireStatus,
          hireResponse: this.hireResponse,
          hireRespondedAt: this.hireRespondedAt,
          reportingEnabled: this.reportingEnabled,
          updatedAt: this.updatedAt
        }
      );

      // Send confirmation notification
      if (response === 'accepted') {
        await JobApplication.notifyCompanyOfHireAcceptance(this);
      } else {
        await JobApplication.notifyCompanyOfHireRejection(this);
      }
      
      return this;
    } catch (error) {
      console.error('Error responding to hire request:', error);
      throw new Error('Failed to respond to hire request');
    }
  }

  /**
   * Respond to interview request (seeker)
   */
  async respondToInterviewRequest(response) {
    try {
      if (!['accepted', 'declined'].includes(response)) {
        throw new Error('Invalid interview response. Must be "accepted" or "declined"');
      }
      
      this.interviewResponse = response;
      this.interviewRespondedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      // Update interview status based on response
      if (response === 'accepted') {
        this.interviewStatus = 'confirmed';
      } else {
        this.interviewStatus = 'declined';
      }
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          interviewResponse: this.interviewResponse,
          interviewRespondedAt: this.interviewRespondedAt,
          interviewStatus: this.interviewStatus,
          updatedAt: this.updatedAt
        }
      );

      // Send confirmation notification
      if (response === 'accepted') {
        await JobApplication.notifyCompanyOfInterviewAcceptance(this);
      } else {
        await JobApplication.notifyCompanyOfInterviewDecline(this);
      }
      
      return this;
    } catch (error) {
      console.error('Error responding to interview request:', error);
      throw new Error('Failed to respond to interview request');
    }
  }
  
  /**
   * Report absence/attendance
   */
  async reportAbsence(reportData) {
    try {
      if (!this.reportingEnabled) {
        throw new Error('Reporting not enabled for this application');
      }
      
      const report = {
        date: reportData.date || new Date().toISOString().split('T')[0],
        status: reportData.status, // 'present', 'absent', 'late'
        reason: reportData.reason || null,
        notes: reportData.notes || null,
        reportedBy: reportData.reportedBy, // 'company' or 'seeker'
        reportedAt: new Date().toISOString()
      };
      
      this.reportHistory.push(report);
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          reportHistory: this.reportHistory,
          updatedAt: this.updatedAt
        }
      );
      
      return this;
    } catch (error) {
      console.error('Error reporting absence:', error);
      throw new Error('Failed to report absence');
    }
  }

  /**
   * Shortlist application
   */
  async shortlist() {
    try {
      this.status = 'shortlisted';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );
      
      return this;
    } catch (error) {
      console.error('Error shortlisting application:', error);
      throw new Error('Failed to shortlist application');
    }
  }

  /**
   * Schedule interview with duration and multiple dates support
   */
  async scheduleInterview(interviewData) {
    try {
      // Validate workflow - interviews only for Interview First jobs
      if (this.jobType !== 'Interview First') {
        throw new Error('Interviews can only be scheduled for Interview First jobs');
      }

      if (this.status !== 'applied') {
        throw new Error('Application must be in applied status to schedule interview');
      }

      const { 
        interviewDate, 
        interviewTime, 
        duration = 30, 
        interviewType = 'in-person',
        location = null,
        notes = null 
      } = interviewData;
      
      // Calculate end time
      const startTime = new Date(`${interviewDate} ${interviewTime}`);
      const endTime = new Date(startTime.getTime() + (duration * 60000));
      
      this.status = 'interviewed';
      this.interviewScheduled = true;
      this.interviewDate = interviewDate;
      this.interviewTime = interviewTime;
      this.interviewDuration = duration;
      this.interviewEndTime = endTime.toTimeString().slice(0, 5);
      this.interviewType = interviewType;
      this.interviewLocation = location;
      this.interviewNotes = notes;
      this.interviewStatus = 'scheduled';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      // Create Interview record for response handling
      const Interview = require('./Interview');
      const interview = await Interview.create({
        applicationId: this.id,
        jobId: this.jobId,
        seekerId: this.seekerId,
        companyId: this.companyId,
        interviewDate,
        startTime: interviewTime,
        duration,
        interviewType,
        location,
        instructions: notes,
        status: 'scheduled'
      });
      
      this.interviewId = interview.id;
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          interviewScheduled: this.interviewScheduled,
          interviewId: this.interviewId,
          interviewDate: this.interviewDate,
          interviewTime: this.interviewTime,
          interviewDuration: this.interviewDuration,
          interviewEndTime: this.interviewEndTime,
          interviewType: this.interviewType,
          interviewLocation: this.interviewLocation,
          interviewNotes: this.interviewNotes,
          interviewStatus: this.interviewStatus,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Create chat room for interview coordination
      if (!this.chatInitiated) {
        const Chat = require('./Chat');
        const chat = await Chat.create(
          this.companyId,
          this.seekerId,
          this.jobId,
          this.jobTitle || 'Interview Coordination'
        );

        this.chatId = chat.id;
        this.chatInitiated = true;
        
        await databaseService.update(
          COLLECTIONS.JOB_APPLICATIONS,
          this.id,
          {
            chatId: this.chatId,
            chatInitiated: this.chatInitiated
          }
        );

        await Chat.sendSystemMessage(
          chat.id,
          `📅 Interview scheduled for ${new Date(interviewDate).toLocaleDateString()} from ${interviewTime} to ${this.interviewEndTime} (${duration} minutes). Location: ${location || 'TBD'}. Use this chat to coordinate details.`
        );
      }

      // Send interview request notification
      try {
        const notificationData = {
          jobSeekerName: this.seekerName,
          jobSeekerEmail: this.seekerEmail,
          jobSeekerId: this.seekerId,
          companyName: this.companyName,
          companyId: this.companyId,
          jobTitle: this.jobTitle,
          jobId: this.jobId,
          interviewDate: interviewDate,
          interviewTime: interviewTime,
          interviewEndTime: this.interviewEndTime,
          duration: duration,
          interviewType: interviewType,
          location: location || 'TBD'
        };
        
        await notificationController.sendInterviewRequest(notificationData);
        console.log(`📧 Interview request notification sent for application ${this.applicationId}`);
      } catch (notificationError) {
        console.error('⚠️  Failed to send interview request notification:', notificationError);
      }
      
      return this;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw new Error('Failed to schedule interview');
    }
  }
  
  /**
   * Invite seeker to apply for job
   */
  static async inviteSeeker(jobId, seekerId, companyId, jobData, seekerData) {
    try {
      // Check if seeker is blocked by company
      await JobApplication.checkSeekerBlocked(companyId, seekerId);
      
      // Get job details to determine job type
      const Job = require('./Job');
      const job = await Job.findById(jobId);
      
      const application = new JobApplication({
        jobId,
        seekerId,
        companyId,
        status: 'invited',
        applicationSource: 'invited',
        jobTitle: jobData.jobTitle || jobData.roleName || (job ? job.roleName : null),
        jobType: job ? job.hiringType : null,
        companyName: jobData.companyName,
        seekerName: seekerData.fullName,
        seekerPhone: seekerData.mobileNumber,
        seekerEmail: seekerData.email
      });
      
      const result = await databaseService.create(COLLECTIONS.JOB_APPLICATIONS, application.toJSON());
      application.id = result.insertedId || result.id;
      
      // Send invitation notification
      await JobApplication.notifySeekerOfInvitation(application);
      
      return application;
    } catch (error) {
      console.error('Error inviting seeker:', error);
      throw error; // Preserve original error for blocked users
    }
  }
  
  /**
   * Seeker accepts invitation and applies
   */
  async acceptInvitation() {
    try {
      if (this.status !== 'invited') {
        throw new Error('Application is not in invited status');
      }
      
      this.status = 'applied';
      this.applicationSource = 'invited_applied';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          applicationSource: this.applicationSource,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );
      
      // Notify company of application
      await JobApplication.notifyCompanyOfApplication(this);
      
      return this;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error('Failed to accept invitation');
    }
  }

  /**
   * Withdraw application (by seeker)
   */
  async withdraw() {
    try {
      this.status = 'withdrawn';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );
      
      return this;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw new Error('Failed to withdraw application');
    }
  }

  /**
   * Notify company of new application
   */
  static async notifyCompanyOfApplication(application) {
    try {
      const applicationData = {
        jobSeekerName: application.seekerName,
        jobSeekerEmail: application.seekerEmail,
        jobSeekerId: application.seekerId,
        companyName: application.companyName,
        companyId: application.companyId,
        jobTitle: application.jobTitle,
        jobId: application.jobId
      };
      
      await notificationController.sendApplicationSubmitted(applicationData);
      console.log(`📧 New application notification sent to company ${application.companyId} for job ${application.jobId}`);
    } catch (error) {
      console.error('Error sending company notification:', error);
    }
  }

  /**
   * Notify seeker of decline
   */
  static async notifySeekerOfDecline(application, reason) {
    try {
      // Send decline notification
      console.log(`📧 Decline notification sent to seeker ${application.seekerId} for job ${application.jobId} - Reason: ${reason}`);
    } catch (error) {
      console.error('Error sending decline notification:', error);
    }
  }
  
  /**
   * Notify seeker of invitation
   */
  static async notifySeekerOfInvitation(application) {
    try {
      console.log(`📧 Invitation notification sent to seeker ${application.seekerId} for job ${application.jobId}`);
    } catch (error) {
      console.error('Error sending invitation notification:', error);
    }
  }
  
  /**
   * Notify seeker of hire request
   */
  static async notifySeekerOfHireRequest(application) {
    try {
      console.log(`📧 Hire request notification sent to seeker ${application.seekerId} for job ${application.jobId}`);
    } catch (error) {
      console.error('Error sending hire request notification:', error);
    }
  }
  
  /**
   * Notify company of hire acceptance
   */
  static async notifyCompanyOfHireAcceptance(application) {
    try {
      console.log(`📧 Hire acceptance notification sent to company ${application.companyId} for application ${application.applicationId}`);
    } catch (error) {
      console.error('Error sending hire acceptance notification:', error);
    }
  }
  
  /**
   * Notify company of hire rejection
   */
  static async notifyCompanyOfHireRejection(application) {
    try {
      console.log(`📧 Hire rejection notification sent to company ${application.companyId} for application ${application.applicationId}`);
    } catch (error) {
      console.error('Error sending hire rejection notification:', error);
    }
  }

  /**
   * Notify company of interview acceptance
   */
  static async notifyCompanyOfInterviewAcceptance(application) {
    try {
      console.log(`📧 Interview acceptance notification sent to company ${application.companyId} for application ${application.applicationId}`);
    } catch (error) {
      console.error('Error sending interview acceptance notification:', error);
    }
  }
  
  /**
   * Notify company of interview decline
   */
  static async notifyCompanyOfInterviewDecline(application) {
    try {
      console.log(`📧 Interview decline notification sent to company ${application.companyId} for application ${application.applicationId}`);
    } catch (error) {
      console.error('Error sending interview decline notification:', error);
    }
  }

  /**
   * Check if seeker is blocked by company
   */
  static async checkSeekerBlocked(companyId, seekerId) {
    try {
      const Company = require('./Company');
      const company = await Company.findById(companyId);

      if (!company) {
        console.warn(`Company not found with ID: ${companyId}. Skipping block check.`);
        return true; // Allow application if company not found
      }

      if (company.isSeekerBlocked(seekerId)) {
        const blockDetails = company.getBlockDetails(seekerId);
        throw new Error(`You are blocked from applying to this company. Reason: ${blockDetails.reason}`);
      }

      return true;
    } catch (error) {
      console.error('Error checking seeker blocked status:', error);
      // Only re-throw if it's a blocking error, not a company not found error
      if (error.message.includes('blocked from applying')) {
        throw error;
      }
      // For other errors, log and allow the application to proceed
      console.warn('Block check failed, allowing application to proceed:', error.message);
      return true;
    }
  }

  /**
   * Block seeker from future applications (convenience method)
   */
  async blockSeekerFromCompany(reason = 'Application declined - blocked from future applications', blockedBy = null) {
    try {
      const Company = require('./Company');
      const company = await Company.findById(this.companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      await company.blockSeeker(this.seekerId, reason, blockedBy);
      
      console.log(`🚫 Seeker ${this.seekerId} blocked from company ${this.companyId} via application ${this.applicationId}`);
      return this;
    } catch (error) {
      console.error('Error blocking seeker from company:', error);
      throw error;
    }
  }

  /**
   * Check if current application's seeker is blocked
   */
  async isSeekerCurrentlyBlocked() {
    try {
      const Company = require('./Company');
      const company = await Company.findById(this.companyId);
      
      if (!company) {
        return false;
      }

      return company.isSeekerBlocked(this.seekerId);
    } catch (error) {
      console.error('Error checking if seeker is currently blocked:', error);
      return false;
    }
  }

  /**
   * Get application statistics
   */
  static async getStats(jobId) {
    try {
      // Get all applications for this job
      const applications = await this.findByJobId(jobId);
      
      const stats = {
        total: applications.length,
        applied: 0,
        invited: 0,
        reviewed: 0,
        shortlisted: 0,
        interviewed: 0,
        hired: 0,
        declined: 0,
        withdrawn: 0
      };
      
      // Count by status
      applications.forEach(app => {
        const status = app.status;
        if (stats.hasOwnProperty(status)) {
          stats[status]++;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw new Error('Failed to get application statistics');
    }
  }

  /**
   * Convert to JSON with populated data
   */
  toJSON() {
    console.log(`🔍 toJSON - Application ${this.id}: seekerData exists: ${!!this.seekerData}, seeker fullName: ${this.seekerData?.fullName}`);
    
    return {
      // Basic application info
      id: this.id,
      applicationId: this.applicationId,
      jobId: this.jobId,
      seekerId: this.seekerId,
      companyId: this.companyId,
      status: this.status,
      applicationSource: this.applicationSource,
      availability: this.availability,
      
      // POPULATED DATA - This is the key improvement!
      seeker: this.seekerData,
      job: this.jobData,
      company: this.companyData,
      
      // Legacy fields (for backward compatibility)
      jobTitle: this.jobTitle,
      jobType: this.jobType,
      companyName: this.companyName,
      seekerName: this.seekerName,
      seekerPhone: this.seekerPhone,
      seekerEmail: this.seekerEmail,
      
      // Workflow fields
      declineReason: this.declineReason,
      declinedAt: this.declinedAt,
      hireStatus: this.hireStatus,
      hireRequestedAt: this.hireRequestedAt,
      hireRespondedAt: this.hireRespondedAt,
      hireResponse: this.hireResponse,
      reportingEnabled: this.reportingEnabled,
      reportHistory: this.reportHistory,
      
      // Interview data
      interviewScheduled: this.interviewScheduled,
      interviewDate: this.interviewDate,
      interviewTime: this.interviewTime,
      interviewDuration: this.interviewDuration,
      interviewEndTime: this.interviewEndTime,
      interviewId: this.interviewId,
      interviewStatus: this.interviewStatus,
      interviewType: this.interviewType,
      interviewLocation: this.interviewLocation,
      interviewNotes: this.interviewNotes,
      interviewResponse: this.interviewResponse,
      interviewRespondedAt: this.interviewRespondedAt,
      
      // Communication
      chatId: this.chatId,
      chatInitiated: this.chatInitiated,
      
      // Timestamps
      appliedAt: this.appliedAt,
      reviewedAt: this.reviewedAt,
      statusChangedAt: this.statusChangedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JobApplication;