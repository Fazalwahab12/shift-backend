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
    this.status = data.status || 'applied'; // 'applied', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected', 'withdrawn'
    this.coverLetter = data.coverLetter || null;
    this.expectedSalary = data.expectedSalary || null;
    this.availability = data.availability || null;
    
    // Job details (cached for quick access)
    this.jobTitle = data.jobTitle || null;
    this.companyName = data.companyName || null;
    this.seekerName = data.seekerName || null;
    this.seekerPhone = data.seekerPhone || null;
    this.seekerEmail = data.seekerEmail || null;
    
    // Interview scheduling (for Interview First jobs)
    this.interviewScheduled = data.interviewScheduled || false;
    this.interviewDate = data.interviewDate || null;
    this.interviewTime = data.interviewTime || null;
    this.interviewStatus = data.interviewStatus || null; // 'scheduled', 'completed', 'cancelled'
    
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
      const application = new JobApplication(applicationData);
      
      // Save to database
      const result = await databaseService.create(COLLECTIONS.JOB_APPLICATIONS, application.toJSON());
      application.id = result.insertedId;
      
      // Send notification to company (implement as needed)
      await JobApplication.notifyCompanyOfApplication(application);
      
      return application;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw new Error('Failed to create job application');
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
   * Reject job application
   */
  async reject(reason = null) {
    try {
      this.status = 'rejected';
      this.statusChangedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
      
      await databaseService.update(
        COLLECTIONS.JOB_APPLICATIONS,
        this.id,
        {
          status: this.status,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt,
          rejectionReason: reason
        }
      );

      // Send rejection notification (implement as needed)
      await JobApplication.notifySeekerOfRejection(this, reason);
      
      return this;
    } catch (error) {
      console.error('Error rejecting job application:', error);
      throw new Error('Failed to reject job application');
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
   * Schedule interview
   */
  async scheduleInterview(interviewDate, interviewTime) {
    try {
      this.status = 'interviewed';
      this.interviewScheduled = true;
      this.interviewDate = interviewDate;
      this.interviewTime = interviewTime;
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
          interviewStatus: this.interviewStatus,
          statusChangedAt: this.statusChangedAt,
          updatedAt: this.updatedAt
        }
      );

      // Create chat room for interview coordination
      if (!this.chatInitiated) {
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
          `📅 Interview scheduled for ${new Date(interviewDate).toLocaleDateString()} at ${interviewTime}. Use this chat to coordinate details.`
        );
      }

      // Send interview request notification
      try {
        const interviewData = {
          jobSeekerName: this.seekerName,
          jobSeekerEmail: this.seekerEmail,
          jobSeekerId: this.seekerId,
          companyName: this.companyName,
          companyId: this.companyId,
          jobTitle: this.jobTitle,
          jobId: this.jobId,
          interviewDate: interviewDate,
          location: location || 'TBD'
        };
        
        await notificationController.sendInterviewRequest(interviewData);
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
   * Notify seeker of rejection
   */
  static async notifySeekerOfRejection(application, reason) {
    try {
      // Implement push notification or email notification
      console.log(`📧 Rejection notification sent to seeker ${application.seekerId} for job ${application.jobId}`);
    } catch (error) {
      console.error('Error sending rejection notification:', error);
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
        reviewed: 0,
        shortlisted: 0,
        interviewed: 0,
        accepted: 0,
        rejected: 0,
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