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
    
    // Application details
    this.status = data.status || 'applied'; // 'applied', 'invited', 'interviewed', 'hired', 'declined', 'withdrawn'
    this.applicationSource = data.applicationSource || 'applied'; // 'applied', 'invited'
    this.coverLetter = data.coverLetter || null; // Not used as per requirements
    this.expectedSalary = data.expectedSalary || null;
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
    this.interviewStatus = data.interviewStatus || null; // 'scheduled', 'completed', 'cancelled', 'no_show'
    this.interviewType = data.interviewType || 'in-person'; // 'in-person', 'phone', 'video'
    this.interviewLocation = data.interviewLocation || null;
    this.interviewNotes = data.interviewNotes || null;
    
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
   * Create new job application
   */
  static async create(applicationData) {
    try {
      // Check if seeker is blocked by company
      await JobApplication.checkSeekerBlocked(applicationData.companyId, applicationData.seekerId);
      
      // Get job details to determine job type
      const Job = require('./Job');
      const job = await Job.findById(applicationData.jobId);
      if (job) {
        applicationData.jobType = job.hiringType; // 'Instant Hire' or 'Interview First'
        applicationData.jobTitle = applicationData.jobTitle || job.roleName;
      }
      
      const application = new JobApplication(applicationData);
      
      // Save to database
      const result = await databaseService.create(COLLECTIONS.JOB_APPLICATIONS, application.toJSON());
      application.id = result.insertedId;
      
      // Send notification to company (implement as needed)
      await JobApplication.notifyCompanyOfApplication(application);
      
      return application;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw error; // Preserve original error for blocked users
    }
  }

  /**
   * Find application by ID
   */
  static async findById(applicationId) {
    try {
      const data = await databaseService.findById(COLLECTIONS.JOB_APPLICATIONS, applicationId);
      return data ? new JobApplication(data) : null;
    } catch (error) {
      console.error('Error finding job application:', error);
      throw new Error('Failed to find job application');
    }
  }

  /**
   * Find applications by job ID
   */
  static async findByJobId(jobId, options = {}) {
    try {
      const query = { jobId };
      if (options.status) {
        query.status = options.status;
      }
      
      const applications = await databaseService.find(COLLECTIONS.JOB_APPLICATIONS, query, {
        sort: { appliedAt: -1 },
        limit: options.limit || 50,
        skip: options.offset || 0
      });
      
      return applications.map(app => new JobApplication(app));
    } catch (error) {
      console.error('Error finding job applications:', error);
      throw new Error('Failed to find job applications');
    }
  }

  /**
   * Find applications by seeker ID
   */
  static async findBySeekerId(seekerId, options = {}) {
    try {
      const query = { seekerId };
      if (options.status) {
        query.status = options.status;
      }
      
      const applications = await databaseService.find(COLLECTIONS.JOB_APPLICATIONS, query, {
        sort: { appliedAt: -1 },
        limit: options.limit || 50,
        skip: options.offset || 0
      });
      
      return applications.map(app => new JobApplication(app));
    } catch (error) {
      console.error('Error finding seeker applications:', error);
      throw new Error('Failed to find seeker applications');
    }
  }

  /**
   * Accept job application - TRIGGER CHAT CREATION
   */
  async accept() {
    try {
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
          this.jobTitle || 'Job Application'
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
          `🎉 Congratulations! Your application for "${this.jobTitle}" has been accepted. You can now chat with the employer.`
        );

        console.log(`✅ Chat created for accepted application: ${this.applicationId}`);
      }

      return this;
    } catch (error) {
      console.error('Error accepting job application:', error);
      throw new Error('Failed to accept job application');
    }
  }

  /**
   * Decline job application with specific reasons
   */
  async decline(reason = 'Another candidate selected') {
    try {
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
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          interviewScheduled: this.interviewScheduled,
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
   * Check if seeker is blocked by company
   */
  static async checkSeekerBlocked(companyId, seekerId) {
    try {
      const Company = require('./Company');
      const company = await Company.findById(companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      if (company.isSeekerBlocked(seekerId)) {
        const blockDetails = company.getBlockDetails(seekerId);
        throw new Error(`You are blocked from applying to this company. Reason: ${blockDetails.reason}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error checking seeker blocked status:', error);
      throw error;
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
      const pipeline = [
        { $match: { jobId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ];
      
      const results = await databaseService.aggregate(COLLECTIONS.JOB_APPLICATIONS, pipeline);
      
      const stats = {
        total: 0,
        applied: 0,
        invited: 0,
        reviewed: 0,
        shortlisted: 0,
        interviewed: 0,
        hired: 0,
        declined: 0,
        withdrawn: 0
      };
      
      results.forEach(result => {
        stats[result._id] = result.count;
        stats.total += result.count;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw new Error('Failed to get application statistics');
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      applicationId: this.applicationId,
      jobId: this.jobId,
      seekerId: this.seekerId,
      companyId: this.companyId,
      status: this.status,
      coverLetter: this.coverLetter,
      expectedSalary: this.expectedSalary,
      availability: this.availability,
      jobTitle: this.jobTitle,
      jobType: this.jobType,
      companyName: this.companyName,
      seekerName: this.seekerName,
      seekerPhone: this.seekerPhone,
      seekerEmail: this.seekerEmail,
      interviewScheduled: this.interviewScheduled,
      interviewDate: this.interviewDate,
      interviewTime: this.interviewTime,
      interviewStatus: this.interviewStatus,
      chatId: this.chatId,
      chatInitiated: this.chatInitiated,
      appliedAt: this.appliedAt,
      reviewedAt: this.reviewedAt,
      statusChangedAt: this.statusChangedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JobApplication;