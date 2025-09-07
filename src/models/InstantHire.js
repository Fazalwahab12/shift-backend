const { databaseService, COLLECTIONS } = require('../config/database');
const notificationController = require('../controllers/notificationController');

/**
 * InstantHire Model - Track instant hire transactions and history
 * Handles payment processing, matching, and completion tracking
 */
class InstantHire {
  constructor(data = {}) {
    this.id = data.id || null;
    this.instantHireId = data.instantHireId || this.generateInstantHireId();
    
    // Core instant hire data
    this.jobId = data.jobId || null;
    this.applicationId = data.applicationId || null;
    this.companyId = data.companyId || null;
    this.seekerId = data.seekerId || null;
    
    // Job and company details (cached for quick access)
    this.jobTitle = data.jobTitle || null;
    this.companyName = data.companyName || null;
    this.brandName = data.brandName || null;
    this.seekerName = data.seekerName || null;
    this.seekerEmail = data.seekerEmail || null;
    this.seekerPhone = data.seekerPhone || null;
    
    // Financial details
    this.payPerHour = data.payPerHour || 0; // OMR per hour
    this.hoursPerDay = data.hoursPerDay || 8;
    this.totalDays = data.totalDays || 1;
    this.totalHours = data.totalHours || (this.hoursPerDay * this.totalDays);
    this.totalAmount = data.totalAmount || (this.payPerHour * this.totalHours);
    this.paymentTerms = data.paymentTerms || 'end_of_shift'; // 'end_of_shift', 'weekly', 'monthly'
    
    // Schedule details
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.workingDays = data.workingDays || []; // Array of working days
    this.shiftType = data.shiftType || 'Morning'; // Morning, Afternoon, Evening, Night
    this.startTime = data.startTime || '09:00';
    this.endTime = data.endTime || '17:00';
    
    // Location and requirements
    this.workLocation = data.workLocation || null;
    this.locationAddress = data.locationAddress || null;
    this.locationCoordinates = data.locationCoordinates || null;
    this.requirements = data.requirements || []; // Array of job requirements
    this.dressCode = data.dressCode || null;
    
    // Transaction status and workflow
    this.status = data.status || 'pending_payment'; // 'pending_payment', 'paid', 'matched', 'started', 'in_progress', 'completed', 'cancelled', 'refunded'
    this.paymentStatus = data.paymentStatus || 'pending'; // 'pending', 'paid', 'failed', 'refunded'
    this.matchStatus = data.matchStatus || 'pending'; // 'pending', 'matched', 'accepted', 'declined', 'started'
    
    // Payment details
    this.paymentMethod = data.paymentMethod || null; // 'card', 'bank_transfer', 'wallet'
    this.transactionId = data.transactionId || null;
    this.paymentReference = data.paymentReference || null;
    this.paidAt = data.paidAt || null;
    this.paymentAmount = data.paymentAmount || this.totalAmount;
    this.serviceFee = data.serviceFee || 0; // Platform service fee
    this.totalPayment = data.totalPayment || (this.paymentAmount + this.serviceFee);
    
    // Matching and acceptance
    this.matchedAt = data.matchedAt || null;
    this.seekerAcceptedAt = data.seekerAcceptedAt || null;
    this.seekerDeclinedAt = data.seekerDeclinedAt || null;
    this.declineReason = data.declineReason || null;
    
    // Work execution tracking
    this.workStartedAt = data.workStartedAt || null;
    this.workCompletedAt = data.workCompletedAt || null;
    this.actualHoursWorked = data.actualHoursWorked || 0;
    this.attendanceRecords = data.attendanceRecords || []; // Daily attendance tracking
    
    // Completion and feedback
    this.completionStatus = data.completionStatus || 'pending'; // 'pending', 'completed', 'incomplete', 'cancelled'
    this.companyFeedback = data.companyFeedback || null;
    this.seekerFeedback = data.seekerFeedback || null;
    this.companyRating = data.companyRating || null; // 1-5
    this.seekerRating = data.seekerRating || null; // 1-5
    
    // Payment completion
    this.finalPaymentAmount = data.finalPaymentAmount || null; // Actual amount paid to seeker
    this.finalPaymentDate = data.finalPaymentDate || null;
    this.finalPaymentStatus = data.finalPaymentStatus || 'pending'; // 'pending', 'paid', 'failed'
    this.finalPaymentReference = data.finalPaymentReference || null;
    
    // System fields
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy || null; // userId who created this instant hire
    
    // Additional tracking
    this.chatId = data.chatId || null; // Link to chat between company and seeker
    this.notificationsSent = data.notificationsSent || [];
    this.reminders = data.reminders || [];
  }

