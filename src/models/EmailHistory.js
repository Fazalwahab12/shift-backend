const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Email History Model - Track all emails sent through the system
 * Stores complete email history for auditing and debugging
 */
class EmailHistory {
  constructor(data = {}) {
    this.id = data.id || null;
    this.emailId = data.emailId || this.generateEmailId();
    
    // Email details
    this.to = data.to || null; // Recipient email address
    this.from = data.from || null; // Sender email address
    this.subject = data.subject || null; // Email subject
    this.htmlContent = data.htmlContent || null; // HTML content
    this.textContent = data.textContent || null; // Plain text content
    this.templateName = data.templateName || null; // Email template used
    
    // Send status
    this.status = data.status || 'pending'; // 'pending', 'sent', 'failed', 'bounced', 'delivered'
    this.sendAttempts = data.sendAttempts || 0; // Number of send attempts
    this.lastAttemptAt = data.lastAttemptAt || null;
    this.sentAt = data.sentAt || null; // When successfully sent
    this.deliveredAt = data.deliveredAt || null; // When delivered (if tracked)
    this.error = data.error || null; // Error message if failed
    
    // Email service details
    this.service = data.service || 'gmail'; // 'gmail', 'smtp', 'resend', etc.
    this.messageId = data.messageId || null; // Service provider message ID
    this.providerResponse = data.providerResponse || null; // Full provider response
    
    // Context and metadata
    this.notificationType = data.notificationType || null; // Type of notification
    this.userId = data.userId || null; // User who triggered the email
    this.companyId = data.companyId || null; // Company associated with email
    this.seekerId = data.seekerId || null; // Seeker associated with email
    this.jobId = data.jobId || null; // Job associated with email
    this.applicationId = data.applicationId || null; // Application associated with email
    this.interviewId = data.interviewId || null; // Interview associated with email
    
    // Additional context
    this.priority = data.priority || 'normal'; // 'low', 'normal', 'high', 'urgent'
    this.category = data.category || 'transactional'; // 'transactional', 'promotional', 'notification'
    this.tags = data.tags || []; // Tags for categorization
    this.metadata = data.metadata || {}; // Additional metadata
    
    // System fields
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Generate unique email ID
   */
  generateEmailId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `EMAIL-${timestamp}${random}`.toUpperCase();
  }

  /**
   * Create new email history record
   */
  static async create(emailData) {
    try {
      const emailHistory = new EmailHistory(emailData);
      
      const result = await databaseService.create(COLLECTIONS.EMAIL_HISTORY, emailHistory.toJSON());
      emailHistory.id = result.insertedId || result.id;
      
      return emailHistory;
    } catch (error) {
      console.error('Error creating email history:', error);
      throw error;
    }
  }

  /**
   * Find email history by ID
   */
  static async findById(emailHistoryId) {
    try {
      const data = await databaseService.getById(COLLECTIONS.EMAIL_HISTORY, emailHistoryId);
      return data ? new EmailHistory(data) : null;
    } catch (error) {
      console.error('Error finding email history:', error);
      throw error;
    }
  }

