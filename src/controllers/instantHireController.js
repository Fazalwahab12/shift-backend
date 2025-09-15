const InstantHire = require('../models/InstantHire');
const JobApplication = require('../models/JobApplication');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Seeker = require('../models/Seeker');
const { validationResult } = require('express-validator');
const notificationController = require('./notificationController');

/**
 * InstantHire Controller
 * Handles instant hire transactions, payments, and workflow management
 */
class InstantHireController {

  /**
   * Create new instant hire transaction
   * POST /api/instant-hires
   */
  static async createInstantHire(req, res) {
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
      const instantHireData = req.body;

      // Verify user is a company
      const company = await Company.findByUserId(userId);
      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'Only companies can create instant hire transactions'
        });
      }

      // Verify job exists and belongs to company
      if (instantHireData.jobId) {
        const job = await Job.findById(instantHireData.jobId);
        if (!job || job.companyId !== company.id) {
          return res.status(403).json({
            success: false,
            message: 'Job not found or access denied'
          });
        }
        
        // Add job details to instant hire
        instantHireData.jobTitle = job.roleName;
        instantHireData.payPerHour = job.payPerHour;
        instantHireData.hoursPerDay = job.hoursPerDay;
        instantHireData.startDate = job.startDate;
        instantHireData.workLocation = job.location;
        instantHireData.requirements = job.requirements;
      }

      // Add company details
      instantHireData.companyId = company.id;
      instantHireData.companyName = company.companyName;
      instantHireData.brandName = company.brandName;
      instantHireData.createdBy = userId;

      // Create the instant hire
      const instantHire = await InstantHire.create(instantHireData);

      res.status(201).json({
        success: true,
        message: 'Instant hire transaction created successfully',
        data: instantHire.toJSON()
      });

    } catch (error) {
      console.error('Error creating instant hire:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create instant hire transaction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get instant hire by ID
   * GET /api/instant-hires/:instantHireId
   */
  static async getInstantHireById(req, res) {
    try {
      const { instantHireId } = req.params;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user has access
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === instantHire.companyId) || 
                       (seeker && seeker.id === instantHire.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        message: 'Instant hire retrieved successfully',
        data: instantHire.toJSON()
      });

    } catch (error) {
      console.error('Error getting instant hire:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve instant hire',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company instant hires
   * GET /api/companies/:companyId/instant-hires
   */
  static async getCompanyInstantHires(req, res) {
    try {
      const { companyId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;
      const userId = req.user.userId;

      // Verify user is from this company
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      let instantHires = await InstantHire.findByCompanyId(companyId, parseInt(limit), parseInt(offset));

      // Filter by status if provided
      if (status) {
        instantHires = instantHires.filter(hire => hire.status === status);
      }

      res.json({
        success: true,
        message: 'Company instant hires retrieved successfully',
        data: instantHires.map(hire => hire.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: instantHires.length
        }
      });

    } catch (error) {
      console.error('Error getting company instant hires:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve company instant hires',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker instant hires
   * GET /api/seekers/:seekerId/instant-hires
   */
  static async getSeekerInstantHires(req, res) {
    try {
      const { seekerId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;
      const userId = req.user.userId;

      // Verify user is this seeker
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker || seeker.id !== seekerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      let instantHires = await InstantHire.findBySeekerId(seekerId, parseInt(limit), parseInt(offset));

      // Filter by status if provided
      if (status) {
        instantHires = instantHires.filter(hire => hire.status === status);
      }

      res.json({
        success: true,
        message: 'Seeker instant hires retrieved successfully',
        data: instantHires.map(hire => hire.toJSON()),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: instantHires.length
        }
      });

    } catch (error) {
      console.error('Error getting seeker instant hires:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve seeker instant hires',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Process payment for instant hire
   * PUT /api/instant-hires/:instantHireId/payment
   */
  static async processPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { instantHireId } = req.params;
      const paymentData = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is the company that created this instant hire
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== instantHire.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the hiring company can process payment'
        });
      }

      const processedHire = await instantHire.processPayment(paymentData);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: processedHire.toJSON()
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Match instant hire with seeker
   * PUT /api/instant-hires/:instantHireId/match
   */
  static async matchWithSeeker(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { instantHireId } = req.params;
      const { seekerId } = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is company or admin
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== instantHire.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get seeker details
      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker not found'
        });
      }

      const matchedHire = await instantHire.matchWithSeeker({
        seekerId: seeker.id,
        seekerName: seeker.fullName,
        seekerEmail: seeker.email,
        seekerPhone: seeker.phone
      });

      // 🔥 AUTO-TRIGGER CANDIDATE HIRED NOTIFICATIONS
      try {
        const hiringData = {
          jobTitle: instantHire.jobTitle,
          jobId: instantHire.jobId,
          id: instantHire.id
        };

        const seekerData = {
          id: seeker.id,
          name: seeker.fullName || `${seeker.firstName} ${seeker.lastName}`,
          fullName: seeker.fullName || `${seeker.firstName} ${seeker.lastName}`,
          email: seeker.email,
          phone: seeker.phone
        };

        const companyData = {
          id: company.id,
          name: company.companyName,
          email: company.companyEmail
        };

        // Send hiring offer to seeker (with acceptance option)
        await notificationController.sendCandidateHired(hiringData, seekerData, companyData);
        console.log('✅ Candidate hired notifications sent successfully');
      } catch (notifError) {
        console.error('❌ Failed to send candidate hired notifications:', notifError);
        // Don't fail the main request for notification errors
      }

      res.json({
        success: true,
        message: 'Instant hire matched with seeker successfully',
        data: matchedHire.toJSON()
      });

    } catch (error) {
      console.error('Error matching with seeker:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to match with seeker',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Accept instant hire (seeker)
   * PUT /api/instant-hires/:instantHireId/accept
   */
  static async acceptInstantHire(req, res) {
    try {
      const { instantHireId } = req.params;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is the matched seeker
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker || seeker.id !== instantHire.seekerId) {
        return res.status(403).json({
          success: false,
          message: 'Only the matched seeker can accept this instant hire'
        });
      }

      const acceptedHire = await instantHire.acceptBySeeker();

      // 🔥 AUTO-TRIGGER HIRING ACCEPTANCE NOTIFICATIONS
      try {
        const company = await Company.findById(instantHire.companyId);
        
        if (company) {
          const hiringData = {
            jobTitle: instantHire.jobTitle,
            jobId: instantHire.jobId,
            id: instantHire.id
          };

          const seekerData = {
            id: seeker.id,
            name: seeker.fullName || `${seeker.firstName} ${seeker.lastName}`,
            fullName: seeker.fullName || `${seeker.firstName} ${seeker.lastName}`,
            email: seeker.email
          };

          const companyData = {
            id: company.id,
            name: company.companyName,
            email: company.companyEmail
          };

          await notificationController.sendHiringAcceptance(hiringData, companyData, seekerData);
          console.log('✅ Hiring acceptance notifications sent successfully');
        }
      } catch (notifError) {
        console.error('❌ Failed to send hiring acceptance notifications:', notifError);
        // Don't fail the main request for notification errors
      }

      res.json({
        success: true,
        message: 'Instant hire accepted successfully',
        data: acceptedHire.toJSON()
      });

    } catch (error) {
      console.error('Error accepting instant hire:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to accept instant hire',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Decline instant hire (seeker)
   * PUT /api/instant-hires/:instantHireId/decline
   */
  static async declineInstantHire(req, res) {
    try {
      const { instantHireId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is the matched seeker
      const seeker = await Seeker.findByUserId(userId);
      if (!seeker || seeker.id !== instantHire.seekerId) {
        return res.status(403).json({
          success: false,
          message: 'Only the matched seeker can decline this instant hire'
        });
      }

      const declinedHire = await instantHire.declineBySeeker(reason);

      res.json({
        success: true,
        message: 'Instant hire declined successfully',
        data: declinedHire.toJSON()
      });

    } catch (error) {
      console.error('Error declining instant hire:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to decline instant hire',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Start work for instant hire
   * PUT /api/instant-hires/:instantHireId/start-work
   */
  static async startWork(req, res) {
    try {
      const { instantHireId } = req.params;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is either company or seeker
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === instantHire.companyId) || 
                       (seeker && seeker.id === instantHire.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const startedHire = await instantHire.startWork();

      res.json({
        success: true,
        message: 'Work started successfully',
        data: startedHire.toJSON()
      });

    } catch (error) {
      console.error('Error starting work:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start work',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Record attendance
   * POST /api/instant-hires/:instantHireId/attendance
   */
  static async recordAttendance(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { instantHireId } = req.params;
      const attendanceData = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is either company or seeker
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === instantHire.companyId) || 
                       (seeker && seeker.id === instantHire.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedHire = await instantHire.recordAttendance(attendanceData);

      res.json({
        success: true,
        message: 'Attendance recorded successfully',
        data: updatedHire.toJSON()
      });

    } catch (error) {
      console.error('Error recording attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record attendance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Complete work
   * PUT /api/instant-hires/:instantHireId/complete
   */
  static async completeWork(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { instantHireId } = req.params;
      const completionData = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Only company can mark as completed
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== instantHire.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Only the hiring company can complete work'
        });
      }

      const completedHire = await instantHire.completeWork(completionData);

      res.json({
        success: true,
        message: 'Work completed successfully',
        data: completedHire.toJSON()
      });

    } catch (error) {
      console.error('Error completing work:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete work',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel instant hire
   * PUT /api/instant-hires/:instantHireId/cancel
   */
  static async cancelInstantHire(req, res) {
    try {
      const { instantHireId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const instantHire = await InstantHire.findById(instantHireId);
      if (!instantHire) {
        return res.status(404).json({
          success: false,
          message: 'Instant hire not found'
        });
      }

      // Verify user is either company or seeker
      const company = await Company.findByUserId(userId);
      const seeker = await Seeker.findByUserId(userId);

      const hasAccess = (company && company.id === instantHire.companyId) || 
                       (seeker && seeker.id === instantHire.seekerId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const cancelledHire = await instantHire.cancel(reason);

      res.json({
        success: true,
        message: 'Instant hire cancelled successfully',
        data: cancelledHire.toJSON()
      });

    } catch (error) {
      console.error('Error cancelling instant hire:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel instant hire',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company instant hire statistics
   * GET /api/companies/:companyId/instant-hire-stats
   */
  static async getCompanyStats(req, res) {
    try {
      const { companyId } = req.params;
      const userId = req.user.userId;

      // Verify user is from this company
      const company = await Company.findByUserId(userId);
      if (!company || company.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const stats = await InstantHire.getCompanyStats(companyId);

      res.json({
        success: true,
        message: 'Company instant hire statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error getting company stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve company statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker instant hire statistics
   * GET /api/seekers/:seekerId/instant-hire-stats
   */
  static async getSeekerStats(req, res) {
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

      const stats = await InstantHire.getSeekerStats(seekerId);

      res.json({
        success: true,
        message: 'Seeker instant hire statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error getting seeker stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve seeker statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get instant hires by status (admin/system use)
   * GET /api/instant-hires/status/:status
   */
  static async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const { limit = 100 } = req.query;

      // This endpoint might require admin permissions in production
      const instantHires = await InstantHire.findByStatus(status, parseInt(limit));

      res.json({
        success: true,
        message: `Instant hires with status '${status}' retrieved successfully`,
        data: instantHires.map(hire => hire.toJSON())
      });

    } catch (error) {
      console.error('Error getting instant hires by status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve instant hires by status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = InstantHireController;