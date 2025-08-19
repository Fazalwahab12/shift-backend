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

      const { userId, ...profileData } = req.body;

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
      if (profileData.commercialRegistrationNumber) {
        const existingCR = await Company.findByRegistrationNumber(profileData.commercialRegistrationNumber);
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
      if (updateData.commercialRegistrationNumber && 
          updateData.commercialRegistrationNumber !== company.commercialRegistrationNumber) {
        const existingCR = await Company.findByRegistrationNumber(updateData.commercialRegistrationNumber);
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
            !company.commercialRegistrationNumber && 'commercialRegistrationNumber',
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
   * Get payment history
   * GET /api/companies/:companyId/payment-history
   */
  static async getPaymentHistory(req, res) {
    try {
      const { companyId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company profile not found'
        });
      }

      const paymentHistory = company.paymentHistory
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Payment history retrieved successfully',
        data: {
          paymentHistory,
          totalTransactions: company.paymentHistory.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
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
}

module.exports = CompanyController;