  /**
   * Generate unique instant hire ID
   */
  generateInstantHireId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `IH-${timestamp}${random}`.toUpperCase();
  }

  /**
   * Create new instant hire transaction
   */
  static async create(instantHireData) {
    try {
      const instantHire = new InstantHire(instantHireData);
      
      const result = await databaseService.create(COLLECTIONS.INSTANT_HIRES, instantHire.toJSON());
      instantHire.id = result.insertedId || result.id;
      
      // Send initial notification
      await instantHire.sendCreationNotification();
      
      return instantHire;
    } catch (error) {
      console.error('Error creating instant hire:', error);
      throw new Error('Failed to create instant hire transaction');
    }
  }

  /**
   * Find instant hire by ID
   */
  static async findById(instantHireId) {
    try {
      const data = await databaseService.getById(COLLECTIONS.INSTANT_HIRES, instantHireId);
      return data ? new InstantHire(data) : null;
    } catch (error) {
      console.error('Error finding instant hire:', error);
      throw new Error('Failed to find instant hire');
    }
  }

  /**
   * Find instant hires by company ID
   */
  static async findByCompanyId(companyId, limit = 50, offset = 0) {
    try {
      const instantHires = await databaseService.query(COLLECTIONS.INSTANT_HIRES, [
        { field: 'companyId', operator: '==', value: companyId }
      ], { field: 'createdAt', direction: 'desc' }, limit, offset);
      
      return instantHires.map(hire => new InstantHire(hire));
    } catch (error) {
      console.error('Error finding company instant hires:', error);
      throw new Error('Failed to find company instant hires');
    }
  }

  /**
   * Find instant hires by seeker ID
   */
  static async findBySeekerId(seekerId, limit = 50, offset = 0) {
    try {
      const instantHires = await databaseService.query(COLLECTIONS.INSTANT_HIRES, [
        { field: 'seekerId', operator: '==', value: seekerId }
      ], { field: 'createdAt', direction: 'desc' }, limit, offset);
      
      return instantHires.map(hire => new InstantHire(hire));
    } catch (error) {
      console.error('Error finding seeker instant hires:', error);
      throw new Error('Failed to find seeker instant hires');
    }
  }

  /**
   * Find instant hires by status
   */
  static async findByStatus(status, limit = 100) {
    try {
      const instantHires = await databaseService.query(COLLECTIONS.INSTANT_HIRES, [
        { field: 'status', operator: '==', value: status }
      ], { field: 'createdAt', direction: 'desc' }, limit);
      
      return instantHires.map(hire => new InstantHire(hire));
    } catch (error) {
      console.error('Error finding instant hires by status:', error);
      throw new Error('Failed to find instant hires by status');
    }
  }

  /**
   * Process payment for instant hire
   */
  async processPayment(paymentData) {
    try {
      this.paymentMethod = paymentData.paymentMethod;
      this.transactionId = paymentData.transactionId;
      this.paymentReference = paymentData.paymentReference;
      this.paymentAmount = paymentData.amount;
      this.serviceFee = paymentData.serviceFee || 0;
      this.totalPayment = this.paymentAmount + this.serviceFee;
      this.paymentStatus = 'paid';
      this.paidAt = new Date().toISOString();
      this.status = 'paid';
      this.updatedAt = new Date().toISOString();

      await this.update({
        paymentMethod: this.paymentMethod,
        transactionId: this.transactionId,
        paymentReference: this.paymentReference,
        paymentAmount: this.paymentAmount,
        serviceFee: this.serviceFee,
        totalPayment: this.totalPayment,
        paymentStatus: this.paymentStatus,
        paidAt: this.paidAt,
        status: this.status,
        updatedAt: this.updatedAt
      });

      // Send payment confirmation
      await this.sendPaymentConfirmation();
      
      return this;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Match with seeker
   */
  async matchWithSeeker(seekerData) {
    try {
      this.seekerId = seekerData.seekerId;
      this.seekerName = seekerData.seekerName;
      this.seekerEmail = seekerData.seekerEmail;
      this.seekerPhone = seekerData.seekerPhone;
      this.matchStatus = 'matched';
      this.status = 'matched';
      this.matchedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();

      await this.update({
        seekerId: this.seekerId,
        seekerName: this.seekerName,
        seekerEmail: this.seekerEmail,
        seekerPhone: this.seekerPhone,
        matchStatus: this.matchStatus,
        status: this.status,
        matchedAt: this.matchedAt,
        updatedAt: this.updatedAt
      });

      // Send match notification to seeker
      await this.sendMatchNotification();
      
      return this;
    } catch (error) {
      console.error('Error matching with seeker:', error);
      throw error;
    }
  }

  /**
   * Seeker accepts the instant hire
   */
  async acceptBySeeker() {
    try {
      if (this.matchStatus !== 'matched') {
        throw new Error('Instant hire must be matched before it can be accepted');
      }

      this.matchStatus = 'accepted';
      this.status = 'started';
      this.seekerAcceptedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();

      await this.update({
        matchStatus: this.matchStatus,
        status: this.status,
        seekerAcceptedAt: this.seekerAcceptedAt,
        updatedAt: this.updatedAt
      });

      // Send acceptance confirmation
      await this.sendAcceptanceConfirmation();
      
      return this;
    } catch (error) {
      console.error('Error accepting instant hire:', error);
      throw error;
    }
  }

  /**
   * Seeker declines the instant hire
   */
  async declineBySeeker(reason = null) {
    try {
      if (this.matchStatus !== 'matched') {
        throw new Error('Instant hire must be matched before it can be declined');
      }

      this.matchStatus = 'declined';
      this.status = 'pending_rematch';
      this.seekerDeclinedAt = new Date().toISOString();
      this.declineReason = reason;
      this.updatedAt = new Date().toISOString();

      await this.update({
        matchStatus: this.matchStatus,
        status: this.status,
        seekerDeclinedAt: this.seekerDeclinedAt,
        declineReason: this.declineReason,
        updatedAt: this.updatedAt
      });

      // Send decline notification and attempt rematch
      await this.sendDeclineNotification(reason);
      
      return this;
    } catch (error) {
      console.error('Error declining instant hire:', error);
      throw error;
    }
  }

  /**
   * Start work execution
   */
  async startWork() {
    try {
      if (this.status !== 'started') {
        throw new Error('Instant hire must be accepted before work can start');
      }

      this.status = 'in_progress';
      this.workStartedAt = new Date().toISOString();
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        workStartedAt: this.workStartedAt,
        updatedAt: this.updatedAt
      });

      // Send work start notification
      await this.sendWorkStartNotification();
      
      return this;
    } catch (error) {
      console.error('Error starting work:', error);
      throw error;
    }
  }

  /**
   * Record daily attendance
   */
  async recordAttendance(attendanceData) {
    try {
      const attendance = {
        date: attendanceData.date || new Date().toISOString().split('T')[0],
        checkInTime: attendanceData.checkInTime,
        checkOutTime: attendanceData.checkOutTime,
        hoursWorked: attendanceData.hoursWorked || 0,
        status: attendanceData.status || 'present', // 'present', 'absent', 'late'
        notes: attendanceData.notes || null,
        recordedAt: new Date().toISOString()
      };

      this.attendanceRecords.push(attendance);
      this.actualHoursWorked += attendance.hoursWorked;
      this.updatedAt = new Date().toISOString();

      await this.update({
        attendanceRecords: this.attendanceRecords,
        actualHoursWorked: this.actualHoursWorked,
        updatedAt: this.updatedAt
      });

      return this;
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  }

  /**
   * Complete the instant hire work
   */
  async completeWork(completionData = {}) {
    try {
      if (this.status !== 'in_progress') {
        throw new Error('Work must be in progress before it can be completed');
      }

      this.status = 'completed';
      this.completionStatus = 'completed';
      this.workCompletedAt = new Date().toISOString();
      this.companyFeedback = completionData.companyFeedback || null;
      this.companyRating = completionData.companyRating || null;
      this.finalPaymentAmount = completionData.finalPaymentAmount || this.totalAmount;
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        completionStatus: this.completionStatus,
        workCompletedAt: this.workCompletedAt,
        companyFeedback: this.companyFeedback,
        companyRating: this.companyRating,
        finalPaymentAmount: this.finalPaymentAmount,
        updatedAt: this.updatedAt
      });

      // Process final payment to seeker
      await this.processFinalPayment();
      
      // Send completion notification
      await this.sendCompletionNotification();
      
      return this;
    } catch (error) {
      console.error('Error completing work:', error);
      throw error;
    }
  }

  /**
   * Process final payment to seeker
   */
  async processFinalPayment() {
    try {
      // Here you would integrate with payment gateway to pay the seeker
      this.finalPaymentStatus = 'paid';
      this.finalPaymentDate = new Date().toISOString();
      this.finalPaymentReference = `PAY-${this.instantHireId}-${Date.now()}`;
      this.updatedAt = new Date().toISOString();

      await this.update({
        finalPaymentStatus: this.finalPaymentStatus,
        finalPaymentDate: this.finalPaymentDate,
        finalPaymentReference: this.finalPaymentReference,
        updatedAt: this.updatedAt
      });

      // Send payment notification to seeker
      await this.sendPaymentNotification();
      
      return this;
    } catch (error) {
      console.error('Error processing final payment:', error);
      throw error;
    }
  }

  /**
   * Cancel instant hire
   */
  async cancel(reason = null) {
    try {
      this.status = 'cancelled';
      this.completionStatus = 'cancelled';
      this.declineReason = reason;
      this.updatedAt = new Date().toISOString();

      await this.update({
        status: this.status,
        completionStatus: this.completionStatus,
        declineReason: this.declineReason,
        updatedAt: this.updatedAt
      });

      // Process refund if payment was made
      if (this.paymentStatus === 'paid') {
        await this.processRefund();
      }

      // Send cancellation notification
      await this.sendCancellationNotification(reason);
      
      return this;
    } catch (error) {
      console.error('Error cancelling instant hire:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund() {
    try {
      // Here you would integrate with payment gateway for refund
      this.paymentStatus = 'refunded';
      this.status = 'refunded';
      this.updatedAt = new Date().toISOString();

      await this.update({
        paymentStatus: this.paymentStatus,
        status: this.status,
        updatedAt: this.updatedAt
      });

      return this;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get instant hire statistics for company
   */
  static async getCompanyStats(companyId) {
    try {
      const allHires = await InstantHire.findByCompanyId(companyId, 1000);
      
      return {
        totalInstantHires: allHires.length,
        completedHires: allHires.filter(h => h.status === 'completed').length,
        cancelledHires: allHires.filter(h => h.status === 'cancelled').length,
        inProgressHires: allHires.filter(h => h.status === 'in_progress').length,
        totalSpent: allHires.reduce((sum, h) => sum + (h.totalPayment || 0), 0),
        averageRating: allHires.filter(h => h.seekerRating).reduce((sum, h) => sum + h.seekerRating, 0) / allHires.filter(h => h.seekerRating).length || 0,
        successRate: allHires.length > 0 ? (allHires.filter(h => h.status === 'completed').length / allHires.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting company stats:', error);
      return null;
    }
  }

  /**
   * Get instant hire statistics for seeker
   */
  static async getSeekerStats(seekerId) {
    try {
      const allHires = await InstantHire.findBySeekerId(seekerId, 1000);
      
      return {
        totalInstantHires: allHires.length,
        completedHires: allHires.filter(h => h.status === 'completed').length,
        cancelledHires: allHires.filter(h => h.status === 'cancelled').length,
        inProgressHires: allHires.filter(h => h.status === 'in_progress').length,
        totalEarned: allHires.filter(h => h.finalPaymentStatus === 'paid').reduce((sum, h) => sum + (h.finalPaymentAmount || 0), 0),
        averageRating: allHires.filter(h => h.companyRating).reduce((sum, h) => sum + h.companyRating, 0) / allHires.filter(h => h.companyRating).length || 0,
        completionRate: allHires.length > 0 ? (allHires.filter(h => h.status === 'completed').length / allHires.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting seeker stats:', error);
      return null;
    }
  }

  /**
   * Send creation notification
   */
  async sendCreationNotification() {
    try {
      console.log(`📧 Instant hire created: ${this.instantHireId} for ${this.jobTitle}`);
    } catch (error) {
      console.error('Error sending creation notification:', error);
    }
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation() {
    try {
      console.log(`💰 Payment confirmed for instant hire: ${this.instantHireId} - Amount: ${this.totalPayment} OMR`);
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  /**
   * Send match notification
   */
  async sendMatchNotification() {
    try {
      console.log(`🎯 Matched instant hire: ${this.instantHireId} with ${this.seekerName}`);
    } catch (error) {
      console.error('Error sending match notification:', error);
    }
  }

  /**
   * Send acceptance confirmation
   */
  async sendAcceptanceConfirmation() {
    try {
      console.log(`✅ Instant hire accepted: ${this.instantHireId} by ${this.seekerName}`);
    } catch (error) {
      console.error('Error sending acceptance confirmation:', error);
    }
  }

  /**
   * Send decline notification
   */
  async sendDeclineNotification(reason) {
    try {
      console.log(`❌ Instant hire declined: ${this.instantHireId} - Reason: ${reason || 'Not specified'}`);
    } catch (error) {
      console.error('Error sending decline notification:', error);
    }
  }

  /**
   * Send work start notification
   */
  async sendWorkStartNotification() {
    try {
      console.log(`🚀 Work started for instant hire: ${this.instantHireId}`);
    } catch (error) {
      console.error('Error sending work start notification:', error);
    }
  }

  /**
   * Send completion notification
   */
  async sendCompletionNotification() {
    try {
      console.log(`🎉 Work completed for instant hire: ${this.instantHireId}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification() {
    try {
      console.log(`💸 Payment sent for instant hire: ${this.instantHireId} - Amount: ${this.finalPaymentAmount} OMR`);
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  }

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(reason) {
    try {
      console.log(`🚫 Instant hire cancelled: ${this.instantHireId} - Reason: ${reason || 'Not specified'}`);
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  /**
   * Update instant hire
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update instant hire without ID');
      }

      const updatedData = await databaseService.update(COLLECTIONS.INSTANT_HIRES, this.id, updateData);
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating instant hire:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      instantHireId: this.instantHireId,
      jobId: this.jobId,
      applicationId: this.applicationId,
      companyId: this.companyId,
      seekerId: this.seekerId,
      
      // Job details
      jobTitle: this.jobTitle,
      companyName: this.companyName,
      brandName: this.brandName,
      seekerName: this.seekerName,
      seekerEmail: this.seekerEmail,
      seekerPhone: this.seekerPhone,
      
      // Financial
      payPerHour: this.payPerHour,
      hoursPerDay: this.hoursPerDay,
      totalDays: this.totalDays,
      totalHours: this.totalHours,
      totalAmount: this.totalAmount,
      paymentTerms: this.paymentTerms,
      
      // Schedule
      startDate: this.startDate,
      endDate: this.endDate,
      workingDays: this.workingDays,
      shiftType: this.shiftType,
      startTime: this.startTime,
      endTime: this.endTime,
      
      // Location
      workLocation: this.workLocation,
      locationAddress: this.locationAddress,
      locationCoordinates: this.locationCoordinates,
      requirements: this.requirements,
      dressCode: this.dressCode,
      
      // Status
      status: this.status,
      paymentStatus: this.paymentStatus,
      matchStatus: this.matchStatus,
      
      // Payment details
      paymentMethod: this.paymentMethod,
      transactionId: this.transactionId,
      paymentReference: this.paymentReference,
      paidAt: this.paidAt,
      paymentAmount: this.paymentAmount,
      serviceFee: this.serviceFee,
      totalPayment: this.totalPayment,
      
      // Matching
      matchedAt: this.matchedAt,
      seekerAcceptedAt: this.seekerAcceptedAt,
      seekerDeclinedAt: this.seekerDeclinedAt,
      declineReason: this.declineReason,
      
      // Work execution
      workStartedAt: this.workStartedAt,
      workCompletedAt: this.workCompletedAt,
      actualHoursWorked: this.actualHoursWorked,
      attendanceRecords: this.attendanceRecords,
      
      // Completion
      completionStatus: this.completionStatus,
      companyFeedback: this.companyFeedback,
      seekerFeedback: this.seekerFeedback,
      companyRating: this.companyRating,
      seekerRating: this.seekerRating,
      
      // Final payment
      finalPaymentAmount: this.finalPaymentAmount,
      finalPaymentDate: this.finalPaymentDate,
      finalPaymentStatus: this.finalPaymentStatus,
      finalPaymentReference: this.finalPaymentReference,
      
      // System
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      chatId: this.chatId,
      notificationsSent: this.notificationsSent,
      reminders: this.reminders
    };
  }
}

module.exports = InstantHire;