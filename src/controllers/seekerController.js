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
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, ...profileData } = req.body;

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
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
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
      res.status(500).json({
        success: false,
        message: 'Internal server error',
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
      console.error('Error in updateProfileStep:', error);
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
        experienceLevel,
        governorate,
        limit,
        page
      } = req.query;

      const searchCriteria = {};
      
      if (industries) {
        searchCriteria.industries = Array.isArray(industries) ? industries : industries.split(',');
      }
      
      if (roles) {
        searchCriteria.roles = Array.isArray(roles) ? roles : roles.split(',');
      }
      
      if (experienceLevel) {
        searchCriteria.experienceLevel = experienceLevel;
      }
      
      if (governorate) {
        searchCriteria.governorate = governorate;
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
      console.error('Error in searchSeekers:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get seekers by location
   * GET /api/seekers/location/:governorate
   */
  static async getSeekersByLocation(req, res) {
    try {
      const { governorate } = req.params;
      const { limit } = req.query;

      const seekers = await Seeker.getByLocation(
        governorate, 
        limit ? parseInt(limit) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Seekers by location retrieved successfully',
        data: {
          seekers: seekers.map(seeker => seeker.toPublicJSON()),
          governorate,
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
          missingFields: completionPercentage < 100 ? [
            !seeker.firstName && 'firstName',
            !seeker.lastName && 'lastName',
            !seeker.email && 'email',
            !seeker.dateOfBirth && 'dateOfBirth',
            !seeker.gender && 'gender',
            !seeker.governorate && 'governorate',
            !seeker.experienceLevel && 'experienceLevel',
            (!seeker.industries || seeker.industries.length === 0) && 'industries',
            (!seeker.roles || seeker.roles.length === 0) && 'roles'
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
}

module.exports = SeekerController;