  /**
   * Find email history by email ID
   */
  static async findByEmailId(emailId) {
    try {
      const emails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'emailId', operator: '==', value: emailId }
      ]);
      
      return emails.length > 0 ? new EmailHistory(emails[0]) : null;
    } catch (error) {
      console.error('Error finding email by email ID:', error);
      throw error;
    }
  }

  /**
   * Get email history for a specific recipient
   */
  static async findByRecipient(email, limit = 50) {
    try {
      const emails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'to', operator: '==', value: email }
      ], { field: 'createdAt', direction: 'desc' }, limit);
      
      return emails.map(email => new EmailHistory(email));
    } catch (error) {
      console.error('Error finding emails by recipient:', error);
      throw error;
    }
  }

  /**
   * Get email history by notification type
   */
  static async findByType(notificationType, limit = 50) {
    try {
      const emails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'notificationType', operator: '==', value: notificationType }
      ], { field: 'createdAt', direction: 'desc' }, limit);
      
      return emails.map(email => new EmailHistory(email));
    } catch (error) {
      console.error('Error finding emails by type:', error);
      throw error;
    }
  }

  /**
   * Get failed emails for retry
   */
  static async getFailedEmails(limit = 100) {
    try {
      const emails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'status', operator: '==', value: 'failed' },
        { field: 'sendAttempts', operator: '<', value: 3 } // Max 3 retry attempts
      ], { field: 'lastAttemptAt', direction: 'asc' }, limit);
      
      return emails.map(email => new EmailHistory(email));
    } catch (error) {
      console.error('Error getting failed emails:', error);
      throw error;
    }
  }

  /**
   * Update email status
   */
  async updateStatus(status, additionalData = {}) {
    try {
      if (!this.id) {
        throw new Error('Cannot update email without ID');
      }

      const updateData = {
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData
      };

      // Set timestamps based on status
      if (status === 'sent' && !this.sentAt) {
        updateData.sentAt = new Date().toISOString();
      } else if (status === 'delivered' && !this.deliveredAt) {
        updateData.deliveredAt = new Date().toISOString();
      } else if (status === 'failed') {
        updateData.lastAttemptAt = new Date().toISOString();
        updateData.sendAttempts = this.sendAttempts + 1;
      }

      await databaseService.update(COLLECTIONS.EMAIL_HISTORY, this.id, updateData);
      Object.assign(this, updateData);
      
      return this;
    } catch (error) {
      console.error('Error updating email status:', error);
      throw error;
    }
  }

  /**
   * Mark as sent successfully
   */
  async markAsSent(messageId = null, providerResponse = null) {
    try {
      return await this.updateStatus('sent', {
        messageId,
        providerResponse,
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking email as sent:', error);
      throw error;
    }
  }

  /**
   * Mark as failed
   */
  async markAsFailed(error) {
    try {
      return await this.updateStatus('failed', {
        error: error.message || error.toString(),
        lastAttemptAt: new Date().toISOString(),
        sendAttempts: this.sendAttempts + 1
      });
    } catch (updateError) {
      console.error('Error marking email as failed:', updateError);
      throw updateError;
    }
  }

  /**
   * Get email statistics for a date range
   */
  static async getEmailStats(startDate, endDate) {
    try {
      const emails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'createdAt', operator: '>=', value: startDate },
        { field: 'createdAt', operator: '<=', value: endDate }
      ]);

      const stats = {
        total: emails.length,
        sent: 0,
        failed: 0,
        pending: 0,
        delivered: 0,
        bounced: 0,
        byType: {},
        byService: {},
        byCategory: {}
      };

      emails.forEach(email => {
        // Count by status
        stats[email.status] = (stats[email.status] || 0) + 1;
        
        // Count by type
        if (email.notificationType) {
          stats.byType[email.notificationType] = (stats.byType[email.notificationType] || 0) + 1;
        }
        
        // Count by service
        stats.byService[email.service] = (stats.byService[email.service] || 0) + 1;
        
        // Count by category
        stats.byCategory[email.category] = (stats.byCategory[email.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting email stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old email history (older than specified days)
   */
  static async cleanupOldEmails(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const oldEmails = await databaseService.query(COLLECTIONS.EMAIL_HISTORY, [
        { field: 'createdAt', operator: '<', value: cutoffDate.toISOString() }
      ]);

      let deletedCount = 0;
      for (const email of oldEmails) {
        await databaseService.delete(COLLECTIONS.EMAIL_HISTORY, email.id);
        deletedCount++;
      }

      console.log(`🗑️ Cleaned up ${deletedCount} old email records`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old emails:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      emailId: this.emailId,
      to: this.to,
      from: this.from,
      subject: this.subject,
      htmlContent: this.htmlContent,
      textContent: this.textContent,
      templateName: this.templateName,
      status: this.status,
      sendAttempts: this.sendAttempts,
      lastAttemptAt: this.lastAttemptAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      error: this.error,
      service: this.service,
      messageId: this.messageId,
      providerResponse: this.providerResponse,
      notificationType: this.notificationType,
      userId: this.userId,
      companyId: this.companyId,
      seekerId: this.seekerId,
      jobId: this.jobId,
      applicationId: this.applicationId,
      interviewId: this.interviewId,
      priority: this.priority,
      category: this.category,
      tags: this.tags,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      emailId: this.emailId,
      to: this.to,
      subject: this.subject,
      status: this.status,
      sentAt: this.sentAt,
      notificationType: this.notificationType,
      priority: this.priority,
      category: this.category,
      createdAt: this.createdAt
    };
  }
}

module.exports = EmailHistory;