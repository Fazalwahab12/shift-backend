const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Company Profile Model
 */
class Company {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    
    // Basic Company Information (Step 1)
    this.companyName = data.companyName || null;
    this.companyNameArabic = data.companyNameArabic || null;
    this.legalEntityName = data.legalEntityName || null;
    this.commercialRegistrationNumber = data.commercialRegistrationNumber || null;
    this.taxRegistrationNumber = data.taxRegistrationNumber || null;
    this.establishedYear = data.establishedYear || null;
    this.companySize = data.companySize || null; // 'startup', 'small', 'medium', 'large'
    
    // Industry and Business (Step 2)
    this.primaryIndustry = data.primaryIndustry || null;
    this.secondaryIndustries = data.secondaryIndustries || [];
    this.businessDescription = data.businessDescription || null;
    this.servicesOffered = data.servicesOffered || [];
    this.targetMarkets = data.targetMarkets || [];
    
    // Contact Information (Step 3)
    this.contactPerson = data.contactPerson || {};
    this.companyEmail = data.companyEmail || null;
    this.companyPhone = data.companyPhone || null;
    this.website = data.website || null;
    this.socialMedia = data.socialMedia || {};
    
    // Location and Address (Step 4)
    this.headquarters = data.headquarters || {};
    this.branches = data.branches || [];
    this.operatingGovernorate = data.operatingGovernorate || [];
    this.operatingWilayat = data.operatingWilayat || [];
    
    // Branding and Media (Step 5)
    this.companyLogo = data.companyLogo || null;
    this.coverPhoto = data.coverPhoto || null;
    this.companyPhotos = data.companyPhotos || [];
    this.brandColors = data.brandColors || {};
    
    // HR and Hiring Preferences (Step 6)
    this.hrContactInfo = data.hrContactInfo || {};
    this.typicalHiringRoles = data.typicalHiringRoles || [];
    this.preferredCandidateProfile = data.preferredCandidateProfile || {};
    this.hiringFrequency = data.hiringFrequency || null; // 'weekly', 'monthly', 'quarterly', 'as-needed'
    this.averageJobsPerMonth = data.averageJobsPerMonth || 0;
    
    // Payment and Subscription
    this.subscriptionPlan = data.subscriptionPlan || 'free'; // 'free', 'basic', 'premium', 'enterprise'
    this.paymentMethod = data.paymentMethod || null;
    this.billingAddress = data.billingAddress || {};
    
    // Verification and Status
    this.isVerified = data.isVerified || false;
    this.verificationDocuments = data.verificationDocuments || [];
    this.verificationStatus = data.verificationStatus || 'pending'; // 'pending', 'verified', 'rejected'
    this.profileCompletionStep = data.profileCompletionStep || 1;
    this.isProfileComplete = data.isProfileComplete || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    
    // Statistics and Metrics
    this.totalJobsPosted = data.totalJobsPosted || 0;
    this.activeJobs = data.activeJobs || 0;
    this.totalHires = data.totalHires || 0;
    this.averageRating = data.averageRating || 0;
    this.totalReviews = data.totalReviews || 0;
    
