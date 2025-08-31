const Company = require('../models/Company');
const User = require('../models/User');
const OnboardingData = require('../models/OnboardingData');
const { validationResult } = require('express-validator');

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
}

module.exports = CompanyController;