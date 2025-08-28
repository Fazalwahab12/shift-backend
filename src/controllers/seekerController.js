const Seeker = require('../models/Seeker');
const User = require('../models/User');
const OnboardingData = require('../models/OnboardingData');
const { validationResult } = require('express-validator');

/**
 * Seeker Profile Controller
 * Handles job seeker profile management
 */
class SeekerController {

  /**
   * Create seeker profile
   * POST /api/seekers
   */
  static async createProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Validation errors:', errors.array());
        console.log('🔍 Request body:', req.body);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Extract userId from JWT token (set by authenticateToken middleware)
      const userId = req.user.userId;
      const profileData = req.body;

      // Verify user exists and is a seeker
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.userType !== 'seeker') {
        return res.status(400).json({
          success: false,
          message: 'User is not a seeker'
        });
      }

      // Check if profile already exists
      const existingProfile = await Seeker.findByUserId(userId);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: 'Seeker profile already exists',
          data: existingProfile.toPublicJSON()
        });
      }

      // Check for onboarding data to inherit preferences
      const onboardingData = await OnboardingData.findByUserId(userId);
      
      let newSeeker;
      if (onboardingData) {
        // Create profile with onboarding data inheritance
        newSeeker = await Seeker.createFromOnboarding(userId, profileData, onboardingData);
      } else {
        // Create profile without onboarding data
        newSeeker = await Seeker.create(userId, profileData);
      }

      res.status(201).json({
        success: true,
        message: 'Seeker profile created successfully',
        data: {
          ...newSeeker.toPublicJSON(),
          inheritedFromOnboarding: onboardingData ? {
            industries: onboardingData.selectedIndustries,
            roles: onboardingData.selectedRoles,
            experienceLevel: onboardingData.experienceLevel
          } : null
        }
      });

    } catch (error) {
      console.error('Error in createProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker profile by user ID
   * GET /api/seekers/user/:userId
   */
  static async getProfileByUserId(req, res) {
    try {
      const { userId } = req.params;

      const seeker = await Seeker.findByUserId(userId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Seeker profile retrieved successfully',
        data: seeker.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in getProfileByUserId:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker profile by ID
   * GET /api/seekers/:seekerId
   */
  static async getProfileById(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Seeker profile retrieved successfully',
        data: seeker.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in getProfileById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update seeker profile
   * PUT /api/seekers/:seekerId
   */
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Validation errors:', errors.array());
        console.log('🔍 Request body:', req.body);
        return res.status(400).json({
          success: false,
          message: 'Invalid request. Please check your input.',
          errors: errors.array()
        });
      }

      const { seekerId } = req.params;
      const updateData = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.update(updateData);

      res.status(200).json({
        success: true,
        message: 'Seeker profile updated successfully',
        data: seeker.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in updateProfile:', error);
      
      // Handle Firebase quota exceeded error
      if (error.message && error.message.includes('quota')) {
        return res.status(429).json({
          success: false,
          message: 'Database quota exceeded. Please try again later.',
          error: 'Quota exceeded'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update profile step
   * PUT /api/seekers/:seekerId/step/:step
   */
  static async updateProfileStep(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { seekerId, step } = req.params;
      const stepData = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.updateProfileStep(parseInt(step), stepData);

      // If profile is completed, update user record
      if (seeker.isProfileComplete) {
        const user = await User.findById(seeker.userId);
        if (user) {
          await user.completeProfile();
        }
      }

      res.status(200).json({
        success: true,
        message: `Profile step ${step} updated successfully`,
        data: {
          profileCompletionStep: seeker.profileCompletionStep,
          isProfileComplete: seeker.isProfileComplete,
          completionPercentage: seeker.getProfileCompletionPercentage()
        }
      });

    } catch (error) {
    
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search seekers
   * GET /api/seekers/search
   */
  static async searchSeekers(req, res) {
    try {
      const {
        industries,
        roles,
        skills,
        preferredLocations,
        languages,
        availability,
        workType,
        retailAcademyTrained,
        minActivityScore,
        limit
      } = req.query;

      const searchCriteria = {};
      
      if (industries) {
        searchCriteria.industries = Array.isArray(industries) ? industries : industries.split(',');
      }
      
      if (roles) {
        searchCriteria.roles = Array.isArray(roles) ? roles : roles.split(',');
      }
      
      if (skills) {
        searchCriteria.skills = Array.isArray(skills) ? skills : skills.split(',');
      }
      
      if (preferredLocations) {
        searchCriteria.preferredLocations = Array.isArray(preferredLocations) ? preferredLocations : preferredLocations.split(',');
      }
      
      if (languages) {
        searchCriteria.languages = Array.isArray(languages) ? languages : languages.split(',');
      }
      
      if (availability) {
        searchCriteria.availability = availability;
      }
      
      if (workType) {
        searchCriteria.workType = workType;
      }
      
      if (retailAcademyTrained) {
        searchCriteria.retailAcademyTrained = retailAcademyTrained;
      }
      
      if (minActivityScore) {
        searchCriteria.minActivityScore = parseInt(minActivityScore);
      }
      
      if (limit) {
        searchCriteria.limit = parseInt(limit);
      }

      const seekers = await Seeker.search(searchCriteria);

      res.status(200).json({
        success: true,
        message: 'Seekers search completed successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          count: seekers.length,
          searchCriteria
        }
      });

    } catch (error) {
     
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seekers by location
   * GET /api/seekers/location/:location
   */
  static async getSeekersByLocation(req, res) {
    try {
      const { location } = req.params;
      const { limit } = req.query;

      const seekers = await Seeker.getByLocation(
        location, 
        limit ? parseInt(limit) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Seekers by location retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          location,
          count: seekers.length
        }
      });

    } catch (error) {
      console.error('Error in getSeekersByLocation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get profile completion status
   * GET /api/seekers/:seekerId/completion
   */
  static async getProfileCompletion(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      const completionPercentage = seeker.getProfileCompletionPercentage();

      res.status(200).json({
        success: true,
        message: 'Profile completion status retrieved successfully',
        data: {
          seekerId: seeker.id,
          profileCompletionStep: seeker.profileCompletionStep,
          isProfileComplete: seeker.isProfileComplete,
          completionPercentage,
          status: seeker.getStatus(),
          isAvailableForJobs: seeker.isAvailableForJobs(),
          missingFields: completionPercentage < 100 ? [
            !seeker.fullName && 'fullName',
            !seeker.idNumber && 'idNumber',
            !seeker.dateOfBirth && 'dateOfBirth',
            !seeker.gender && 'gender',
            !seeker.mobileNumber && 'mobileNumber',
            !seeker.email && 'email',
            !seeker.profilePhoto && 'profilePhoto',
            !seeker.bio && 'bio',
            !seeker.educationalLevel && 'educationalLevel',
            (!seeker.industries || seeker.industries.length === 0) && 'industries',
            (!seeker.roles || seeker.roles.length === 0) && 'roles',
            !seeker.yearsOfExperience && 'yearsOfExperience',
            (!seeker.skills || seeker.skills.length === 0) && 'skills',
            (!seeker.previousWorkplaces || seeker.previousWorkplaces.length === 0) && 'previousWorkplaces',
            !seeker.availability && 'availability',
            !seeker.currentStatus && 'currentStatus',
            !seeker.workType && 'workType',
            (!seeker.preferredLocations || seeker.preferredLocations.length === 0) && 'preferredLocations',
            (!seeker.languages || seeker.languages.length === 0) && 'languages',
            !seeker.retailAcademyTrained && 'retailAcademyTrained',
            !seeker.acceptedTerms && 'acceptedTerms',
            !seeker.profileConfirmed && 'profileConfirmed'
          ].filter(Boolean) : []
        }
      });

    } catch (error) {
      console.error('Error in getProfileCompletion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload profile photo
   * POST /api/seekers/:seekerId/photo
   */
  static async uploadProfilePhoto(req, res) {
    try {
      const { seekerId } = req.params;
      const { profilePhoto } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.update({ profilePhoto });

      res.status(200).json({
        success: true,
        message: 'Profile photo updated successfully',
        data: {
          profilePhoto: seeker.profilePhoto
        }
      });

    } catch (error) {
      console.error('Error in uploadProfilePhoto:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload CV
   * POST /api/seekers/:seekerId/cv
   */
  static async uploadCV(req, res) {
    try {
      const { seekerId } = req.params;
      const { cvFile } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.update({ cvFile });

      res.status(200).json({
        success: true,
        message: 'CV uploaded successfully',
        data: {
          cvFile: seeker.cvFile
        }
      });

    } catch (error) {
      console.error('Error in uploadCV:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete seeker profile
   * DELETE /api/seekers/:seekerId
   */
  static async deleteProfile(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      // Soft delete by deactivating
      await seeker.update({ isActive: false });

      res.status(200).json({
        success: true,
        message: 'Seeker profile deactivated successfully',
        data: {
          seekerId: seeker.id,
          isActive: seeker.isActive
        }
      });

    } catch (error) {
      console.error('Error in deleteProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Request video recording
   * POST /api/seekers/:seekerId/request-video
   */
  static async requestVideoRecording(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.requestVideoRecording();

      res.status(200).json({
        success: true,
        message: 'Video recording request submitted successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in requestVideoRecording:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Schedule video recording (Admin only)
   * POST /api/seekers/:seekerId/schedule-video
   */
  static async scheduleVideoRecording(req, res) {
    try {
      const { seekerId } = req.params;
      const { scheduledDate, location, adminNotes } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.scheduleVideoRecording(scheduledDate, location, adminNotes);

      res.status(200).json({
        success: true,
        message: 'Video recording scheduled successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in scheduleVideoRecording:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark video as recorded (Admin only)
   * POST /api/seekers/:seekerId/mark-video-recorded
   */
  static async markVideoRecorded(req, res) {
    try {
      const { seekerId } = req.params;
      const { adminNotes } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.markVideoRecorded(adminNotes);

      res.status(200).json({
        success: true,
        message: 'Video marked as recorded successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in markVideoRecorded:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Publish video (Admin only)
   * POST /api/seekers/:seekerId/publish-video
   */
  static async publishVideo(req, res) {
    try {
      const { seekerId } = req.params;
      const { videoUrl, adminNotes } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.publishVideo(videoUrl, adminNotes);

      res.status(200).json({
        success: true,
        message: 'Video published successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in publishVideo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reject video request (Admin only)
   * POST /api/seekers/:seekerId/reject-video
   */
  static async rejectVideoRequest(req, res) {
    try {
      const { seekerId } = req.params;
      const { reason } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.rejectVideoRequest(reason);

      res.status(200).json({
        success: true,
        message: 'Video request rejected successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in rejectVideoRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get video workflow status
   * GET /api/seekers/:seekerId/video-status
   */
  static async getVideoStatus(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Video workflow status retrieved successfully',
        data: seeker.getVideoWorkflowStatus()
      });

    } catch (error) {
      console.error('Error in getVideoStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add strike for no-show (Admin only)
   * POST /api/seekers/:seekerId/add-strike
   */
  static async addStrike(req, res) {
    try {
      const { seekerId } = req.params;
      const { reason } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.addStrike(reason);

      res.status(200).json({
        success: true,
        message: 'Strike added successfully',
        data: {
          seekerId: seeker.id,
          strikeCount: seeker.strikeCount,
          status: seeker.getStatus(),
          activityScore: seeker.activityScore
        }
      });

    } catch (error) {
      console.error('Error in addStrike:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update activity score
   * POST /api/seekers/:seekerId/update-activity-score
   */
  static async updateActivityScore(req, res) {
    try {
      const { seekerId } = req.params;
      const { scoreChange } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.updateActivityScore(scoreChange);

      res.status(200).json({
        success: true,
        message: 'Activity score updated successfully',
        data: {
          seekerId: seeker.id,
          activityScore: seeker.activityScore,
          lastLoginAt: seeker.lastLoginAt
        }
      });

    } catch (error) {
      console.error('Error in updateActivityScore:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get high-performing seekers
   * GET /api/seekers/high-performers
   */
  static async getHighPerformers(req, res) {
    try {
      const { limit } = req.query;

      const seekers = await Seeker.getHighPerformers(limit ? parseInt(limit) : 20);

      res.status(200).json({
        success: true,
        message: 'High-performing seekers retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          count: seekers.length
        }
      });

    } catch (error) {
      console.error('Error in getHighPerformers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seekers with pending video requests (Admin only)
   * GET /api/seekers/admin/video-pending
   */
  static async getVideoPendingRequests(req, res) {
    try {
      const { limit } = req.query;

      const seekers = await Seeker.getVideoPendingRequests(limit ? parseInt(limit) : 50);

      res.status(200).json({
        success: true,
        message: 'Video pending requests retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          count: seekers.length
        }
      });

    } catch (error) {
      console.error('Error in getVideoPendingRequests:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seekers with scheduled video recordings (Admin only)
   * GET /api/seekers/admin/video-scheduled
   */
  static async getScheduledVideoRecordings(req, res) {
    try {
      const { limit } = req.query;

      const seekers = await Seeker.getScheduledVideoRecordings(limit ? parseInt(limit) : 50);

      res.status(200).json({
        success: true,
        message: 'Scheduled video recordings retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          count: seekers.length
        }
      });

    } catch (error) {
      console.error('Error in getScheduledVideoRecordings:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seekers with recorded videos pending publication (Admin only)
   * GET /api/seekers/admin/video-recorded
   */
  static async getRecordedVideosPendingPublication(req, res) {
    try {
      const { limit } = req.query;

      const seekers = await Seeker.getRecordedVideosPendingPublication(limit ? parseInt(limit) : 50);

      res.status(200).json({
        success: true,
        message: 'Recorded videos pending publication retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          count: seekers.length
        }
      });

    } catch (error) {
      console.error('Error in getRecordedVideosPendingPublication:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get video workflow statistics (Admin only)
   * GET /api/seekers/admin/video-stats
   */
  static async getVideoWorkflowStats(req, res) {
    try {
      const stats = await Seeker.getVideoWorkflowStats();

      res.status(200).json({
        success: true,
        message: 'Video workflow statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getVideoWorkflowStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Record job application
   * POST /api/seekers/:seekerId/apply-job
   */
  static async recordJobApplication(req, res) {
    try {
      const { seekerId } = req.params;
      const { jobId, companyId, jobTitle, companyName } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.recordJobApplication(jobId, companyId, jobTitle, companyName);

      res.status(200).json({
        success: true,
        message: 'Job application recorded successfully',
        data: {
          seekerId: seeker.id,
          totalJobsAppliedTo: seeker.totalJobsAppliedTo,
          lastActiveDate: seeker.lastActiveDate
        }
      });

    } catch (error) {
      console.error('Error in recordJobApplication:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Record interview
   * POST /api/seekers/:seekerId/record-interview
   */
  static async recordInterview(req, res) {
    try {
      const { seekerId } = req.params;
      const { jobId, companyId, interviewDate, interviewType, status } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.recordInterview(jobId, companyId, interviewDate, interviewType, status);

      res.status(200).json({
        success: true,
        message: 'Interview recorded successfully',
        data: {
          seekerId: seeker.id,
          numberOfInterviews: seeker.numberOfInterviews,
          lastActiveDate: seeker.lastActiveDate
        }
      });

    } catch (error) {
      console.error('Error in recordInterview:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Record no-show
   * POST /api/seekers/:seekerId/record-no-show
   */
  static async recordNoShow(req, res) {
    try {
      const { seekerId } = req.params;
      const { jobId, companyId, reason } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.recordNoShow(jobId, companyId, reason);

      res.status(200).json({
        success: true,
        message: 'No-show recorded successfully',
        data: {
          seekerId: seeker.id,
          numberOfNoShows: seeker.numberOfNoShows,
          strikeCount: seeker.strikeCount,
          status: seeker.getStatus()
        }
      });

    } catch (error) {
      console.error('Error in recordNoShow:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Record hire/job completion
   * POST /api/seekers/:seekerId/record-hire
   */
  static async recordHire(req, res) {
    try {
      const { seekerId } = req.params;
      const { jobId, companyId, jobTitle, companyName, startDate, endDate, rating } = req.body;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      await seeker.recordHire(jobId, companyId, jobTitle, companyName, startDate, endDate, rating);

      res.status(200).json({
        success: true,
        message: 'Hire recorded successfully',
        data: {
          seekerId: seeker.id,
          numberOfHires: seeker.numberOfHires,
          averageRating: seeker.averageRating,
          lastActiveDate: seeker.lastActiveDate
        }
      });

    } catch (error) {
      console.error('Error in recordHire:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seeker statistics (for CSV export)
   * GET /api/seekers/:seekerId/stats
   */
  static async getSeekerStats(req, res) {
    try {
      const { seekerId } = req.params;

      const seeker = await Seeker.findById(seekerId);
      if (!seeker) {
        return res.status(404).json({
          success: false,
          message: 'Seeker profile not found'
        });
      }

      const stats = seeker.getSeekerStats();

      res.status(200).json({
        success: true,
        message: 'Seeker statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getSeekerStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload image to Firebase Storage
   * POST /api/seekers/upload-image
   */
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // For now, return a placeholder URL since Firebase Storage integration isn't shown
      // In a real implementation, you would upload to Firebase Storage here
      const imageUrl = `https://placeholder-storage.com/${Date.now()}-${req.file.originalname}`;

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: imageUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        }
      });

    } catch (error) {
      console.error('Error in uploadImage:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Export all seekers data (Admin only)
   * GET /api/seekers/admin/export-csv
   */
  static async exportSeekerData(req, res) {
    try {
      const { limit = 1000 } = req.query;

      // Get all active seekers
      const seekers = await Seeker.search({ 
        limit: parseInt(limit)
      });

      const csvData = seekers.map(seeker => seeker.getSeekerStats());

      res.status(200).json({
        success: true,
        message: 'Seeker data exported successfully',
        data: {
          seekers: csvData,
          count: csvData.length,
          exportedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error in exportSeekerData:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = SeekerController;