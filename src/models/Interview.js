const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Interview Model - For detailed interview scheduling and management
 * Supports multiple interview slots, duration management, and scheduling conflicts
 */
class Interview {
  constructor(data = {}) {
    this.id = data.id || null;
    this.interviewId = data.interviewId || this.generateInterviewId();
    
    // Core interview data
    this.jobId = data.jobId || null;
    this.applicationId = data.applicationId || null;
    this.companyId = data.companyId || null;
    this.seekerId = data.seekerId || null;
    
    // Interview scheduling
    this.interviewDate = data.interviewDate || null; // YYYY-MM-DD
    this.startTime = data.startTime || null; // HH:MM (24-hour format)
    this.duration = data.duration || 30; // Duration in minutes
    this.endTime = data.endTime || this.calculateEndTime();
    this.timeZone = data.timeZone || 'Asia/Muscat'; // Default to Oman timezone
    
    // Interview details
    this.interviewType = data.interviewType || 'in-person'; // 'in-person', 'phone', 'video', 'group'
    this.location = data.location || null; // Physical location or video link
    this.meetingRoom = data.meetingRoom || null; // Specific room or area
    this.interviewer = data.interviewer || null; // Interviewer name/ID
    this.interviewerEmail = data.interviewerEmail || null;
    this.interviewerPhone = data.interviewerPhone || null;
    
    // Status and workflow
    this.status = data.status || 'scheduled'; // 'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'
    this.confirmationStatus = data.confirmationStatus || 'pending'; // 'pending', 'confirmed', 'declined'
    this.remindersSent = data.remindersSent || []; // Array of reminder timestamps
    
    // Additional scheduling options
    this.additionalDates = data.additionalDates || []; // Array of alternative date/time options
    this.rescheduleHistory = data.rescheduleHistory || []; // History of reschedules
    this.allowRescheduling = data.allowRescheduling !== false; // Allow candidate to reschedule
    this.maxReschedules = data.maxReschedules || 2; // Maximum reschedule attempts
    this.rescheduleCount = data.rescheduleCount || 0;
    
    // Interview preparation
    this.preparationMaterials = data.preparationMaterials || []; // Documents, links, etc.
    this.interviewQuestions = data.interviewQuestions || []; // Pre-prepared questions
    this.requiredDocuments = data.requiredDocuments || []; // Documents candidate should bring
    this.instructions = data.instructions || null; // Special instructions for candidate
    
    // Interview results
    this.completed = data.completed || false;
    this.completedAt = data.completedAt || null;
    this.rating = data.rating || null; // 1-5 rating
    this.feedback = data.feedback || null; // Interviewer feedback
    this.result = data.result || null; // 'pass', 'fail', 'pending'
    this.nextSteps = data.nextSteps || null; // What happens next
    
    // Contact and cached data
    this.jobTitle = data.jobTitle || null;
    this.companyName = data.companyName || null;
    this.seekerName = data.seekerName || null;
    this.seekerEmail = data.seekerEmail || null;
    this.seekerPhone = data.seekerPhone || null;
    
    // System fields
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.scheduledAt = data.scheduledAt || new Date().toISOString();
    this.scheduledBy = data.scheduledBy || null; // Who scheduled this interview
  }

