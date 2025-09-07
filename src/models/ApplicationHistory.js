const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Application History Model
 * Tracks all changes and actions in job application lifecycle
 */
class ApplicationHistory {
  constructor(data = {}) {
    this.id = data.id || null;
    this.historyId = data.historyId || this.generateHistoryId();
    
    // Core references
    this.applicationId = data.applicationId || null;
    this.jobId = data.jobId || null;
    this.seekerId = data.seekerId || null;
    this.companyId = data.companyId || null;
    
    // Action details
    this.action = data.action || null; // 'applied', 'invited', 'accepted', 'declined', 'hired', 'interviewed', 'withdrawn', 'completed', 'cancelled'
    this.fromStatus = data.fromStatus || null; // Previous status
    this.toStatus = data.toStatus || null; // New status
    this.actionBy = data.actionBy || null; // 'seeker', 'company', 'system'
    this.actionById = data.actionById || null; // User ID who performed action
    
    // Action metadata
    this.reason = data.reason || null; // Decline reason, cancellation reason, etc.
    this.notes = data.notes || null; // Additional notes
    this.metadata = data.metadata || {}; // Additional data (interview details, payment info, etc.)
    
    // System fields
    this.actionAt = data.actionAt || new Date().toISOString();
    this.ipAddress = data.ipAddress || null;
    this.userAgent = data.userAgent || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  /**
   * Generate unique history ID
   */
  generateHistoryId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `HIST-${timestamp}${random}`.toUpperCase();
  }

  /**
   * Create new history record
   */
  static async create(historyData) {
    try {
      const history = new ApplicationHistory(historyData);
      
      const result = await databaseService.create(COLLECTIONS.APPLICATION_HISTORY, history.toJSON());
      history.id = result.insertedId || result.id;
      
      return history;
    } catch (error) {
      console.error('Error creating application history:', error);
      throw new Error('Failed to create application history');
    }
  }

  /**
   * Get history for specific application
   */
  static async getApplicationHistory(applicationId, limit = 50) {
    try {
      const history = await databaseService.query(
        COLLECTIONS.APPLICATION_HISTORY,
        [{ field: 'applicationId', operator: '==', value: applicationId }],
        { field: 'actionAt', direction: 'desc' },
        limit
      );
      
      return history.map(h => new ApplicationHistory(h));
    } catch (error) {
      console.error('Error getting application history:', error);
      throw new Error('Failed to get application history');
    }
  }

  /**
   * Get history for seeker
   */
  static async getSeekerHistory(seekerId, limit = 100) {
    try {
      const history = await databaseService.query(
        COLLECTIONS.APPLICATION_HISTORY,
        [{ field: 'seekerId', operator: '==', value: seekerId }],
        { field: 'actionAt', direction: 'desc' },
        limit
      );
      
      return history.map(h => new ApplicationHistory(h));
    } catch (error) {
      console.error('Error getting seeker history:', error);
      throw new Error('Failed to get seeker history');
    }
  }

  /**
   * Get history for company
   */
  static async getCompanyHistory(companyId, limit = 200) {
    try {
      const history = await databaseService.query(
        COLLECTIONS.APPLICATION_HISTORY,
        [{ field: 'companyId', operator: '==', value: companyId }],
        { field: 'actionAt', direction: 'desc' },
        limit
      );
      
      return history.map(h => new ApplicationHistory(h));
    } catch (error) {
      console.error('Error getting company history:', error);
      throw new Error('Failed to get company history');
    }
  }

  /**
   * Track application action
   */
  static async trackAction(actionData) {
    try {
      const historyRecord = await ApplicationHistory.create({
        applicationId: actionData.applicationId,
        jobId: actionData.jobId,
        seekerId: actionData.seekerId,
        companyId: actionData.companyId,
        action: actionData.action,
        fromStatus: actionData.fromStatus,
        toStatus: actionData.toStatus,
        actionBy: actionData.actionBy,
        actionById: actionData.actionById,
        reason: actionData.reason,
        notes: actionData.notes,
        metadata: actionData.metadata || {},
        ipAddress: actionData.ipAddress,
        userAgent: actionData.userAgent
      });

      console.log(`📝 History tracked: ${actionData.action} for application ${actionData.applicationId}`);
      return historyRecord;
    } catch (error) {
      console.error('Error tracking application action:', error);
      // Don't throw error - history tracking should not break main flow
    }
  }

  /**
   * Get application statistics from history
   */
  static async getApplicationStats(applicationId) {
    try {
      const history = await ApplicationHistory.getApplicationHistory(applicationId);
      
      const stats = {
        totalActions: history.length,
        timeline: [],
        actionCounts: {},
        lastAction: null,
        timeToHire: null,
        averageResponseTime: null
      };

      // Count actions
      history.forEach(record => {
        stats.actionCounts[record.action] = (stats.actionCounts[record.action] || 0) + 1;
        stats.timeline.push({
          action: record.action,
          date: record.actionAt,
          by: record.actionBy
        });
      });

      if (history.length > 0) {
        stats.lastAction = history[0].action;
        
        // Calculate time to hire if hired
        const applicationRecord = history.find(h => h.action === 'applied');
        const hireRecord = history.find(h => h.action === 'hired');
        
        if (applicationRecord && hireRecord) {
          const timeToHire = new Date(hireRecord.actionAt) - new Date(applicationRecord.actionAt);
          stats.timeToHire = Math.round(timeToHire / (1000 * 60 * 60 * 24)); // days
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting application stats:', error);
      return null;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      historyId: this.historyId,
      applicationId: this.applicationId,
      jobId: this.jobId,
      seekerId: this.seekerId,
      companyId: this.companyId,
      action: this.action,
      fromStatus: this.fromStatus,
      toStatus: this.toStatus,
      actionBy: this.actionBy,
      actionById: this.actionById,
      reason: this.reason,
      notes: this.notes,
      metadata: this.metadata,
      actionAt: this.actionAt,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt
    };
  }
}

module.exports = ApplicationHistory;