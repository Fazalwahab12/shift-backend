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