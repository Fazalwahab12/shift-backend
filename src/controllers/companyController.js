const Company = require('../models/Company');
const User = require('../models/User');
const OnboardingData = require('../models/OnboardingData');
const { validationResult } = require('express-validator');
const notificationController = require('./notificationController');
const NotificationHelper = require('../utils/notificationHelper');

/**
 * Company Profile Controller
 * Handles company profile management
 */
class CompanyController {

  /**
   * Create company profile
   * POST /api/companies
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

      // Extract userId from JWT token (set by authenticateToken middleware)
      const userId = req.user.userId;
      const profileData = req.body;

      // Verify user exists and is a company
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.userType !== 'company') {
        return res.status(400).json({
          success: false,
          message: 'User is not a company'
        });
      }

      // Check if profile already exists
      const existingProfile = await Company.findByUserId(userId);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: 'Company profile already exists',
          data: existingProfile.toPublicJSON()
        });
      }

      // Check if commercial registration number already exists
      if (profileData.crNumber) {
        const existingCR = await Company.findByRegistrationNumber(profileData.crNumber);
        if (existingCR) {
          return res.status(409).json({
            success: false,
            message: 'Commercial registration number already exists'
          });
        }
      }

      // Check for onboarding data to inherit preferences
      const onboardingData = await OnboardingData.findByUserId(userId);
      
      let newCompany;
      if (onboardingData) {
        // Create profile with onboarding data inheritance
        newCompany = await Company.createFromOnboarding(userId, profileData, onboardingData);
      } else {
        // Create profile without onboarding data
        newCompany = await Company.create(userId, profileData);
      }

      // Send notification after successful company creation
      try {
        const companyData = {
          id: newCompany.id,
          name: newCompany.companyName,
          companyName: newCompany.companyName,
          email: newCompany.companyEmail || user.email
        };
        
        // Send company account created notification using helper
        await NotificationHelper.triggerCompanyAccountCreated(companyData, NotificationHelper.getAdminEmails());
        console.log('✅ Company creation notification sent successfully');
      } catch (notificationError) {
        console.error('⚠️  Failed to send company creation notification:', notificationError);
        // Don't fail the whole request for notification error
      }

      res.status(201).json({
        success: true,
        message: 'Company profile created successfully',
        data: {
          ...newCompany.toPublicJSON(),
          inheritedFromOnboarding: onboardingData ? {
            primaryIndustry: onboardingData.selectedIndustries[0],
            secondaryIndustries: onboardingData.selectedIndustries.slice(1),
            typicalHiringRoles: onboardingData.typicalHiringRoles || onboardingData.selectedRoles,
            hiringNeeds: onboardingData.hiringNeeds
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
   * Get company profile by user ID
   * GET /api/companies/user/:userId
   */
  static async getProfileByUserId(req, res) {
    try {
      const { userId } = req.params;

      const company = await Company.findByUserId(userId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Company profile retrieved successfully',
        data: company.toPublicJSON()
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
   * Get company profile by ID
   * GET /api/companies/:companyId
   */
  static async getProfileById(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Company profile retrieved successfully',
        data: company.toPublicJSON()
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
   * Update company profile
   * PUT /api/companies/:companyId
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

      const { companyId } = req.params;
      const updateData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Check if commercial registration number is being updated and already exists
      if (updateData.crNumber && 
          updateData.crNumber !== company.crNumber) {
        const existingCR = await Company.findByRegistrationNumber(updateData.crNumber);
        if (existingCR) {
          return res.status(409).json({
            success: false,
            message: 'Commercial registration number already exists'
          });
        }
      }

      await company.update(updateData);

      res.status(200).json({
        success: true,
        message: 'Company profile updated successfully',
        data: company.toPublicJSON()
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
   * PUT /api/companies/:companyId/step/:step
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

      const { companyId, step } = req.params;
      const stepData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.updateProfileStep(parseInt(step), stepData);

      // If profile is completed, update user record
      if (company.isProfileComplete) {
        const user = await User.findById(company.userId);
        if (user) {
          await user.completeProfile();

          // 🔥 AUTO-TRIGGER PROFILE COMPLETED NOTIFICATIONS
          try {
            const companyData = {
              id: company.id,
              userId: company.userId,
              name: company.companyName,
              companyName: company.companyName,
              email: user.email || company.companyEmail
            };

            await NotificationHelper.triggerCompanyProfileCompleted(companyData, NotificationHelper.getAdminEmails());
            console.log('✅ Company profile completed notifications sent successfully');
          } catch (notifError) {
            console.error('❌ Failed to send profile completed notifications:', notifError);
            // Don't fail the main request for notification errors
          }
        }
      }

      res.status(200).json({
        success: true,
        message: `Profile step ${step} updated successfully`,
        data: {
          profileCompletionStep: company.profileCompletionStep,
          isProfileComplete: company.isProfileComplete,
          completionPercentage: company.getProfileCompletionPercentage()
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
   * Search companies
   * GET /api/companies/search
   */
  static async searchCompanies(req, res) {
    try {
      const {
        industry,
        governorate,
        companySize,
        limit,
        page
      } = req.query;

      const searchCriteria = {};
      
      if (industry) {
        searchCriteria.industry = industry;
      }
      
      if (governorate) {
        searchCriteria.governorate = governorate;
      }
      
      if (companySize) {
        searchCriteria.companySize = companySize;
      }
      
      if (limit) {
        searchCriteria.limit = parseInt(limit);
      }

      const companies = await Company.search(searchCriteria);

      res.status(200).json({
        success: true,
        message: 'Companies search completed successfully',
        data: {
          companies: companies.map(company => company.toPublicJSON()),
          count: companies.length,
          searchCriteria
        }
      });

    } catch (error) {
      console.error('Error in searchCompanies:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get companies by industry
   * GET /api/companies/industry/:industry
   */
  static async getCompaniesByIndustry(req, res) {
    try {
      const { industry } = req.params;
      const { limit } = req.query;

      const companies = await Company.getByIndustry(
        industry, 
        limit ? parseInt(limit) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Companies by industry retrieved successfully',
        data: {
          companies: companies.map(company => company.toPublicJSON()),
          industry,
          count: companies.length
        }
      });

    } catch (error) {
      console.error('Error in getCompaniesByIndustry:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get profile completion status
   * GET /api/companies/:companyId/completion
   */
  static async getProfileCompletion(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const completionPercentage = company.getProfileCompletionPercentage();

      res.status(200).json({
        success: true,
        message: 'Profile completion status retrieved successfully',
        data: {
          companyId: company.id,
          profileCompletionStep: company.profileCompletionStep,
          isProfileComplete: company.isProfileComplete,
          completionPercentage,
          missingFields: completionPercentage < 100 ? [
            !company.companyName && 'companyName',
            !company.crNumber && 'crNumber',
            !company.primaryIndustry && 'primaryIndustry',
            !company.companyEmail && 'companyEmail',
            !company.companyPhone && 'companyPhone',
            (!company.headquarters || Object.keys(company.headquarters).length === 0) && 'headquarters'
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
   * Upload company logo
   * POST /api/companies/:companyId/logo
   */
  static async uploadCompanyLogo(req, res) {
    try {
      const { companyId } = req.params;
      const { companyLogo } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.update({ companyLogo });

      res.status(200).json({
        success: true,
        message: 'Company logo updated successfully',
        data: {
          companyLogo: company.companyLogo
        }
      });

    } catch (error) {
      console.error('Error in uploadCompanyLogo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload cover photo
   * POST /api/companies/:companyId/cover
   */
  static async uploadCoverPhoto(req, res) {
    try {
      const { companyId } = req.params;
      const { coverPhoto } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.update({ coverPhoto });

      res.status(200).json({
        success: true,
        message: 'Cover photo updated successfully',
        data: {
          coverPhoto: company.coverPhoto
        }
      });

    } catch (error) {
      console.error('Error in uploadCoverPhoto:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check commercial registration number
   * GET /api/companies/check-registration/:crNumber
   */
  static async checkRegistrationNumber(req, res) {
    try {
      const { crNumber } = req.params;

      const exists = await Company.registrationExists(crNumber);

      res.status(200).json({
        success: true,
        message: 'Commercial registration check completed',
        data: {
          commercialRegistrationNumber: crNumber,
          exists: exists
        }
      });

    } catch (error) {
      console.error('Error in checkRegistrationNumber:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update company rating
   * POST /api/companies/:companyId/rating
   */
  static async updateRating(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { rating } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.updateRating(rating);

      res.status(200).json({
        success: true,
        message: 'Company rating updated successfully',
        data: {
          averageRating: company.averageRating,
          totalReviews: company.totalReviews
        }
      });

    } catch (error) {
      console.error('Error in updateRating:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update trial status
   * PUT /api/companies/:companyId/trial-status
   */
  static async updateTrialStatus(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.updateTrialStatus();

      res.status(200).json({
        success: true,
        message: 'Trial status updated successfully',
        data: {
          companyId: company.id,
          trialDaysRemaining: company.trialDaysRemaining,
          trialExpired: company.trialExpired,
          subscriptionStatus: company.getSubscriptionStatus()
        }
      });

    } catch (error) {
      console.error('Error in updateTrialStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add payment method
   * POST /api/companies/:companyId/payment-methods
   */
  static async addPaymentMethod(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const paymentMethodData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.addPaymentMethod(paymentMethodData);

      res.status(200).json({
        success: true,
        message: 'Payment method added successfully',
        data: {
          paymentMethods: company.paymentMethods,
          defaultPaymentMethod: company.defaultPaymentMethod
        }
      });

    } catch (error) {
      console.error('Error in addPaymentMethod:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Purchase subscription
   * POST /api/companies/:companyId/purchase-subscription
   */
  static async purchaseSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { planType, paymentMethodId, billingCycle = 'monthly' } = req.body;

      if (!['starter', 'professional'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription plan type'
        });
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid billing cycle'
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Payment method ID is required'
        });
      }

      // Verify payment method exists
      const paymentMethod = company.paymentMethods.find(pm => pm.id === paymentMethodId);
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      await company.purchaseSubscription(planType, paymentMethodId, billingCycle);

      res.status(200).json({
        success: true,
        message: 'Subscription purchased successfully',
        data: {
          subscriptionPlan: company.subscriptionPlan,
          subscriptionStatus: company.subscriptionStatus,
          nextBillingDate: company.nextBillingDate,
          planLimits: company.planLimits
        }
      });

    } catch (error) {
      console.error('Error in purchaseSubscription:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Process pay-as-you-go payment
   * POST /api/companies/:companyId/payg-payment
   */
  static async processPAYGPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { matches, interviewPackage, paymentMethodId } = req.body;

      if (!matches || matches < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid number of matches'
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Payment method ID is required'
        });
      }

      // Verify payment method exists
      const paymentMethod = company.paymentMethods.find(pm => pm.id === paymentMethodId);
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      await company.processPAYGPayment(matches, interviewPackage, paymentMethodId);

      res.status(200).json({
        success: true,
        message: 'Pay-as-you-go payment processed successfully',
        data: {
          creditBalance: company.creditBalance,
          usageStats: company.usageStats
        }
      });

    } catch (error) {
      console.error('Error in processPAYGPayment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Request custom plan
   * POST /api/companies/:companyId/request-custom-plan
   */
  static async requestCustomPlan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const planDetails = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.requestCustomPlan(planDetails);

      res.status(200).json({
        success: true,
        message: 'Custom plan request submitted successfully',
        data: {
          customPlanRequested: company.customPlanRequested,
          customPlanDetails: company.customPlanDetails
        }
      });

    } catch (error) {
      console.error('Error in requestCustomPlan:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Contact admin
   * POST /api/companies/:companyId/contact-admin
   */
  static async contactAdmin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.contactAdmin(message);

      res.status(200).json({
        success: true,
        message: 'Admin contact request submitted successfully',
        data: {
          adminContactRequested: company.adminContactRequested,
          adminNotes: company.adminNotes
        }
      });

    } catch (error) {
      console.error('Error in contactAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add team member
   * POST /api/companies/:companyId/team-members
   */
  static async addTeamMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { email } = req.body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Valid email is required'
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Check if email already exists in team members
      const existingMember = company.teamMembers.find(member => member.email === email);
      if (existingMember) {
        return res.status(409).json({
          success: false,
          message: 'Team member with this email already exists'
        });
      }

      await company.addTeamMember(email);

      res.status(200).json({
        success: true,
        message: 'Team member added successfully',
        data: {
          teamMembers: company.teamMembers
        }
      });

    } catch (error) {
      console.error('Error in addTeamMember:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add brand
   * POST /api/companies/:companyId/brands
   */
  static async addBrand(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const brandData = req.body;

      if (!brandData.name || brandData.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Brand name is required'
        });
      }

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.addBrand(brandData);

      res.status(200).json({
        success: true,
        message: 'Brand added successfully',
        data: {
          brands: company.brands,
          primaryBrand: company.primaryBrand
        }
      });

    } catch (error) {
      console.error('Error in addBrand:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add location
   * POST /api/companies/:companyId/locations
   */
  static async addLocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const locationData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Check plan limits
      if (!company.canPerformAction('add_location')) {
        return res.status(403).json({
          success: false,
          message: 'Location limit reached for current plan',
          data: {
            currentLocations: company.locations.length,
            maxLocations: company.maxLocations,
            subscriptionPlan: company.subscriptionPlan
          }
        });
      }

      await company.addLocation(locationData);

      res.status(200).json({
        success: true,
        message: 'Location added successfully',
        data: {
          locations: company.locations,
          currentLocations: company.locations.length,
          maxLocations: company.maxLocations
        }
      });

    } catch (error) {
      console.error('Error in addLocation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get subscription details
   * GET /api/companies/:companyId/subscription
   */
  static async getSubscriptionDetails(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Update trial status before returning subscription details
      await company.updateTrialStatus();

      res.status(200).json({
        success: true,
        message: 'Subscription details retrieved successfully',
        data: {
          subscriptionPlan: company.subscriptionPlan,
          subscriptionStatus: company.getSubscriptionStatus(),
          trialDaysRemaining: company.trialDaysRemaining,
          trialExpired: company.trialExpired,
          trialStartDate: company.trialStartDate,
          trialEndDate: company.trialEndDate,
          nextBillingDate: company.nextBillingDate,
          billingCycle: company.billingCycle,
          planLimits: company.planLimits,
          usageStats: company.usageStats,
          creditBalance: company.creditBalance,
          pendingCredits: company.pendingCredits
        }
      });

    } catch (error) {
      console.error('Error in getSubscriptionDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Add payment transaction
   * POST /api/companies/:companyId/payment-transaction
   */
  static async addPaymentTransaction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const transactionData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const transaction = await company.addPaymentTransaction(transactionData);

      res.status(201).json({
        success: true,
        message: 'Payment transaction added successfully',
        data: {
          transaction,
          updatedUsage: company.usageStats,
          updatedAnalytics: {
            totalSpent: company.companyAnalytics.totalSpentOnHiring,
            lastActiveDate: company.companyAnalytics.lastActiveDate
          }
        }
      });

    } catch (error) {
      console.error('Error in addPaymentTransaction:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get payment history with filtering
   * GET /api/companies/:companyId/payment-history
   */
  static async getPaymentHistory(req, res) {
    try {
      const { companyId } = req.params;
      const { paymentType, startDate, endDate, status, limit = 10, offset = 0 } = req.query;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const filters = {};
      if (paymentType) filters.paymentType = paymentType;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (status) filters.status = status;

      const paymentHistory = company.getPaymentHistory(filters);
      const paginatedHistory = paymentHistory.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Payment history retrieved successfully',
        data: {
          paymentHistory: paginatedHistory,
          totalTransactions: paymentHistory.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          filters
        }
      });

    } catch (error) {
      console.error('Error in getPaymentHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get payment statistics
   * GET /api/companies/:companyId/payment-stats
   */
  static async getPaymentStats(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const paymentStats = company.getPaymentStats();

      res.status(200).json({
        success: true,
        message: 'Payment statistics retrieved successfully',
        data: paymentStats
      });

    } catch (error) {
      console.error('Error in getPaymentStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get current pricing plans
   * GET /api/companies/:companyId/pricing-plans
   */
  static async getPricingPlans(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const pricingPlans = company.getCurrentPricingPlans();
      const recommendedPlan = company.getRecommendedPlan();

      res.status(200).json({
        success: true,
        message: 'Pricing plans retrieved successfully',
        data: {
          pricingPlans,
          recommendedPlan,
          currentPlan: {
            plan: company.subscriptionPlan,
            status: company.getSubscriptionStatus(),
            limits: company.getPlanLimits(),
            usage: company.usageStats
          }
        }
      });

    } catch (error) {
      console.error('Error in getPricingPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get recommended plan based on usage
   * GET /api/companies/:companyId/recommended-plan
   */
  static async getRecommendedPlan(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const recommendedPlan = company.getRecommendedPlan();

      res.status(200).json({
        success: true,
        message: 'Recommended plan retrieved successfully',
        data: {
          recommendedPlan,
          currentUsage: company.usageStats,
          currentPlan: company.subscriptionPlan
        }
      });

    } catch (error) {
      console.error('Error in getRecommendedPlan:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if company can perform action
   * GET /api/companies/:companyId/can-perform/:action
   */
  static async canPerformAction(req, res) {
    try {
      const { companyId, action } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const canPerform = company.canPerformAction(action);
      const limits = company.getPlanLimits();
      const usage = company.usageStats;

      res.status(200).json({
        success: true,
        message: `Action ${action} check completed`,
        data: {
          canPerform,
          action,
          currentPlan: company.subscriptionPlan,
          limits,
          usage,
          remaining: {
            instantMatches: limits.instantMatches === 'unlimited' ? 'unlimited' : Math.max(0, limits.instantMatches - usage.instantMatches),
            interviews: limits.interviews === 'unlimited' ? 'unlimited' : Math.max(0, limits.interviews - usage.interviews),
            locations: limits.locations === 'unlimited' ? 'unlimited' : Math.max(0, limits.locations - company.locations.length),
            teamMembers: limits.teamMembers === 'unlimited' ? 'unlimited' : Math.max(0, limits.teamMembers - company.teamMembers.length)
          }
        }
      });

    } catch (error) {
      console.error('Error in canPerformAction:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get trial status
   * GET /api/companies/:companyId/trial-status
   */
  static async getTrialStatus(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const trialStatus = company.getTrialStatus();

      res.status(200).json({
        success: true,
        message: 'Trial status retrieved successfully',
        data: {
          trialStatus,
          subscriptionStatus: company.getSubscriptionStatus(),
          currentPlan: company.subscriptionPlan
        }
      });

    } catch (error) {
      console.error('Error in getTrialStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Admin: Verify CR
   * POST /api/companies/:companyId/admin/verify-cr
   */
  static async adminVerifyCR(req, res) {
    try {
      const { companyId } = req.params;
      const { adminNotes } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      if (company.crVerificationStatus === 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Company CR is already verified'
        });
      }

      await company.verifyCR(adminNotes);

      res.status(200).json({
        success: true,
        message: 'Company CR verified successfully',
        data: {
          crVerificationStatus: company.crVerificationStatus,
          crVerifiedAt: company.crVerifiedAt,
          isVerified: company.isVerified,
          creditBalance: company.creditBalance,
          pendingCredits: company.pendingCredits
        }
      });

    } catch (error) {
      console.error('Error in adminVerifyCR:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company detailed info (admin)
   * GET /api/companies/:companyId/detailed
   */
  static async getDetailedProfile(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Update trial status before returning detailed info
      await company.updateTrialStatus();

      res.status(200).json({
        success: true,
        message: 'Detailed company profile retrieved successfully',
        data: company.toDetailedJSON()
      });

    } catch (error) {
      console.error('Error in getDetailedProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete company profile
   * DELETE /api/companies/:companyId
   */
  static async deleteProfile(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Soft delete by deactivating
      await company.update({ isActive: false });

      res.status(200).json({
        success: true,
        message: 'Company profile deactivated successfully',
        data: {
          companyId: company.id,
          isActive: company.isActive
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
   * Get comprehensive company analytics
   * GET /api/companies/:companyId/analytics
   */
  static async getCompanyAnalytics(req, res) {
    try {
      const { companyId } = req.params;
      const { timeframe = '30d', metrics = 'all' } = req.query;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Update analytics before returning
      await company.updateTrialStatus();

      const analyticsData = {
        companyId: company.id,
        companyName: company.companyName,
        timeframe,
        
        // Core metrics
        coreMetrics: {
          totalJobsPosted: company.totalJobsPosted,
          totalHires: company.totalHires,
          totalInterviews: company.companyAnalytics.totalInterviews,
          totalInstantHires: company.companyAnalytics.totalInstantHires,
          totalSpentOnHiring: company.companyAnalytics.totalSpentOnHiring,
          averageRating: company.averageRating
        },
        
        // Performance dashboard
        performance: company.performanceDashboard,
        
        // Health score
        healthScore: company.healthScore,
        
        // Usage analytics
        usageAnalytics: {
          currentMonth: company.usageStats,
          trends: company.analyticsData,
          conversionRates: company.usageStats.conversionRates
        },
        
        // Subscription analytics
        subscription: {
          plan: company.subscriptionPlan,
          status: company.getSubscriptionStatus(),
          trialInfo: company.getTrialStatus(),
          usage: {
            instantMatches: company.usageStats.instantMatches,
            interviews: company.usageStats.interviews,
            jobPostings: company.usageStats.jobPostings
          },
          limits: company.getPlanLimits()
        },
        
        // Financial summary
        financial: {
          creditBalance: company.creditBalance,
          totalSpent: company.companyAnalytics.totalSpentOnHiring,
          averageCostPerHire: company.analyticsData.costAnalysis.averageCostPerHire,
          budgetUtilization: company.analyticsData.costAnalysis.budgetUtilization
        },
        
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        message: 'Company analytics retrieved successfully',
        data: analyticsData
      });

    } catch (error) {
      console.error('Error in getCompanyAnalytics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company data in CSV format
   * GET /api/companies/:companyId/csv-data
   */
  static async getCompanyCSVData(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const csvData = company.getCSVData();

      res.status(200).json({
        success: true,
        message: 'Company CSV data retrieved successfully',
        data: csvData
      });

    } catch (error) {
      console.error('Error in getCompanyCSVData:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update company data from CSV
   * PUT /api/companies/:companyId/csv-update
   */
  static async updateCompanyFromCSV(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const csvData = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      await company.updateFromCSV(csvData);

      res.status(200).json({
        success: true,
        message: 'Company data updated from CSV successfully',
        data: company.getCSVData()
      });

    } catch (error) {
      console.error('Error in updateCompanyFromCSV:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company statistics for reporting
   * GET /api/companies/:companyId/stats
   */
  static async getCompanyStats(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const stats = company.getCompanyStats();

      res.status(200).json({
        success: true,
        message: 'Company statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getCompanyStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Export all companies data to CSV format
   * GET /api/companies/export/csv
   */
  static async exportCompaniesToCSV(req, res) {
    try {
      const { limit = 1000, industry, usedFreeTrial } = req.query;

      // Build search criteria
      const searchCriteria = {};
      if (industry) searchCriteria.industry = industry;
      if (usedFreeTrial !== undefined) searchCriteria.usedFreeTrial = usedFreeTrial === 'true';

      // Get companies
      const companies = await Company.search(searchCriteria);
      const limitedCompanies = companies.slice(0, parseInt(limit));

      // Convert to CSV format
      const csvData = limitedCompanies.map(company => company.getCSVData());

      res.status(200).json({
        success: true,
        message: 'Companies exported to CSV format successfully',
        data: {
          companies: csvData,
          count: csvData.length,
          exportedAt: new Date().toISOString(),
          filters: searchCriteria
        }
      });

    } catch (error) {
      console.error('Error in exportCompaniesToCSV:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get performance dashboard
   * GET /api/companies/:companyId/dashboard
   */
  static async getPerformanceDashboard(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const dashboardData = {
        companyInfo: {
          id: company.id,
          name: company.companyName,
          industry: company.industryDetails.primaryIndustry,
          size: company.organizationStructure.totalEmployees,
          locations: company.organizationStructure.numberOfBranches
        },
        
        // Key Performance Indicators
        kpis: company.performanceDashboard.kpis,
        
        // Health score breakdown
        healthScore: company.healthScore,
        
        // Current subscription status
        subscription: {
          plan: company.subscriptionPlan,
          status: company.getSubscriptionStatus(),
          trial: company.getTrialStatus(),
          limits: company.getPlanLimits(),
          usage: company.usageStats
        },
        
        // Recent activity
        recentActivity: {
          lastActiveDate: company.companyAnalytics.lastActiveDate,
          recentHires: company.performanceDashboard.kpis.monthlyHires,
          activeJobs: company.activeJobs,
          pendingInterviews: company.usageStats.interviews
        },
        
        // Trends and insights
        insights: {
          trends: company.performanceDashboard.trends,
          predictions: company.performanceDashboard.predictions,
          recommendations: company.performanceDashboard.predictions.recommendations
        },
        
        // Quick actions based on status
        quickActions: company.subscriptionStatus === 'trial' ? [
          'upgrade_subscription',
          'add_payment_method',
          'complete_profile'
        ] : [
          'post_job',
          'review_candidates',
          'view_analytics'
        ],
        
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        message: 'Performance dashboard retrieved successfully',
        data: dashboardData
      });

    } catch (error) {
      console.error('Error in getPerformanceDashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get pricing plans with real-time data
   * GET /api/companies/pricing-plans
   */
  static async getPricingPlans(req, res) {
    try {
      const { currency = 'OMR' } = req.query;

      const pricingPlans = {
        currency,
        
        // Free trial (14 days)
        freeTrial: {
          name: 'Free Trial',
          duration: 14,
          durationUnit: 'days',
          price: 0,
          features: {
            instantMatches: 'unlimited',
            interviews: 'unlimited',
            locations: 1,
            fullAccess: true,
            support: 'email'
          },
          benefits: [
            'Full access to all features',
            'Unlimited instant matches',
            'Unlimited interviews',
            'One location access',
            'Email support'
          ],
          callToAction: 'Start Free Trial'
        },
        
        // Pay as you go
        payAsYouGo: {
          name: 'Pay As You Go',
          description: 'Only pay when you need to hire',
          pricing: {
            instantMatch: {
              price: 5,
              unit: 'per match',
              currency
            },
            interviewPackages: [
              {
                name: 'Small Package',
                interviews: 10,
                price: 50,
                validity: 4,
                validityUnit: 'weeks',
                savings: 0
              },
              {
                name: 'Medium Package',
                interviews: 20,
                price: 80,
                validity: 4,
                validityUnit: 'weeks',
                savings: 20
              },
              {
                name: 'Large Package',
                interviews: 50,
                price: 250,
                validity: 6,
                validityUnit: 'weeks',
                savings: 100
              }
            ]
          },
          benefits: [
            'Pay only for what you use',
            'No monthly commitments',
            'Flexible hiring solutions',
            'Interview packages with savings'
          ],
          callToAction: 'Start Hiring'
        },
        
        // Subscription plans
        subscriptionPlans: [
          {
            id: 'starter',
            name: 'Starter Bundle',
            price: 99,
            originalPrice: 198,
            currency,
            savings: 50,
            duration: 6,
            durationUnit: 'months',
            features: {
              instantMatches: 20,
              interviews: 20,
              locations: 1,
              analytics: 'basic',
              support: 'email'
            },
            benefits: [
              '20 Instant Matches',
              '20 Interviews',
              '1 Location',
              'Save 50%',
              'Valid for 6 months'
            ],
            popular: false,
            callToAction: 'Get Started'
          },
          {
            id: 'pro',
            name: 'Pro Bundle',
            price: 200,
            originalPrice: 500,
            currency,
            savings: 60,
            duration: 12,
            durationUnit: 'months',
            features: {
              instantMatches: 50,
              interviews: 50,
              locations: 1,
              analytics: 'advanced',
              support: 'priority'
            },
            benefits: [
              '50 Instant Matches',
              '50 Interviews',
              '1 Location',
              'Save 60%',
              'Valid for 12 months'
            ],
            popular: true,
            callToAction: 'Get Pro'
          }
        ]
      };

      res.status(200).json({
        success: true,
        message: 'Pricing plans retrieved successfully',
        data: pricingPlans
      });

    } catch (error) {
      console.error('Error in getPricingPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ===================================
  // JOB POSTING METHODS FOR COMPANIES
  // ===================================

  /**
   * Create new job posting (Step 1: Basic Info)
   * POST /api/companies/:companyId/jobs
   */
  static async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const jobData = { ...req.body, companyId, userId: req.user.userId };

      // Import Job model at runtime to avoid circular imports
      const Job = require('../models/Job');

      // Verify company exists and user has permission
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Verify user owns this company
      if (company.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create jobs for this company'
        });
      }

      const job = await Job.create(companyId, jobData);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update job step
   * PUT /api/companies/:companyId/jobs/:jobId/step/:step
   */
  static async updateJobStep(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId, jobId, step } = req.params;
      const updateData = req.body;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      await job.update(updateData);

      res.status(200).json({
        success: true,
        message: `Job step ${step} updated successfully`,
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error updating job step:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Publish job (Final step)
   * POST /api/companies/:companyId/jobs/:jobId/publish
   */
  static async publishJob(req, res) {
    try {
      const { companyId, jobId } = req.params;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      if (!job.canPublish()) {
        return res.status(400).json({
          success: false,
          message: 'Job missing required fields for publishing',
          data: {
            jobStatus: job.jobStatus,
            missingFields: job.getMissingFields ? job.getMissingFields() : []
          }
        });
      }

      await job.publish();

      res.status(200).json({
        success: true,
        message: 'Job published successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error publishing job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company jobs
   * GET /api/companies/:companyId/jobs
   */
  static async getCompanyJobs(req, res) {
    try {
      const { companyId } = req.params;
      const { limit = 10, offset = 0, status } = req.query;

      const Job = require('../models/Job');

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      let jobs = await Job.findByCompanyId(companyId, parseInt(limit), parseInt(offset));

      // Filter by status if provided
      if (status) {
        jobs = jobs.filter(job => job.jobStatus === status);
      }

      res.status(200).json({
        success: true,
        message: 'Jobs retrieved successfully',
        data: {
          jobs: jobs.map(job => job.toJSON()),
          totalJobs: jobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          companyName: company.companyName
        }
      });

    } catch (error) {
      console.error('Error getting company jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get job by ID
   * GET /api/companies/:companyId/jobs/:jobId
   */
  static async getJobById(req, res) {
    try {
      const { companyId, jobId } = req.params;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Job retrieved successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error getting job by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update job
   * PUT /api/companies/:companyId/jobs/:jobId
   */
  static async updateJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId, jobId } = req.params;
      const updateData = req.body;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      await job.update(updateData);

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Toggle job status (pause/resume)
   * PUT /api/companies/:companyId/jobs/:jobId/toggle-status
   */
  static async toggleJobStatus(req, res) {
    try {
      const { companyId, jobId } = req.params;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      const newStatus = job.jobStatus === 'published' ? 'paused' : 'published';
      await job.update({ jobStatus: newStatus });

      res.status(200).json({
        success: true,
        message: `Job ${newStatus} successfully`,
        data: job.toJSON()
      });

    } catch (error) {
      console.error('Error toggling job status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete job
   * DELETE /api/companies/:companyId/jobs/:jobId
   */
  static async deleteJob(req, res) {
    try {
      const { companyId, jobId } = req.params;

      const Job = require('../models/Job');

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (job.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      await job.delete();

      res.status(200).json({
        success: true,
        message: 'Job deleted successfully',
        data: {
          id: job.id,
          jobId: job.jobId,
          isActive: job.isActive
        }
      });

    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Copy job
   * POST /api/companies/:companyId/jobs/:jobId/copy
   */
  static async copyJob(req, res) {
    try {
      const { companyId, jobId } = req.params;

      const Job = require('../models/Job');

      const originalJob = await Job.findById(jobId);
      if (!originalJob) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Verify job belongs to this company
      if (originalJob.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Job does not belong to this company'
        });
      }

      // Create copy with modified data
      const jobData = originalJob.toJSON();
      delete jobData.id;
      delete jobData.publishedAt;
      delete jobData.applicationsCount;
      delete jobData.viewsCount;
      delete jobData.hiredCount;
      
      jobData.jobStatus = 'draft';
      jobData.jobSummary = `${jobData.jobSummary} (Copy)`;

      const copiedJob = await Job.create(companyId, jobData);

      res.status(201).json({
        success: true,
        message: 'Job copied successfully',
        data: copiedJob.toJSON()
      });

    } catch (error) {
      console.error('Error copying job:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company job statistics
   * GET /api/companies/:companyId/jobs/stats
   */
  static async getCompanyJobStats(req, res) {
    try {
      const { companyId } = req.params;

      const Job = require('../models/Job');

      const stats = await Job.getStats(companyId);

      res.status(200).json({
        success: true,
        message: 'Job statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error getting job stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Placeholder methods for job application management
   * These would typically integrate with an Application model
   */
  static async getJobApplications(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Job applications feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async shortlistCandidate(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Candidate shortlisting feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async scheduleInterview(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Interview scheduling feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async hireCandidate(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Candidate hiring feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getMatchingSeekers(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Matching seekers feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getHiringAnalytics(req, res) {
    try {
      res.status(501).json({
        success: false,
        message: 'Hiring analytics feature not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getCompanyTrendingJobs(req, res) {
    try {
      const { companyId } = req.params;
      const { limit = 5 } = req.query;

      const Job = require('../models/Job');

      // Get company jobs sorted by trending score
      const jobs = await Job.findByCompanyId(companyId, parseInt(limit), 0);
      
      const trendingJobs = jobs
        .filter(job => job.jobStatus === 'published')
        .map(job => ({
          ...job.toJSON(),
          trendingScore: job.viewsCount + (job.applicationsCount * 2)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore);

      res.status(200).json({
        success: true,
        message: 'Trending jobs retrieved successfully',
        data: {
          jobs: trendingJobs,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting trending jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ===================================
  // THAWANI PAYMENT INTEGRATION METHODS
  // ===================================

  /**
   * Create Thawani checkout session
   * POST /api/companies/:companyId/thawani-checkout
   */
  static async createThawaniCheckout(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { planType, planName, amount, planDetails } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Verify user owns this company
      if (company.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to make payments for this company'
        });
      }

      const paymentData = {
        planType,
        planName,
        amount: parseFloat(amount),
        planDetails: planDetails || {}
      };

      const checkoutResult = await company.createThawaniCheckoutSession(paymentData);

      res.status(200).json({
        success: true,
        message: 'Checkout session created successfully',
        data: {
          sessionId: checkoutResult.sessionId,
          checkoutUrl: checkoutResult.checkoutUrl,
          pendingPayment: checkoutResult.pendingPayment
        }
      });

    } catch (error) {
      console.error('Error creating Thawani checkout:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Handle Thawani payment webhook
   * POST /api/companies/:companyId/thawani-webhook
   */
  static async handleThawaniWebhook(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const { session_id, payment_status } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      if (payment_status === 'paid') {
        // Process successful payment
        const result = await company.processSuccessfulPayment(session_id, req.body);
        
        res.status(200).json({
          success: true,
          message: 'Payment processed successfully',
          data: result
        });
      } else {
        // Handle failed/cancelled payment
        res.status(200).json({
          success: false,
          message: `Payment status: ${payment_status}`,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

    } catch (error) {
      console.error('Error handling Thawani webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check Thawani payment status
   * GET /api/payment/status/:sessionId
   */
  static async checkPaymentStatus(req, res) {
    try {
      const { sessionId } = req.params;

      // Fetch session details from Thawani
      const thawaniConfig = {
        apiKey: process.env.THAWANI_SECRET || process.env.THAWANI_SECRET_KEY,
        baseUrl: process.env.THAWANI_BASE_URL || 'https://uatcheckout.thawani.om/api/v1'
      };

      const response = await fetch(`${thawaniConfig.baseUrl}/checkout/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'thawani-api-key': thawaniConfig.apiKey
        }
      });

      if (!response.ok) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      const result = await response.json();

      if (result.success && result.data) {
        const paymentData = result.data;

        // If payment is successful, process it
        if (paymentData.payment_status === 'paid') {
          // Find company by client_reference_id (format: companyId_timestamp)
          const companyId = paymentData.client_reference_id.split('_')[0];
          const company = await Company.findById(companyId);

          if (company) {
            // Process the payment
            await company.processSuccessfulPayment(sessionId, paymentData);
          }
        }

        res.status(200).json({
          success: true,
          data: {
            sessionId: paymentData.session_id,
            paymentStatus: paymentData.payment_status,
            amount: paymentData.total_amount / 1000, // Convert from baisa to OMR
            currency: paymentData.currency,
            metadata: paymentData.metadata
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid session'
        });
      }

    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Redirect to app after successful payment
   * GET /api/payment/success-redirect
   */
  static async paymentSuccessRedirect(req, res) {
    try {
      let { session_id } = req.query;

      // Handle case where Thawani doesn't replace the placeholder in test mode
      if (!session_id || session_id === '{CHECKOUT_SESSION_ID}') {
        console.log('Placeholder detected, fetching latest pending payment from database...');

        // Get all companies and find the most recent pending payment
        const db = require('../config/database').databaseService.db;
        const companiesSnapshot = await db.collection('companies').get();

        let latestPayment = null;
        let latestTimestamp = null;

        for (const companyDoc of companiesSnapshot.docs) {
          const companyData = companyDoc.data();
          if (companyData.pendingPayments && Array.isArray(companyData.pendingPayments)) {
            // Find pending payments
            const pendingPayments = companyData.pendingPayments.filter(p => p.status === 'pending');

            for (const payment of pendingPayments) {
              const paymentTime = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
              if (!latestTimestamp || paymentTime > latestTimestamp) {
                latestTimestamp = paymentTime;
                latestPayment = payment;
              }
            }
          }
        }

        if (latestPayment && latestPayment.sessionId) {
          session_id = latestPayment.sessionId;
          console.log('Retrieved session_id from pending payment:', session_id);
        } else {
          console.error('No pending payments found in database');
          return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Session Not Found</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  padding: 20px;
                  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  text-align: center;
                }
                .container {
                  background: rgba(255, 255, 255, 0.95);
                  border-radius: 20px;
                  padding: 40px;
                  max-width: 400px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  color: #333;
                }
                h1 { color: #FF9800; margin: 0 0 10px 0; font-size: 24px; }
                p { color: #666; line-height: 1.6; }
                .button {
                  display: inline-block;
                  margin-top: 20px;
                  padding: 15px 30px;
                  background: #F05A2B;
                  color: white;
                  text-decoration: none;
                  border-radius: 10px;
                  font-weight: 600;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⚠️ Payment Session Not Found</h1>
                <p>Unable to verify payment. Please check your account or contact support.</p>
                <a href="shift://payment/cancel" class="button">Return to App</a>
              </div>
            </body>
            </html>
          `);
        }
      }

      console.log('✅ Verifying payment status for session_id:', session_id);

      // Call our existing payment status endpoint
      const baseUrl = process.env.BACKEND_URL || 'https://62ff4cd87704.ngrok-free.app';
      const statusResponse = await fetch(`${baseUrl}/api/payment/status/${session_id}`);
      const statusResult = await statusResponse.json();

      const paymentStatus = statusResult?.data?.paymentStatus || 'unknown';
      console.log('💳 Payment status from /api/payment/status:', paymentStatus);

      // Simple logic: paid = success, unpaid/anything else = failed
      let statusIcon, statusTitle, statusMessage, statusColor, deepLink;

      if (paymentStatus === 'paid') {
        // SUCCESS - redirect to dashboard
        statusIcon = '✅';
        statusTitle = 'Payment Successful!';
        statusMessage = 'Your payment has been confirmed. Your plan has been upgraded.';
        statusColor = '#4CAF50';
        deepLink = 'shift://dashboard';
      } else {
        // FAILED - redirect to cancel/try again
        statusIcon = '❌';
        statusTitle = 'Payment Failed';
        statusMessage = 'Your payment could not be processed. Please try again.';
        statusColor = '#FF4444';
        deepLink = 'shift://payment/cancel';
      }

      console.log('🔗 Deep link created:', deepLink);

      // Send HTML page that shows status and redirects to app dashboard
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${statusTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.95);
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              color: #333;
            }
            .status-icon {
              font-size: 80px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              color: ${statusColor};
            }
            p {
              color: #666;
              line-height: 1.6;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 15px 30px;
              background: #F05A2B;
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              transition: background 0.3s;
            }
            .button:hover {
              background: #d94a1c;
            }
            .loading {
              margin-top: 20px;
              color: #999;
              font-size: 14px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #F05A2B;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status-icon">${statusIcon}</div>
            <h1>${statusTitle}</h1>
            <p>${statusMessage}</p>
            <p class="loading">Redirecting to Shift app...</p>
            <a href="${deepLink}" class="button">Return to Dashboard</a>
            <p style="font-size: 12px; margin-top: 30px; color: #999;">
              If the app doesn't open automatically, click the button above.
            </p>
          </div>
          <script>
            // Wait 2 seconds to show the message, then redirect
            setTimeout(function() {
              window.location.href = '${deepLink}';
            }, 2000);

            // Fallback: Try again after another delay
            setTimeout(function() {
              window.location.href = '${deepLink}';
            }, 3000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error in payment success redirect:', error);
      res.status(500).send('Redirect failed');
    }
  }

  /**
   * Redirect to app after cancelled payment
   * GET /api/payment/cancel-redirect
   */
  static async paymentCancelRedirect(req, res) {
    try {
      const deepLink = 'shift://payment/cancel';

      // Send HTML page that attempts deep link and shows fallback
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Cancelled</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.95);
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              color: #333;
            }
            .cancel-icon {
              font-size: 80px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 28px;
              color: #FF9800;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 15px 30px;
              background: #F05A2B;
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              transition: background 0.3s;
            }
            .button:hover {
              background: #d94a1c;
            }
            .loading {
              margin-top: 20px;
              color: #999;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="cancel-icon">⚠️</div>
            <h1>Payment Cancelled</h1>
            <p>You cancelled the payment. No charges have been made.</p>
            <p class="loading">Redirecting to Shift app...</p>
            <a href="${deepLink}" class="button">Return to Shift App</a>
          </div>
          <script>
            // Attempt to open the app immediately
            window.location.href = '${deepLink}';

            // Fallback: Try again after a short delay
            setTimeout(function() {
              window.location.href = '${deepLink}';
            }, 1000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error in payment cancel redirect:', error);
      res.status(500).send('Redirect failed');
    }
  }

  /**
   * Get current plan status and expiration info
   * GET /api/companies/:companyId/plan-status
   */
  static async getPlanStatus(req, res) {
    try {
      const { companyId } = req.params;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      // Verify user owns this company
      if (company.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this company'
        });
      }

      const planStatus = company.checkPlanExpiration();
      const currentPlan = company.subscriptionPlan;
      const planLimits = company.getPlanLimits();
      const usage = company.usageStats;

      res.status(200).json({
        success: true,
        message: 'Plan status retrieved successfully',
        data: {
          currentPlan,
          planStatus,
          planLimits,
          usage,
          needsUpgrade: planStatus.needsUpgrade,
          daysRemaining: planStatus.daysRemaining,
          subscriptionStatus: company.getSubscriptionStatus(),
          trialStatus: company.getTrialStatus()
        }
      });

    } catch (error) {
      console.error('Error getting plan status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get brand recommendations based on seeker skills and roles
   * GET /api/companies/brands/recommendations
   */
  static async getBrandRecommendations(req, res) {
    try {
      const { userId, userType } = req.user;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can get brand recommendations'
        });
      }

      const { roles, skills, limit = 20, offset = 0 } = req.query;

      // Convert comma-separated strings to arrays
      const roleArray = roles ? roles.split(',').map(r => r.trim()) : [];
      const skillArray = skills ? skills.split(',').map(s => s.trim()) : [];

      if (roleArray.length === 0 && skillArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one role or skill must be provided for recommendations'
        });
      }

      const Job = require('../models/Job');
      const Company = require('../models/Company');

      // Get all companies with their brands
      const allCompanies = await Company.getAll();
      console.log('📊 Total companies found:', allCompanies.length);

      let brands = [];

      // Iterate through each company and their brands
      for (const company of allCompanies) {
        if (!company.brands || company.brands.length === 0) continue;

        console.log('🏢 Processing company:', company.companyName, 'with', company.brands.length, 'brands');

        for (let brandIndex = 0; brandIndex < company.brands.length; brandIndex++) {
          const companyBrand = company.brands[brandIndex];

          // Calculate match score based on brand's roles and skills
          let matchScore = 0;
          const brandRoles = companyBrand.roles || (companyBrand.role ? companyBrand.role.split(',').map(r => r.trim()) : []);
          const brandSkills = companyBrand.skills || [];

          // Score based on role match
          for (const role of roleArray) {
            if (brandRoles.some(br => br.toLowerCase().includes(role.toLowerCase()) || role.toLowerCase().includes(br.toLowerCase()))) {
              matchScore += 10;
            }
          }

          // Score based on skill match
          for (const skill of skillArray) {
            if (brandSkills.some(bs => bs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(bs.toLowerCase()))) {
              matchScore += 5;
            }
          }

          // Only include brands with matching roles/skills
          if (matchScore === 0) continue;

          // Get jobs for this brand to calculate activity metrics
          const brandJobs = await Job.searchJobs({
            jobStatus: 'published',
            brandName: companyBrand.name
          }, 100, 0);

          const recentJobsCount = brandJobs.filter(job => {
            const jobDate = new Date(job.publishedAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return jobDate > thirtyDaysAgo;
          }).length;

          // Get brand-specific locations
          let actualLocations = [];
          if (company.locations && company.locations.length > 0) {
            actualLocations = company.locations.filter(location => {
              return !location.brand || location.brand.toLowerCase() === companyBrand.name.toLowerCase();
            }).map(location => ({
              address: location.address,
              brand: location.brand || companyBrand.name,
              addedAt: location.addedAt
            }));

            if (actualLocations.length === 0) {
              actualLocations = company.locations.map(location => ({
                address: location.address,
                brand: location.brand || companyBrand.name,
                addedAt: location.addedAt
              }));
            }
          }

          const activityScore = (brandJobs.length * 2) + (actualLocations.length * 3) + (recentJobsCount * 5);

          // Generate proper brandId using the brand index
          const brandId = `${company.id}-brand-${brandIndex}`;
          console.log('✅ Generated brandId:', brandId, 'for brand:', companyBrand.name);

          brands.push({
            brandId: brandId,
            brandName: companyBrand.name,
            companyId: company.id,
            companyName: company.companyName,
            matchScore: matchScore,
            activityScore: activityScore,
            jobCount: brandJobs.length,
            locationCount: actualLocations.length,
            recentJobsCount: recentJobsCount,
            locations: actualLocations
          });
        }
      }

      // Sort by combined score (match score + activity score)
      brands.sort((a, b) => ((b.matchScore + b.activityScore) - (a.matchScore + a.activityScore)));

      // Paginate results
      const paginatedBrands = brands.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Brand recommendations retrieved successfully',
        data: {
          brands: paginatedBrands,
          totalCount: brands.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < brands.length
        }
      });

    } catch (error) {
      console.error('Error getting brand recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get brand recommendations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Follow a brand
   * POST /api/companies/brands/:brandId/follow
   */
  static async followBrand(req, res) {
    try {
      const { userId, userType } = req.user;
      const { brandId } = req.params;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can follow brands'
        });
      }

      const BrandFollow = require('../models/BrandFollow');
      const Company = require('../models/Company');
      const Job = require('../models/Job');

      // Extract brand information from brandId format: {companyId}-brand-{index}
      // Example: "L8ryrT4XbKypPCPpj1UB-brand-0"
      console.log('🔍 followBrand called with brandId:', brandId);

      const brandIdParts = brandId.split('-brand-');
      const companyId = brandIdParts[0];
      const brandIndex = parseInt(brandIdParts[1]);

      console.log('📊 Parsed brandId - companyId:', companyId, 'brandIndex:', brandIndex);

      let companyName = null;
      let brandName = null;
      let brandLogo = null;
      let brandIndustry = null;
      let brandRole = null;
      let brandSkills = [];

      // Fetch company details to get brand-specific information
      const company = await Company.findById(companyId);
      if (!company) {
        console.log('❌ Company not found with id:', companyId);
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      console.log('✅ Company found:', company.companyName);
      console.log('📦 Company brands array length:', company.brands?.length || 0);
      console.log('📦 Company brands:', JSON.stringify(company.brands, null, 2));

      companyName = company.companyName;

      // Find the brand - first try by id field, then by index as fallback
      let brand = null;
      if (company.brands && company.brands.length > 0) {
        console.log('🔍 Searching for brand with id:', brandId);
        // Try to find by brand.id matching the full brandId
        brand = company.brands.find(b => b.id === brandId);

        if (brand) {
          console.log('✅ Brand found by id match');
        }

        // If not found by id, try by index
        if (!brand && !isNaN(brandIndex) && company.brands[brandIndex]) {
          console.log('🔍 Brand not found by id, trying index:', brandIndex);
          brand = company.brands[brandIndex];
          console.log('✅ Brand found by index:', brand?.name);
        }
      }

      if (!brand) {
        console.log('❌ Brand not found!');
        console.log('Debug info:', {
          companyId,
          brandId,
          brandIndex,
          totalBrands: company.brands?.length || 0,
          brandIds: company.brands?.map(b => b.id) || []
        });
        return res.status(404).json({
          success: false,
          message: 'Brand not found in company',
          debug: {
            companyId,
            brandId,
            brandIndex,
            totalBrands: company.brands?.length || 0,
            availableBrandIds: company.brands?.map(b => b.id) || []
          }
        });
      }

      console.log('✅ Brand details extracted:', {
        name: brand.name,
        industry: brand.industry,
        role: brand.role
      });

      // Extract brand details
      brandName = brand.name;
      brandLogo = brand.logo;
      brandIndustry = brand.industry;
      brandRole = brand.role;
      brandSkills = brand.skills || [];

      // Create follow record with complete brand details
      const followData = {
        seekerId: userId,
        brandId: brandId,
        companyId: companyId,
        brandName: brandName,
        companyName: companyName,
        brandLogo: brandLogo,
        brandIndustry: brandIndustry,
        brandRole: brandRole,
        brandSkills: brandSkills
      };

      const brandFollow = await BrandFollow.create(followData);

      res.status(200).json({
        success: true,
        message: 'Brand followed successfully',
        data: {
          brandId,
          followedAt: brandFollow.followedAt
        }
      });

    } catch (error) {
      console.error('Error following brand:', error);

      if (error.message === 'Already following this brand') {
        return res.status(400).json({
          success: false,
          message: 'You are already following this brand'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to follow brand',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Unfollow a brand
   * DELETE /api/companies/brands/:brandId/follow
   */
  static async unfollowBrand(req, res) {
    try {
      const { userId, userType } = req.user;
      const { brandId } = req.params;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can unfollow brands'
        });
      }

      const BrandFollow = require('../models/BrandFollow');

      // Unfollow the brand
      await BrandFollow.unfollow(userId, brandId);

      res.status(200).json({
        success: true,
        message: 'Brand unfollowed successfully',
        data: { brandId }
      });

    } catch (error) {
      console.error('Error unfollowing brand:', error);
      
      if (error.message === 'Not following this brand') {
        return res.status(404).json({
          success: false,
          message: 'You are not following this brand'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to unfollow brand',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get followed brands
   * GET /api/companies/brands/followed
   */
  static async getFollowedBrands(req, res) {
    try {
      const { userId, userType } = req.user;
      const { limit = 50, offset = 0 } = req.query;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can get followed brands'
        });
      }

      const BrandFollow = require('../models/BrandFollow');
      const Job = require('../models/Job');

      // Get followed brands using the model
      const followedBrands = await BrandFollow.findBySeekerId(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Enrich with brand data and activity scores
      const enrichedBrands = [];

      for (const follow of followedBrands) {
        // Get recent jobs for this brand to calculate activity
        const brandJobs = await Job.searchJobs(
          {
            jobStatus: 'published',
            brandName: follow.brandName
          },
          50,
          0
        );

        // Calculate metrics even if there are no jobs
        const locationCount = brandJobs.length > 0
          ? new Set(brandJobs.filter(j => j.governorate).map(j => j.governorate)).size
          : 0;

        const recentJobsCount = brandJobs.filter(job => {
          const jobDate = new Date(job.publishedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return jobDate > thirtyDaysAgo;
        }).length;

        const activityScore = (brandJobs.length * 2) + (locationCount * 3) + (recentJobsCount * 5);

        // Add complete brand details including stored brand information
        enrichedBrands.push({
          brandId: follow.brandId,
          brandName: follow.brandName,
          companyId: follow.companyId,
          companyName: follow.companyName,
          brandLogo: follow.brandLogo,
          brandIndustry: follow.brandIndustry,
          brandRole: follow.brandRole,
          brandSkills: follow.brandSkills,
          followedAt: follow.followedAt,
          activityScore: activityScore,
          jobCount: brandJobs.length,
          locationCount: locationCount,
          recentJobsCount: recentJobsCount
        });
      }

      res.status(200).json({
        success: true,
        message: 'Followed brands retrieved successfully',
        data: {
          brands: enrichedBrands,
          totalCount: followedBrands.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('Error getting followed brands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get followed brands',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get brand jobs matching seeker's skills/roles
   * GET /api/companies/brands/:brandId/jobs
   */
  static async getBrandJobs(req, res) {
    try {
      const { userId, userType } = req.user;
      const { brandId } = req.params;
      const { roles, skills, limit = 20, offset = 0 } = req.query;

      // Verify user is a seeker
      if (userType !== 'seeker') {
        return res.status(403).json({
          success: false,
          message: 'Only job seekers can get brand jobs'
        });
      }

      const Job = require('../models/Job');

      // Extract brand name from brandId
      const brandName = brandId.split('-').slice(1).join(' ');

      const filters = {
        jobStatus: 'published',
        brandName: brandName
      };

      // Get jobs for this brand
      const brandJobs = await Job.searchJobs(filters, parseInt(limit), parseInt(offset));

      // If roles or skills provided, filter and score the jobs
      if (roles || skills) {
        const roleArray = roles ? roles.split(',').map(r => r.trim()) : [];
        const skillArray = skills ? skills.split(',').map(s => s.trim()) : [];

        const scoredJobs = brandJobs.map(job => {
          let matchScore = 0;
          const jobRoles = job.roleName ? [job.roleName.toLowerCase()] : [];
          const jobSkills = job.requiredSkills ? job.requiredSkills.map(s => s.toLowerCase()) : [];

          // Score based on role match
          for (const role of roleArray) {
            if (jobRoles.some(jr => jr.includes(role.toLowerCase()) || role.toLowerCase().includes(jr))) {
              matchScore += 10;
            }
          }

          // Score based on skill match
          for (const skill of skillArray) {
            if (jobSkills.some(js => js.includes(skill.toLowerCase()) || skill.toLowerCase().includes(js))) {
              matchScore += 5;
            }
          }

          return { ...job, matchScore };
        }).filter(job => job.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore);
        
        brandJobs = scoredJobs;
      }

      res.status(200).json({
        success: true,
        message: 'Brand jobs retrieved successfully',
        data: {
          brandId: brandId,
          brandName: brandName,
          jobs: brandJobs,
          totalCount: brandJobs.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: false
        }
      });

    } catch (error) {
      console.error('Error getting brand jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get brand jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get brand details with activity score and metrics
   * GET /api/companies/brands/:brandId/details
   */
  static async getBrandDetails(req, res) {
    try {
      const { brandId } = req.params;

      const Job = require('../models/Job');

      // Extract brand name from brandId
      const brandName = brandId.split('-').slice(1).join(' ');

      // Get all jobs for this brand
      const brandJobs = await Job.searchJobs(
        { 
          jobStatus: 'published',
          brandName: brandName
        },
        1000, // Get all jobs for accurate metrics
        0
      );

      if (brandJobs.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found or has no active jobs'
        });
      }

      const firstJob = brandJobs[0];
      
      // Calculate metrics
      const locationCount = new Set(brandJobs.filter(j => j.governorate).map(j => j.governorate)).size;
      const locations = Array.from(new Set(brandJobs.filter(j => j.governorate).map(j => j.governorate)));
      
      const recentJobsCount = brandJobs.filter(job => {
        const jobDate = new Date(job.publishedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return jobDate > thirtyDaysAgo;
      }).length;

      // Calculate activity score
      const activityScore = (brandJobs.length * 2) + (locationCount * 3) + (recentJobsCount * 5);

      // Get top roles and skills
      const roleCount = {};
      const skillCount = {};

      brandJobs.forEach(job => {
        if (job.roleName) {
          roleCount[job.roleName] = (roleCount[job.roleName] || 0) + 1;
        }
        if (job.requiredSkills) {
          job.requiredSkills.forEach(skill => {
            skillCount[skill] = (skillCount[skill] || 0) + 1;
          });
        }
      });

      const topRoles = Object.entries(roleCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role, count]) => ({ role, count }));

      const topSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      res.status(200).json({
        success: true,
        message: 'Brand details retrieved successfully',
        data: {
          brandId: brandId,
          brandName: firstJob.brandName,
          companyId: firstJob.companyId,
          companyName: firstJob.companyName,
          activityScore: activityScore,
          metrics: {
            totalJobs: brandJobs.length,
            activeJobs: brandJobs.length,
            locationCount: locationCount,
            recentJobsCount: recentJobsCount
          },
          locations: locations,
          topRoles: topRoles,
          topSkills: topSkills,
          recentJobs: brandJobs.slice(0, 5) // Show 5 most recent jobs
        }
      });

    } catch (error) {
      console.error('Error getting brand details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get brand details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check interview limits and current usage
   * GET /api/companies/:companyId/interview-limits
   */
  static async checkInterviewLimits(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { companyId } = req.params;
      const userId = req.user.userId;

      // Get company profile
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Verify ownership
      if (company.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get plan limits using the company method
      const planLimits = company.getPlanLimits();
      const currentUsage = company.usageStats || {};

      // Calculate current interviews used
      const interviewsUsed = currentUsage.interviews || 0;
      const interviewsLimit = planLimits.interviews || 0;

      // Get current plan info from company subscription data
      let currentPlan = company.subscriptionPlan || 'trial';
      
      // Handle different plan representations
      if (company.planType) {
        currentPlan = company.planType;
      } else if (company.subscriptionType) {
        currentPlan = company.subscriptionType;
      }

      // Normalize plan names
      if (currentPlan === 'pay-as-you-go' || currentPlan === 'pay_as_you_go') {
        currentPlan = 'payg';
      }

      console.log('Plan check:', {
        currentPlan,
        subscriptionPlan: company.subscriptionPlan,
        planType: company.planType,
        subscriptionType: company.subscriptionType,
        interviewsLimit,
        interviewsUsed
      });

      // Check if can create interview based on plan type and limits
      let canCreateInterview = false;
      let message = null;

      // Handle interview limits based on plan type
      if (interviewsLimit === 'unlimited') {
        // Unlimited interviews (trial, custom plans)
        canCreateInterview = true;
      } else if (typeof interviewsLimit === 'number') {
        if (interviewsLimit === 0) {
          // No interviews allowed on this plan
          canCreateInterview = false;
          if (currentPlan === 'payg') {
            message = 'Interviews not available on Pay-As-You-Go plan. Please upgrade to access interview features.';
          } else {
            message = 'Interviews not available on your current plan. Please upgrade to access interview features.';
          }
        } else if (interviewsLimit === -1) {
          // Unlimited interviews (represented as -1)
          canCreateInterview = true;
        } else {
          // Check if under limit
          canCreateInterview = interviewsUsed < interviewsLimit;
          if (!canCreateInterview) {
            message = `You have reached your interview limit of ${interviewsLimit} for this billing period.`;
          }
        }
      } else {
        // Default case - allow interviews
        canCreateInterview = true;
      }

      // Prepare response
      const response = {
        canCreateInterview,
        currentPlan,
        interviewsUsed,
        interviewsLimit: (interviewsLimit === -1 || interviewsLimit === 'unlimited') ? 'unlimited' : interviewsLimit
      };

      if (message) {
        response.message = message;
      }

      console.log('Interview limits response:', response);

      res.json({
        success: true,
        message: 'Interview limits retrieved successfully',
        data: response
      });

    } catch (error) {
      console.error('Error checking interview limits:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check interview limits',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update profile step
   * PUT /api/companies/:companyId/step/:step
   */
  static async updateProfileStep(req, res) {
    try {
      const { companyId, step } = req.params;
      const stepData = req.body;
      const userId = req.user.userId;

      // Verify the company belongs to the authenticated user
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      if (company.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own company profile.'
        });
      }

      const stepNumber = parseInt(step);

      // Handle different steps
      switch (stepNumber) {
        case 2:
          // Step 2: Brands and onboarding data
          const updateData = {
            profileCompletionStep: Math.max(company.profileCompletionStep || 1, 2)
          };

          // Handle brands if provided
          if (stepData.brands && Array.isArray(stepData.brands)) {
            updateData.brands = stepData.brands;
          }

          // Handle onboarding data if provided
          if (stepData.selectedIndustries || stepData.selectedRoles || stepData.selectedSkills) {
            try {
              // Update or create onboarding data
              const onboardingData = await OnboardingData.findByUserId(userId);
              if (onboardingData) {
                await onboardingData.update({
                  selectedIndustries: stepData.selectedIndustries || onboardingData.selectedIndustries,
                  selectedRoles: stepData.selectedRoles || onboardingData.selectedRoles,
                  selectedSkills: stepData.selectedSkills || onboardingData.selectedSkills
                });
              } else {
                await OnboardingData.create({
                  userId: userId,
                  userType: 'company',
                  selectedIndustries: stepData.selectedIndustries || [],
                  selectedRoles: stepData.selectedRoles || [],
                  selectedSkills: stepData.selectedSkills || []
                });
              }
              console.log('Step 2 - Updated onboarding data successfully');
            } catch (onboardingError) {
              console.error('Step 2 - Error updating onboarding data:', onboardingError);
              // Continue with company profile update even if onboarding update fails
            }
          }

          await company.update(updateData);
          break;

        case 3:
          // Step 3: Location and team data
          await company.update({
            ...stepData,
            profileCompletionStep: Math.max(company.profileCompletionStep || 1, 3)
          });
          break;

        case 4:
          // Step 4: Plan selection
          await company.update({
            ...stepData.stepData,
            profileCompletionStep: Math.max(company.profileCompletionStep || 1, 4)
          });
          break;

        case 5:
          // Step 5: Terms and conditions
          await company.update({
            ...stepData.stepData,
            profileCompletionStep: Math.max(company.profileCompletionStep || 1, 5)
          });
          break;

        case 6:
          // Step 6: Final confirmation
          await company.update({
            ...stepData.stepData,
            profileCompletionStep: 6,
            isProfileComplete: true
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid step number'
          });
      }

      // Return updated company profile
      const updatedCompany = await Company.findById(companyId);

      res.status(200).json({
        success: true,
        message: `Step ${step} updated successfully`,
        data: updatedCompany.toJSON()
      });

    } catch (error) {
      console.error('Error in updateProfileStep:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile step',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get company applications with interview filtering
   * GET /api/companies/:companyId/applications
   */
  static async getCompanyApplications(req, res) {
    try {
      const { companyId } = req.params;
      const { userId, userType } = req.user;
      const {
        jobType,
        fromDate,
        toDate,
        status,
        limit = 50,
        offset = 0
      } = req.query;


      // Verify user is a company
      if (userType !== 'company') {
        return res.status(403).json({
          success: false,
          message: 'Only companies can view applications'
        });
      }

      // Verify user owns the company or is associated with it
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Check if user has access to this company
      const userCompany = await Company.findByUserId(userId);
      if (!userCompany || userCompany.id !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this company'
        });
      }

      const JobApplication = require('../models/JobApplication');
      const { databaseService, COLLECTIONS } = require('../config/database');

      // Build query filters
      let filters = [
        { field: 'companyId', operator: '==', value: companyId }
      ];

      // Add status filter if provided
      if (status) {
        filters.push({ field: 'status', operator: '==', value: status });
      }

      // Query all applications for this company
      let applications = await databaseService.query(
        COLLECTIONS.JOB_APPLICATIONS,
        filters,
        { field: 'createdAt', direction: 'desc' },
        parseInt(limit) * 2, // Get more to filter later
        parseInt(offset)
      );


      // Convert to JobApplication objects and populate data
      applications = await Promise.all(
        applications.map(async (appData) => {
          const app = new JobApplication(appData);
          await app.populateData();
          return app;
        })
      );

      // Filter by job type if requested (e.g., "Interview First")
      if (jobType) {
        applications = applications.filter(app => {
          const appJobType = app.jobData?.jobType || app.jobData?.hiringType || app.hiringType;
          return appJobType === jobType;
        });
      }

      // Filter by date range if provided
      if (fromDate) {
        const fromDateTime = new Date(fromDate);
        applications = applications.filter(app => {
          if (app.interviewDate) {
            const interviewDateTime = new Date(app.interviewDate);
            return interviewDateTime >= fromDateTime;
          }
          return false;
        });
      }

      if (toDate) {
        const toDateTime = new Date(toDate);
        applications = applications.filter(app => {
          if (app.interviewDate) {
            const interviewDateTime = new Date(app.interviewDate);
            return interviewDateTime <= toDateTime;
          }
          return false;
        });
      }

      // Apply pagination after filtering
      const paginatedApplications = applications.slice(0, parseInt(limit));

      // Filter to only include applications with scheduled interviews for upcoming interviews endpoint
      const interviewApplications = paginatedApplications.filter(app =>
        app.interviewScheduled === true && app.interviewDate && app.interviewTime
      );

      // Format response to match expected structure for interviews
      const formattedApplications = interviewApplications.map(app => {
        const applicationData = app.toJSON();

        return {
          ...applicationData,
          id: app.id,
          applicationId: app.applicationId || app.id,
          jobId: app.jobId,
          seekerId: app.seekerId,
          companyId: app.companyId,
          seekerName: app.seekerName || app.seekerData?.fullName || 'Unknown',
          seekerEmail: app.seekerEmail || app.seekerData?.email || '',
          jobTitle: app.jobTitle || app.jobData?.roleName || 'Unknown Position',
          interviewDate: app.interviewDate,
          interviewTime: app.interviewTime,
          interviewEndTime: app.interviewEndTime,
          interviewDuration: app.interviewDuration || 30,
          interviewType: app.interviewType || 'in-person',
          interviewLocation: app.interviewLocation || app.location,
          interviewStatus: app.interviewStatus || 'scheduled',
          interviewResponse: app.interviewResponse,
          seekerData: app.seekerData,
          jobData: app.jobData
        };
      });


      res.status(200).json({
        success: true,
        message: 'Company applications retrieved successfully',
        data: {
          applications: formattedApplications,
          totalCount: applications.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: applications.length > parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting company applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve company applications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = CompanyController;