  /**
   * Generate unique interview ID
   */
  generateInterviewId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `INT-${timestamp}${random}`.toUpperCase();
  }

  /**
   * Calculate end time based on start time and duration
   */
  calculateEndTime() {
    if (!this.interviewDate || !this.startTime) return null;
    
    const startDateTime = new Date(`${this.interviewDate} ${this.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + (this.duration * 60000));
    return endDateTime.toTimeString().slice(0, 5); // Return HH:MM format
  }

  /**
   * Create new interview
   */
  static async create(interviewData) {
    try {
      const interview = new Interview(interviewData);
      interview.endTime = interview.calculateEndTime();
      
      const result = await databaseService.create(COLLECTIONS.INTERVIEWS, interview.toJSON());
      interview.id = result.insertedId || result.id;
      
      // Send interview invitation
      await Interview.sendInterviewInvitation(interview);
      
      return interview;
    } catch (error) {
      console.error('Error creating interview:', error);
      throw new Error('Failed to create interview');
    }
  }

  /**
   * Find interview by ID
   */
  static async findById(interviewId) {
    try {
      const data = await databaseService.getById(COLLECTIONS.INTERVIEWS, interviewId);
      return data ? new Interview(data) : null;
    } catch (error) {
      console.error('Error finding interview:', error);
      throw new Error('Failed to find interview');
    }
  }

  /**
   * Find interviews by application ID
   */
  static async findByApplicationId(applicationId) {
    try {
      const interviews = await databaseService.query(COLLECTIONS.INTERVIEWS, [
        { field: 'applicationId', operator: '==', value: applicationId }
      ], { field: 'scheduledAt', direction: 'desc' });
      
      return interviews.map(interview => new Interview(interview));
    } catch (error) {
      console.error('Error finding interviews by application:', error);
      throw new Error('Failed to find interviews');
    }
  }

  /**
   * Find interviews by company and date range
   */
  static async findByCompanyAndDateRange(companyId, startDate, endDate) {
    try {
      const interviews = await databaseService.query(COLLECTIONS.INTERVIEWS, [
        { field: 'companyId', operator: '==', value: companyId },
        { field: 'interviewDate', operator: '>=', value: startDate },
        { field: 'interviewDate', operator: '<=', value: endDate }
      ], { field: 'interviewDate', direction: 'asc' });
      
      return interviews.map(interview => new Interview(interview));
    } catch (error) {
      console.error('Error finding interviews by company and date range:', error);
      throw new Error('Failed to find interviews');
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts() {
    try {
      // Check for overlapping interviews for the same company
      const conflicts = await databaseService.query(COLLECTIONS.INTERVIEWS, [
        { field: 'companyId', operator: '==', value: this.companyId },
        { field: 'interviewDate', operator: '==', value: this.interviewDate },
        { field: 'status', operator: 'in', value: ['scheduled', 'confirmed'] }
      ]);

      const conflictingInterviews = conflicts.filter(interview => {
        if (interview.id === this.id) return false; // Skip self
        
        const existingStart = new Date(`${interview.interviewDate} ${interview.startTime}`);
        const existingEnd = new Date(`${interview.interviewDate} ${interview.endTime}`);
        const newStart = new Date(`${this.interviewDate} ${this.startTime}`);
        const newEnd = new Date(`${this.interviewDate} ${this.endTime}`);
        
        // Check for time overlap
        return (newStart < existingEnd && newEnd > existingStart);
      });

      return conflictingInterviews.map(interview => new Interview(interview));
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  }

  /**
   * Schedule interview with conflict checking
   */
  async schedule() {
    try {
      // Check for conflicts
      const conflicts = await this.checkConflicts();
      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflict detected. ${conflicts.length} overlapping interview(s) found.`);
      }

      this.status = 'scheduled';
      this.endTime = this.calculateEndTime();
      this.scheduledAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        endTime: this.endTime,
        scheduledAt: this.scheduledAt,
        updatedAt: this.updatedAt
      });

      // Send notification
      await Interview.sendInterviewInvitation(this);
      
      return this;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      throw error;
    }
  }

  /**
   * Reschedule interview
   */
  async reschedule(newDate, newTime, reason = null) {
    try {
      if (this.rescheduleCount >= this.maxReschedules) {
        throw new Error('Maximum reschedule limit reached');
      }

      // Save old details to history
      const oldSchedule = {
        date: this.interviewDate,
        startTime: this.startTime,
        endTime: this.endTime,
        rescheduledAt: new Date().toISOString(),
        reason: reason
      };

      this.rescheduleHistory.push(oldSchedule);
      
      // Update with new schedule
      this.interviewDate = newDate;
      this.startTime = newTime;
      this.endTime = this.calculateEndTime();
      this.status = 'rescheduled';
      this.rescheduleCount += 1;
      this.updatedAt = new Date().toISOString();

      // Check for conflicts with new time
      const conflicts = await this.checkConflicts();
      if (conflicts.length > 0) {
        throw new Error('New time conflicts with existing interviews');
      }

      await this.update({
        interviewDate: this.interviewDate,
        startTime: this.startTime,
        endTime: this.endTime,
        status: this.status,
        rescheduleHistory: this.rescheduleHistory,
        rescheduleCount: this.rescheduleCount,
        updatedAt: this.updatedAt
      });

      // Send reschedule notification
      await Interview.sendRescheduleNotification(this, reason);
      
      return this;
    } catch (error) {
      console.error('Error rescheduling interview:', error);
      throw error;
    }
  }

  /**
   * Confirm interview (by candidate)
   */
  async confirm() {
    try {
      this.confirmationStatus = 'confirmed';
      this.status = 'confirmed';
      this.updatedAt = new Date().toISOString();

      await this.update({
        confirmationStatus: this.confirmationStatus,
        status: this.status,
        updatedAt: this.updatedAt
      });

      // Send confirmation notification
      await Interview.sendConfirmationNotification(this);
      
      return this;
    } catch (error) {
      console.error('Error confirming interview:', error);
      throw new Error('Failed to confirm interview');
    }
  }

  /**
   * Cancel interview
   */
  async cancel(reason = null) {
    try {
      this.status = 'cancelled';
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: this.updatedAt
      });

      // Send cancellation notification
      await Interview.sendCancellationNotification(this, reason);
      
      return this;
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw new Error('Failed to cancel interview');
    }
  }

  /**
   * Mark as completed with feedback
   */
  async complete(rating, feedback, result = 'pending', nextSteps = null) {
    try {
      this.status = 'completed';
      this.completed = true;
      this.completedAt = new Date().toISOString();
      this.rating = rating;
      this.feedback = feedback;
      this.result = result;
      this.nextSteps = nextSteps;
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        completed: this.completed,
        completedAt: this.completedAt,
        rating: this.rating,
        feedback: this.feedback,
        result: this.result,
        nextSteps: this.nextSteps,
        updatedAt: this.updatedAt
      });

      // Send completion notification
      await Interview.sendCompletionNotification(this);
      
      return this;
    } catch (error) {
      console.error('Error completing interview:', error);
      throw new Error('Failed to complete interview');
    }
  }

  /**
   * Mark as no-show
   */
  async markNoShow() {
    try {
      this.status = 'no_show';
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        noShowAt: new Date().toISOString(),
        updatedAt: this.updatedAt
      });

      // Send no-show notification
      await Interview.sendNoShowNotification(this);
      
      return this;
    } catch (error) {
      console.error('Error marking no-show:', error);
      throw new Error('Failed to mark no-show');
    }
  }

  /**
   * Send interview invitation
   */
  static async sendInterviewInvitation(interview) {
    try {
      console.log(`📧 Interview invitation sent for ${interview.interviewId} - ${interview.seekerName} on ${interview.interviewDate} at ${interview.startTime}`);
    } catch (error) {
      console.error('Error sending interview invitation:', error);
    }
  }

  /**
   * Send reschedule notification
   */
  static async sendRescheduleNotification(interview, reason) {
    try {
      console.log(`📧 Interview reschedule notification sent for ${interview.interviewId} - New date: ${interview.interviewDate} at ${interview.startTime}`);
    } catch (error) {
      console.error('Error sending reschedule notification:', error);
    }
  }

  /**
   * Send confirmation notification
   */
  static async sendConfirmationNotification(interview) {
    try {
      console.log(`📧 Interview confirmation notification sent for ${interview.interviewId} - Confirmed by candidate`);
    } catch (error) {
      console.error('Error sending confirmation notification:', error);
    }
  }

  /**
   * Send cancellation notification
   */
  static async sendCancellationNotification(interview, reason) {
    try {
      console.log(`📧 Interview cancellation notification sent for ${interview.interviewId} - Reason: ${reason || 'Not specified'}`);
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Send completion notification
   */
  static async sendCompletionNotification(interview) {
    try {
      console.log(`📧 Interview completion notification sent for ${interview.interviewId} - Result: ${interview.result}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  /**
   * Send no-show notification
   */
  static async sendNoShowNotification(interview) {
    try {
      console.log(`📧 Interview no-show notification sent for ${interview.interviewId} - Candidate did not attend`);
    } catch (error) {
      console.error('Error sending no-show notification:', error);
    }
  }

  /**
   * Get available time slots for a specific date
   */
  static async getAvailableTimeSlots(companyId, date, duration = 30) {
    try {
      // Get all interviews for the date
      const existingInterviews = await Interview.findByCompanyAndDateRange(companyId, date, date);
      
      // Define business hours (9 AM to 6 PM)
      const businessHours = {
        start: '09:00',
        end: '18:00'
      };

      const availableSlots = [];
      const startTime = new Date(`${date} ${businessHours.start}`);
      const endTime = new Date(`${date} ${businessHours.end}`);
      
      // Generate 30-minute slots
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotStart = currentTime.toTimeString().slice(0, 5);
        const slotEnd = new Date(currentTime.getTime() + (duration * 60000));
        
        if (slotEnd <= endTime) {
          // Check if slot conflicts with existing interviews
          const hasConflict = existingInterviews.some(interview => {
            const interviewStart = new Date(`${interview.interviewDate} ${interview.startTime}`);
            const interviewEnd = new Date(`${interview.interviewDate} ${interview.endTime}`);
            
            return (currentTime < interviewEnd && slotEnd > interviewStart);
          });

          if (!hasConflict) {
            availableSlots.push({
              startTime: slotStart,
              endTime: slotEnd.toTimeString().slice(0, 5),
              duration: duration
            });
          }
        }
        
        // Move to next 30-minute slot
        currentTime = new Date(currentTime.getTime() + (30 * 60000));
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return [];
    }
  }

  /**
   * Update interview
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update interview without ID');
      }

      const updatedInterview = await databaseService.update(COLLECTIONS.INTERVIEWS, this.id, updateData);
      Object.assign(this, updatedInterview);
      return this;
    } catch (error) {
      console.error('Error updating interview:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      interviewId: this.interviewId,
      jobId: this.jobId,
      applicationId: this.applicationId,
      companyId: this.companyId,
      seekerId: this.seekerId,
      
      // Scheduling
      interviewDate: this.interviewDate,
      startTime: this.startTime,
      duration: this.duration,
      endTime: this.endTime,
      timeZone: this.timeZone,
      
      // Details
      interviewType: this.interviewType,
      location: this.location,
      meetingRoom: this.meetingRoom,
      interviewer: this.interviewer,
      interviewerEmail: this.interviewerEmail,
      interviewerPhone: this.interviewerPhone,
      
      // Status
      status: this.status,
      confirmationStatus: this.confirmationStatus,
      remindersSent: this.remindersSent,
      
      // Rescheduling
      additionalDates: this.additionalDates,
      rescheduleHistory: this.rescheduleHistory,
      allowRescheduling: this.allowRescheduling,
      maxReschedules: this.maxReschedules,
      rescheduleCount: this.rescheduleCount,
      
      // Preparation
      preparationMaterials: this.preparationMaterials,
      interviewQuestions: this.interviewQuestions,
      requiredDocuments: this.requiredDocuments,
      instructions: this.instructions,
      
      // Results
      completed: this.completed,
      completedAt: this.completedAt,
      rating: this.rating,
      feedback: this.feedback,
      result: this.result,
      nextSteps: this.nextSteps,
      
      // Contact info
      jobTitle: this.jobTitle,
      companyName: this.companyName,
      seekerName: this.seekerName,
      seekerEmail: this.seekerEmail,
      seekerPhone: this.seekerPhone,
      
      // System fields
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      scheduledAt: this.scheduledAt,
      scheduledBy: this.scheduledBy
    };
  }
}

module.exports = Interview;