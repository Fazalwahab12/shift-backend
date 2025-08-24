const OnboardingData = require('../models/OnboardingData');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Onboarding Controller
 * Handles user onboarding data and preferences
 */
class OnboardingController {

  /**
   * Create or update onboarding data
   * POST /api/onboarding
   */
  static async createOrUpdateOnboarding(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Get userId from token (set by auth middleware)
      const { userId } = req.user;
      const { userType, ...onboardingData } = req.body;

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if onboarding data already exists
      let existingOnboarding = await OnboardingData.findByUserId(userId);
      
      if (existingOnboarding) {
        // Update existing onboarding data
        await existingOnboarding.update(onboardingData);
        
        // Mark user onboarding as completed
        await user.completeOnboarding();
        
        res.status(200).json({
          success: true,
          message: 'Onboarding data updated successfully',
          data: {
            ...existingOnboarding.toPublicJSON(),
            nextStep: 'profile_creation'
          }
        });
      } else {
        // Create new onboarding data
        const newOnboarding = await OnboardingData.create(userId, userType, onboardingData);
        
        // Mark user onboarding as completed
        await user.completeOnboarding();
        
        res.status(201).json({
          success: true,
          message: 'Onboarding data created successfully',
          data: {
            ...newOnboarding.toPublicJSON(),
            nextStep: 'profile_creation'
          }
        });
      }

    } catch (error) {
      console.error('Error in createOrUpdateOnboarding:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get onboarding data by user ID
   * GET /api/onboarding/:userId
   */
  static async getOnboardingByUserId(req, res) {
    try {
      const { userId } = req.params;

      const onboardingData = await OnboardingData.findByUserId(userId);
      
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Onboarding data retrieved successfully',
        data: onboardingData.toPublicJSON()
      });

    } catch (error) {
      console.error('Error in getOnboardingByUserId:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add industry preference
   * POST /api/onboarding/:userId/industry
   */
  static async addIndustry(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { industry } = req.body;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.addIndustry(industry);

      res.status(200).json({
        success: true,
        message: 'Industry added successfully',
        data: {
          selectedIndustries: onboardingData.selectedIndustries
        }
      });

    } catch (error) {
      console.error('Error in addIndustry:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Remove industry preference
   * DELETE /api/onboarding/:userId/industry/:industry
   */
  static async removeIndustry(req, res) {
    try {
      const { userId, industry } = req.params;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.removeIndustry(decodeURIComponent(industry));

      res.status(200).json({
        success: true,
        message: 'Industry removed successfully',
        data: {
          selectedIndustries: onboardingData.selectedIndustries
        }
      });

    } catch (error) {
      console.error('Error in removeIndustry:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add role preference
   * POST /api/onboarding/:userId/role
   */
  static async addRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { role } = req.body;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.addRole(role);

      res.status(200).json({
        success: true,
        message: 'Role added successfully',
        data: {
          selectedRoles: onboardingData.selectedRoles
        }
      });

    } catch (error) {
      console.error('Error in addRole:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Remove role preference
   * DELETE /api/onboarding/:userId/role/:role
   */
  static async removeRole(req, res) {
    try {
      const { userId, role } = req.params;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.removeRole(decodeURIComponent(role));

      res.status(200).json({
        success: true,
        message: 'Role removed successfully',
        data: {
          selectedRoles: onboardingData.selectedRoles
        }
      });

    } catch (error) {
      console.error('Error in removeRole:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Complete onboarding step
   * POST /api/onboarding/:userId/complete-step
   */
  static async completeStep(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.params;

      // Mark user onboarding as completed regardless of step
      const user = await User.findById(userId);
      if (user) {
        await user.completeOnboarding();
      }

      res.status(200).json({
        success: true,
        message: 'Step completed successfully',
        data: {
          nextStep: 'profile_creation'
        }
      });

    } catch (error) {
      console.error('Error in completeStep:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get onboarding statistics
   * GET /api/onboarding/stats
   */
  static async getStats(req, res) {
    try {
      const { userType } = req.query;

      const stats = await OnboardingData.getStats(userType);

      res.status(200).json({
        success: true,
        message: 'Onboarding statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get popular industries
   * GET /api/onboarding/popular-industries
   */
  static async getPopularIndustries(req, res) {
    try {
      const { userType, limit } = req.query;

      const popularIndustries = await OnboardingData.getPopularIndustries(
        userType, 
        limit ? parseInt(limit) : 10
      );

      res.status(200).json({
        success: true,
        message: 'Popular industries retrieved successfully',
        data: popularIndustries
      });

    } catch (error) {
      console.error('Error in getPopularIndustries:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get popular roles
   * GET /api/onboarding/popular-roles
   */
  static async getPopularRoles(req, res) {
    try {
      const { userType, limit } = req.query;

      const popularRoles = await OnboardingData.getPopularRoles(
        userType, 
        limit ? parseInt(limit) : 10
      );

      res.status(200).json({
        success: true,
        message: 'Popular roles retrieved successfully',
        data: popularRoles
      });

    } catch (error) {
      console.error('Error in getPopularRoles:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }



  /**
   * Add social media preference
   * POST /api/onboarding/:userId/social-media
   */
  static async addSocialMediaPreference(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { socialMedia } = req.body;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.addSocialMediaPreference(socialMedia);

      res.status(200).json({
        success: true,
        message: 'Social media preference added successfully',
        data: {
          preferredSocialMedia: onboardingData.preferredSocialMedia
        }
      });

    } catch (error) {
      console.error('Error in addSocialMediaPreference:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Remove social media preference
   * DELETE /api/onboarding/:userId/social-media/:socialMedia
   */
  static async removeSocialMediaPreference(req, res) {
    try {
      const { userId, socialMedia } = req.params;

      const onboardingData = await OnboardingData.findByUserId(userId);
      if (!onboardingData) {
        return res.status(404).json({
          success: false,
          message: 'Onboarding data not found'
        });
      }

      await onboardingData.removeSocialMediaPreference(decodeURIComponent(socialMedia));

      res.status(200).json({
        success: true,
        message: 'Social media preference removed successfully',
        data: {
          preferredSocialMedia: onboardingData.preferredSocialMedia
        }
      });

    } catch (error) {
      console.error('Error in removeSocialMediaPreference:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

}

module.exports = OnboardingController;