const User = require('../models/User');
const OnboardingData = require('../models/OnboardingData');
const Seeker = require('../models/Seeker');
const Company = require('../models/Company');
const { validationResult } = require('express-validator');

/**
 * User Journey Controller
 * Handles user journey status and progress tracking
 */
class UserJourneyController {

  /**
   * Get complete user journey status
   * GET /api/journey/:userId
   */
  static async getUserJourneyStatus(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get onboarding data
      const onboardingData = await OnboardingData.findByUserId(userId);
      
      // Get profile data based on user type
      let profileData = null;
      let profileCompletionPercentage = 0;
      
      if (user.userType === 'seeker') {
        profileData = await Seeker.findByUserId(userId);
        if (profileData) {
          profileCompletionPercentage = profileData.getProfileCompletionPercentage();
        }
      } else if (user.userType === 'company') {
        profileData = await Company.findByUserId(userId);
        if (profileData) {
          profileCompletionPercentage = profileData.getProfileCompletionPercentage();
        }
      }

      // Determine current step and next action
      let currentStep = 'phone_registration';
      let nextStep = 'otp_verification';
      let canProceed = true;

      if (user.isPhoneVerified) {
        currentStep = 'phone_verified';
        nextStep = 'onboarding';
        
        if (user.onboardingCompleted) {
          currentStep = 'onboarding_completed';
          nextStep = 'profile_creation';
          
          if (user.profileCompleted) {
            currentStep = 'profile_completed';
            nextStep = 'complete';
          } else if (profileData) {
            currentStep = 'profile_in_progress';
            nextStep = 'complete_profile';
          }
        } else if (onboardingData && !onboardingData.isCompleted) {
          currentStep = 'onboarding_in_progress';
          nextStep = 'complete_onboarding';
        }
      }

      // Calculate overall completion percentage
      const steps = ['phone_registration', 'phone_verified', 'onboarding_completed', 'profile_completed'];
      let completedSteps = 0;
      
      if (user.phoneNumber) completedSteps++;
      if (user.isPhoneVerified) completedSteps++;
      if (user.onboardingCompleted) completedSteps++;
      if (user.profileCompleted) completedSteps++;
      
      const overallCompletionPercentage = Math.round((completedSteps / steps.length) * 100);

      res.status(200).json({
        success: true,
        message: 'User journey status retrieved successfully',
        data: {
          userId: user.id,
          userType: user.userType,
          currentStep,
          nextStep,
          canProceed,
          overallCompletionPercentage,
          phoneRegistration: {
            completed: !!user.phoneNumber,
            phoneNumber: user.phoneNumber,
            countryCode: user.countryCode,
            registeredAt: user.createdAt
          },
          phoneVerification: {
            completed: user.isPhoneVerified,
            verifiedAt: user.lastLoginAt
          },
          onboarding: {
            completed: user.onboardingCompleted,
            inProgress: !!onboardingData && !onboardingData.isCompleted,
            completionPercentage: onboardingData ? onboardingData.completionPercentage : 0,
            selectedIndustries: onboardingData?.selectedIndustries || [],
            selectedRoles: onboardingData?.selectedRoles || [],
            experienceLevel: onboardingData?.experienceLevel,
            hiringNeeds: onboardingData?.hiringNeeds,
            referralSource: onboardingData?.referralSource
          },
          profile: {
            completed: user.profileCompleted,
            exists: !!profileData,
            completionPercentage: profileCompletionPercentage,
            currentStep: profileData?.profileCompletionStep || 0,
            totalSteps: user.userType === 'seeker' ? 5 : 6,
            isVerified: profileData?.isVerified || false
          },
          summary: {
            stepsCompleted: completedSteps,
            totalSteps: steps.length,
            completionPercentage: overallCompletionPercentage,
            readyForJobMatching: user.profileCompleted && user.isPhoneVerified,
            lastActivity: user.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('Error in getUserJourneyStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user journey statistics
   * GET /api/journey/stats
   */
  static async getJourneyStats(req, res) {
    try {
      const { userType } = req.query;
      
      // Get all users
      const allUsers = await User.getAll(1, 1000, userType);
      
      // Calculate statistics
      const stats = {
        total: allUsers.length,
        phoneRegistered: allUsers.length,
        phoneVerified: allUsers.filter(user => user.isPhoneVerified).length,
        onboardingCompleted: allUsers.filter(user => user.onboardingCompleted).length,
        profileCompleted: allUsers.filter(user => user.profileCompleted).length,
        fullyCompleted: allUsers.filter(user => 
          user.isPhoneVerified && user.onboardingCompleted && user.profileCompleted
        ).length
      };

      // Calculate completion rates
      stats.phoneVerificationRate = stats.total > 0 ? ((stats.phoneVerified / stats.total) * 100).toFixed(2) : 0;
      stats.onboardingCompletionRate = stats.total > 0 ? ((stats.onboardingCompleted / stats.total) * 100).toFixed(2) : 0;
      stats.profileCompletionRate = stats.total > 0 ? ((stats.profileCompleted / stats.total) * 100).toFixed(2) : 0;
      stats.fullCompletionRate = stats.total > 0 ? ((stats.fullyCompleted / stats.total) * 100).toFixed(2) : 0;

      if (userType) {
        stats.userType = userType;
      }

      res.status(200).json({
        success: true,
        message: 'Journey statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getJourneyStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get recommended next actions for user
   * GET /api/journey/:userId/next-actions
   */
  static async getNextActions(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const actions = [];

      if (!user.isPhoneVerified) {
        actions.push({
          action: 'verify_phone',
          title: 'Verify Phone Number',
          description: 'Complete OTP verification to continue',
          priority: 'high',
          endpoint: 'PUT /api/phone/verify'
        });
      } else if (!user.onboardingCompleted) {
        actions.push({
          action: 'complete_onboarding',
          title: 'Complete Onboarding',
          description: 'Select your industry and role preferences',
          priority: 'high',
          endpoint: 'POST /api/onboarding'
        });
      } else if (!user.profileCompleted) {
        const profileType = user.userType === 'seeker' ? 'seeker' : 'company';
        actions.push({
          action: 'create_profile',
          title: `Create ${profileType} Profile`,
          description: `Complete your ${profileType} profile to start ${user.userType === 'seeker' ? 'finding jobs' : 'posting jobs'}`,
          priority: 'high',
          endpoint: `POST /api/${user.userType === 'seeker' ? 'seekers' : 'companies'}`
        });
      } else {
        // User has completed everything - suggest next steps
        if (user.userType === 'seeker') {
          actions.push({
            action: 'browse_jobs',
            title: 'Browse Jobs',
            description: 'Start looking for job opportunities',
            priority: 'medium',
            endpoint: 'GET /api/jobs/search'
          });
        } else {
          actions.push({
            action: 'post_job',
            title: 'Post a Job',
            description: 'Create your first job posting',
            priority: 'medium',
            endpoint: 'POST /api/jobs'
          });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Next actions retrieved successfully',
        data: {
          userId: user.id,
          userType: user.userType,
          actions,
          totalActions: actions.length
        }
      });

    } catch (error) {
      console.error('Error in getNextActions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = UserJourneyController;