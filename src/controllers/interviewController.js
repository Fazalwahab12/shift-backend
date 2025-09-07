const Interview = require('../models/Interview');
const JobApplication = require('../models/JobApplication');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Seeker = require('../models/Seeker');
const { validationResult } = require('express-validator');

/**
 * Interview Controller
 * Handles interview scheduling, management, and status updates
 */
class InterviewController {

  /**
   * Create/Schedule a new interview
   * POST /api/interviews
   */
  static async createInterview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const interviewData = req.body;

      // Verify user has permission (must be company user)
      const company = await Company.findByUserId(userId);
      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'Only companies can schedule interviews'
        });
      }

      // Verify application exists and belongs to this company
      const application = await JobApplication.findById(interviewData.applicationId);
      if (!application || application.companyId !== company.id) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or access denied'
        });
      }

      // Add company ID and additional context
      interviewData.companyId = company.id;
      interviewData.scheduledBy = userId;
      interviewData.companyName = company.companyName;
      interviewData.seekerName = application.seekerName;
      interviewData.seekerEmail = application.seekerEmail;
      interviewData.seekerPhone = application.seekerPhone;
      interviewData.jobTitle = application.jobTitle;

      // Create the interview
      const interview = await Interview.create(interviewData);

      // Update the application status if needed
      if (application.status === 'applied') {
        await application.update({
          status: 'interviewed',
          interviewScheduled: true,
          statusChangedAt: new Date().toISOString()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Interview scheduled successfully',
        data: interview.toJSON()
      });

    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get interview details by ID
   * GET /api/interviews/:interviewId
   */
  static async getInterviewById(req, res) {
    try {
      const { interviewId } = req.params;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Verify user has access (company or seeker)
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === interview.companyId) || 
                       (seeker && seeker.id === interview.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        message: 'Interview retrieved successfully',
        data: interview.toJSON()
      });

    } catch (error) {
      console.error('Error getting interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all interviews for an application
   * GET /api/applications/:applicationId/interviews
   */
  static async getApplicationInterviews(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.userId;

      // Verify access to the application
      const application = await JobApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === application.companyId) || 
                       (seeker && seeker.id === application.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const interviews = await Interview.findByApplicationId(applicationId);

      res.json({
        success: true,
        message: 'Interviews retrieved successfully',
        data: interviews.map(interview => interview.toJSON())
      });

    } catch (error) {
      console.error('Error getting application interviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve interviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company interviews with filtering
   * GET /api/company/:companyId/interviews
   */
  static async getCompanyInterviews(req, res) {
    try {
      const { companyId } = req.params;
      const userId = req.user.userId;
      const { startDate, endDate, status } = req.query;

      // Verify user is from this company
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      let interviews;
      if (startDate && endDate) {
        interviews = await Interview.findByCompanyAndDateRange(companyId, startDate, endDate);
      } else {
        // Default to current month if no dates provided
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        interviews = await Interview.findByCompanyAndDateRange(companyId, startOfMonth, endOfMonth);
      }

      // Filter by status if provided
      if (status) {
        interviews = interviews.filter(interview => interview.status === status);
      }

      res.json({
        success: true,
        message: 'Company interviews retrieved successfully',
        data: interviews.map(interview => interview.toJSON())
      });

    } catch (error) {
      console.error('Error getting company interviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve company interviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get available time slots for scheduling
   * GET /api/interviews/available-slots
   */
  static async getAvailableSlots(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId, date, duration = 30 } = req.query;
      const userId = req.user.userId;

      // Verify user is from this company
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const availableSlots = await Interview.getAvailableTimeSlots(companyId, date, duration);

      res.json({
        success: true,
        message: 'Available time slots retrieved successfully',
        data: availableSlots
      });

    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available slots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reschedule an interview
   * PUT /api/interviews/:interviewId/reschedule
   */
  static async rescheduleInterview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { interviewId } = req.params;
      const { newDate, newTime, reason } = req.body;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Verify user has permission to reschedule
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === interview.companyId) || 
                       (seeker && seeker.id === interview.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const rescheduledInterview = await interview.reschedule(newDate, newTime, reason);

      res.json({
        success: true,
        message: 'Interview rescheduled successfully',
        data: rescheduledInterview.toJSON()
      });

    } catch (error) {
      console.error('Error rescheduling interview:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reschedule interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Confirm interview (by seeker)
   * PUT /api/interviews/:interviewId/confirm
   */
  static async confirmInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Verify user is the seeker for this interview
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker || seeker.id !== interview.seekerId) {
        return res.status(403).json({
          success: false,
          message: 'Only the candidate can confirm the interview'
        });
      }

      const confirmedInterview = await interview.confirm();

      res.json({
        success: true,
        message: 'Interview confirmed successfully',
        data: confirmedInterview.toJSON()
      });

    } catch (error) {
      console.error('Error confirming interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel an interview
   * PUT /api/interviews/:interviewId/cancel
   */
  static async cancelInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Verify user has permission to cancel
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === interview.companyId) || 
                       (seeker && seeker.id === interview.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const cancelledInterview = await interview.cancel(reason);

      res.json({
        success: true,
        message: 'Interview cancelled successfully',
        data: cancelledInterview.toJSON()
      });

    } catch (error) {
      console.error('Error cancelling interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark interview as completed with feedback
   * PUT /api/interviews/:interviewId/complete
   */
  static async completeInterview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { interviewId } = req.params;
      const { rating, feedback, result, nextSteps } = req.body;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Only company can mark as completed
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== interview.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the company can mark interview as completed'
        });
      }

      const completedInterview = await interview.complete(rating, feedback, result, nextSteps);

      res.json({
        success: true,
        message: 'Interview marked as completed',
        data: completedInterview.toJSON()
      });

    } catch (error) {
      console.error('Error completing interview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete interview',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark interview as no-show
   * PUT /api/interviews/:interviewId/no-show
   */
  static async markNoShow(req, res) {
    try {
      const { interviewId } = req.params;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Only company can mark as no-show
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== interview.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the company can mark interview as no-show'
        });
      }

      const noShowInterview = await interview.markNoShow();

      res.json({
        success: true,
        message: 'Interview marked as no-show',
        data: noShowInterview.toJSON()
      });

    } catch (error) {
      console.error('Error marking no-show:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark no-show',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add additional date options for interview scheduling
   * PUT /api/interviews/:interviewId/add-dates
   */
  static async addAdditionalDates(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { interviewId } = req.params;
      const { additionalDates } = req.body;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Only company can add additional dates
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== interview.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the company can add additional dates'
        });
      }

      await interview.update({
        additionalDates: additionalDates,
        updatedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Additional dates added successfully',
        data: interview.toJSON()
      });

    } catch (error) {
      console.error('Error adding additional dates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add additional dates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker's interviews
   * GET /api/seeker/:seekerId/interviews
   */
  static async getSeekerInterviews(req, res) {
    try {
      const { seekerId } = req.params;
      const userId = req.user.userId;

      // Verify user is this seeker
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker || seeker.id !== seekerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get all interviews for this seeker
      const interviews = await Interview.query([
        { field: 'seekerId', operator: '==', value: seekerId }
      ], { field: 'scheduledAt', direction: 'desc' });

      res.json({
        success: true,
        message: 'Seeker interviews retrieved successfully',
        data: interviews.map(interview => new Interview(interview).toJSON())
      });

    } catch (error) {
      console.error('Error getting seeker interviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve seeker interviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update preparation materials and instructions
   * PUT /api/interviews/:interviewId/preparation
   */
  static async updatePreparation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { interviewId } = req.params;
      const { preparationMaterials, requiredDocuments, instructions } = req.body;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Only company can update preparation
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== interview.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the company can update preparation materials'
        });
      }

      const updateData = {
        updatedAt: new Date().toISOString()
      };

      if (preparationMaterials !== undefined) updateData.preparationMaterials = preparationMaterials;
      if (requiredDocuments !== undefined) updateData.requiredDocuments = requiredDocuments;
      if (instructions !== undefined) updateData.instructions = instructions;

      await interview.update(updateData);

      res.json({
        success: true,
        message: 'Preparation materials updated successfully',
        data: interview.toJSON()
      });

    } catch (error) {
      console.error('Error updating preparation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preparation materials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Send interview reminder
   * POST /api/interviews/:interviewId/reminder
   */
  static async sendReminder(req, res) {
    try {
      const { interviewId } = req.params;
      const userId = req.user.userId;

      const interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Only company can send reminders
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== interview.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the company can send reminders'
        });
      }

      // Add reminder timestamp
      const reminderTimestamp = new Date().toISOString();
      const updatedReminders = [...(interview.remindersSent || []), reminderTimestamp];

      await interview.update({
        remindersSent: updatedReminders,
        updatedAt: new Date().toISOString()
      });

      // TODO: Implement actual reminder notification
      console.log(`📧 Interview reminder sent for ${interview.interviewId}`);

      res.json({
        success: true,
        message: 'Interview reminder sent successfully'
      });

    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send reminder',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check for scheduling conflicts
   * GET /api/interviews/conflicts
   */
  static async checkConflicts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId, date, startTime, duration = 30 } = req.query;
      const userId = req.user.userId;

      // Verify user is from this company
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Create temporary interview object to check conflicts
      const tempInterview = new Interview({
        companyId,
        interviewDate: date,
        startTime,
        duration
      });

      const conflicts = await tempInterview.checkConflicts();

      res.json({
        success: true,
        message: 'Conflict check completed',
        data: {
          hasConflicts: conflicts.length > 0,
          conflictCount: conflicts.length,
          conflicts: conflicts.map(conflict => conflict.toJSON())
        }
      });

    } catch (error) {
      console.error('Error checking conflicts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check conflicts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = InterviewController;