    // Metadata
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Create new company profile
   */
  static async create(userId, companyData) {
    try {
      const company = new Company({
        userId: userId,
        ...companyData
      });

      const result = await databaseService.create(COLLECTIONS.COMPANIES, company.toJSON());
      return new Company({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating company profile:', error);
      throw error;
    }
  }

  /**
   * Create company profile from onboarding data
   */
  static async createFromOnboarding(userId, companyData, onboardingData) {
    try {
      // Inherit data from onboarding
      const profileData = {
        userId: userId,
        primaryIndustry: onboardingData.selectedIndustries[0] || null,
        secondaryIndustries: onboardingData.selectedIndustries.slice(1) || [],
        typicalHiringRoles: onboardingData.typicalHiringRoles || onboardingData.selectedRoles,
        hiringFrequency: onboardingData.hiringNeeds || 'as-needed',
        ...companyData
      };

      const company = new Company(profileData);
      const result = await databaseService.create(COLLECTIONS.COMPANIES, company.toJSON());
      return new Company({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating company profile from onboarding:', error);
      throw error;
    }
  }

  /**
   * Find company by user ID
   */
  static async findByUserId(userId) {
    try {
      const companies = await databaseService.query(COLLECTIONS.COMPANIES, [
        { field: 'userId', operator: '==', value: userId }
      ]);

      return companies.length > 0 ? new Company(companies[0]) : null;
    } catch (error) {
      console.error('Error finding company by user ID:', error);
      throw error;
    }
  }

  /**
   * Find company by ID
   */
  static async findById(companyId) {
    try {
      const companyData = await databaseService.getById(COLLECTIONS.COMPANIES, companyId);
      return companyData ? new Company(companyData) : null;
    } catch (error) {
      console.error('Error finding company by ID:', error);
      throw error;
    }
  }

  /**
   * Find company by commercial registration number
   */
  static async findByRegistrationNumber(crNumber) {
    try {
      const companies = await databaseService.query(COLLECTIONS.COMPANIES, [
        { field: 'commercialRegistrationNumber', operator: '==', value: crNumber }
      ]);

      return companies.length > 0 ? new Company(companies[0]) : null;
    } catch (error) {
      console.error('Error finding company by registration number:', error);
      throw error;
    }
  }

  /**
   * Update company profile
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update company without ID');
      }

      const updatedCompany = await databaseService.update(COLLECTIONS.COMPANIES, this.id, updateData);
      Object.assign(this, updatedCompany);
      return this;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Update profile step
   */
  async updateProfileStep(step, stepData) {
    try {
      const updateData = {
        profileCompletionStep: Math.max(this.profileCompletionStep, step),
        ...stepData
      };

      // Mark profile as complete if step 6 is reached
      if (step >= 6) {
        updateData.isProfileComplete = true;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating profile step:', error);
      throw error;
    }
  }

  /**
   * Search companies by criteria
   */
  static async search(searchCriteria = {}) {
    try {
      const filters = [];
      
      // Add search filters
      if (searchCriteria.industry) {
        filters.push({ field: 'primaryIndustry', operator: '==', value: searchCriteria.industry });
      }
      
      if (searchCriteria.governorate) {
        filters.push({ field: 'operatingGovernorate', operator: 'array-contains', value: searchCriteria.governorate });
      }
      
      if (searchCriteria.companySize) {
        filters.push({ field: 'companySize', operator: '==', value: searchCriteria.companySize });
      }

      // Only show active and verified companies
      filters.push({ field: 'isActive', operator: '==', value: true });
      filters.push({ field: 'isVerified', operator: '==', value: true });

      const companies = await databaseService.query(
        COLLECTIONS.COMPANIES,
        filters,
        { field: 'updatedAt', direction: 'desc' },
        searchCriteria.limit || 50
      );

      return companies.map(companyData => new Company(companyData));
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  }

  /**
   * Get companies by industry
   */
  static async getByIndustry(industry, limit = 20) {
    try {
      const companies = await databaseService.query(COLLECTIONS.COMPANIES, [
        { field: 'primaryIndustry', operator: '==', value: industry },
        { field: 'isActive', operator: '==', value: true },
        { field: 'isVerified', operator: '==', value: true }
      ], 
      { field: 'averageRating', direction: 'desc' },
      limit);

      return companies.map(companyData => new Company(companyData));
    } catch (error) {
      console.error('Error getting companies by industry:', error);
      throw error;
    }
  }

  /**
   * Increment job posting count
   */
  async incrementJobCount() {
    try {
      return await this.update({
        totalJobsPosted: this.totalJobsPosted + 1,
        activeJobs: this.activeJobs + 1
      });
    } catch (error) {
      console.error('Error incrementing job count:', error);
      throw error;
    }
  }

  /**
   * Update company rating
   */
  async updateRating(newRating) {
    try {
      const totalReviews = this.totalReviews + 1;
      const averageRating = ((this.averageRating * this.totalReviews) + newRating) / totalReviews;
      
      return await this.update({
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: totalReviews
      });
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  /**
   * Check if commercial registration exists
   */
  static async registrationExists(crNumber) {
    try {
      const company = await Company.findByRegistrationNumber(crNumber);
      return company !== null;
    } catch (error) {
      console.error('Error checking registration existence:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  getProfileCompletionPercentage() {
    const requiredFields = [
      'companyName', 'commercialRegistrationNumber', 'primaryIndustry',
      'companyEmail', 'companyPhone', 'headquarters'
    ];
    
    let completedFields = 0;
    requiredFields.forEach(field => {
      if (this[field] && (typeof this[field] === 'object' ? Object.keys(this[field]).length > 0 : true)) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      userId: this.userId,
      companyName: this.companyName,
      companyNameArabic: this.companyNameArabic,
      legalEntityName: this.legalEntityName,
      commercialRegistrationNumber: this.commercialRegistrationNumber,
      taxRegistrationNumber: this.taxRegistrationNumber,
      establishedYear: this.establishedYear,
      companySize: this.companySize,
      primaryIndustry: this.primaryIndustry,
      secondaryIndustries: this.secondaryIndustries,
      businessDescription: this.businessDescription,
      servicesOffered: this.servicesOffered,
      targetMarkets: this.targetMarkets,
      contactPerson: this.contactPerson,
      companyEmail: this.companyEmail,
      companyPhone: this.companyPhone,
      website: this.website,
      socialMedia: this.socialMedia,
      headquarters: this.headquarters,
      branches: this.branches,
      operatingGovernorate: this.operatingGovernorate,
      operatingWilayat: this.operatingWilayat,
      companyLogo: this.companyLogo,
      coverPhoto: this.coverPhoto,
      companyPhotos: this.companyPhotos,
      brandColors: this.brandColors,
      hrContactInfo: this.hrContactInfo,
      typicalHiringRoles: this.typicalHiringRoles,
      preferredCandidateProfile: this.preferredCandidateProfile,
      hiringFrequency: this.hiringFrequency,
      averageJobsPerMonth: this.averageJobsPerMonth,
      subscriptionPlan: this.subscriptionPlan,
      paymentMethod: this.paymentMethod,
      billingAddress: this.billingAddress,
      isVerified: this.isVerified,
      verificationDocuments: this.verificationDocuments,
      verificationStatus: this.verificationStatus,
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      isActive: this.isActive,
      totalJobsPosted: this.totalJobsPosted,
      activeJobs: this.activeJobs,
      totalHires: this.totalHires,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      companyName: this.companyName,
      companyNameArabic: this.companyNameArabic,
      primaryIndustry: this.primaryIndustry,
      secondaryIndustries: this.secondaryIndustries,
      businessDescription: this.businessDescription,
      companySize: this.companySize,
      website: this.website,
      operatingGovernorate: this.operatingGovernorate,
      companyLogo: this.companyLogo,
      coverPhoto: this.coverPhoto,
      isVerified: this.isVerified,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      totalJobsPosted: this.totalJobsPosted,
      establishedYear: this.establishedYear,
      profileCompletionPercentage: this.getProfileCompletionPercentage(),
      createdAt: this.createdAt
    };
  }
}

module.exports = Company;