const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Company Profile Model - Professional Implementation
 * Matches frontend company profile steps with enterprise-grade features
 */
class Company {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    
    // STEP 1: Company Information & Admin Details
    this.companyName = data.companyName || null; // Full legal name
    this.crNumber = data.crNumber || null; // Commercial Registration Number
    this.adminDetails = data.adminDetails || {
      fullName: null,
      role: null,
      phone: null,
      email: null
    };
    
    // STEP 2: Business Entity / Brand Details
    this.brands = data.brands || []; // Array of brands/entities
    this.primaryBrand = data.primaryBrand || null; // Main brand
    
    // STEP 3: Business Location & Team
    this.locations = data.locations || []; // Array of business locations
    this.teamMembers = data.teamMembers || []; // Invited team members
    this.maxLocations = data.maxLocations || 1; // Based on subscription plan
    
    // STEP 4: SUBSCRIPTION & PAYMENT SYSTEM
    this.subscriptionPlan = data.subscriptionPlan || 'trial'; // 'trial', 'starter', 'professional', 'custom'
    this.subscriptionStatus = data.subscriptionStatus || 'trial'; // 'trial', 'active', 'expired', 'suspended'
    
    // 14-DAY TRIAL SYSTEM
    this.trialStartDate = data.trialStartDate || new Date().toISOString();
    this.trialEndDate = data.trialEndDate || this.calculateTrialEndDate();
    this.trialDaysRemaining = data.trialDaysRemaining || 14;
    this.trialExpired = data.trialExpired || false;
    
    // PAYMENT INTEGRATION
    this.paymentMethods = data.paymentMethods || []; // Multiple payment methods
    this.defaultPaymentMethod = data.defaultPaymentMethod || null;
    this.paymentHistory = data.paymentHistory || []; // Transaction history
    this.nextBillingDate = data.nextBillingDate || null;
    this.billingCycle = data.billingCycle || 'monthly'; // 'monthly', 'yearly'
    
    // OMAN BANK API INTEGRATION
    this.bankDetails = data.bankDetails || {
      bankName: null,
      accountNumber: null,
      iban: null,
      swiftCode: null,
      isVerified: false
    };
    this.withdrawalSettings = data.withdrawalSettings || {
      method: 'bank', // 'bank', 'paypal', 'stripe'
      minAmount: 50,
      autoWithdraw: false
    };
    
    // CREDIT & WALLET SYSTEM
    this.creditBalance = data.creditBalance || 0; // OMR balance
    this.walletHistory = data.walletHistory || []; // Credit transactions
    this.pendingCredits = data.pendingCredits || 0; // Credits after CR validation
    
    // USAGE & LIMITS
    this.usageStats = data.usageStats || {
      instantMatches: 0,
      interviews: 0,
      jobPostings: 0,
      monthlyReset: new Date().toISOString()
    };
    this.planLimits = data.planLimits || this.getPlanLimits();
    
    // STEP 5: Terms & Conditions
    this.termsAccepted = data.termsAccepted || false;
    this.termsAcceptedAt = data.termsAcceptedAt || null;
    this.termsVersion = data.termsVersion || '1.0';
    
    // STEP 6: Profile Confirmation
    this.profileConfirmed = data.profileConfirmed || false;
    this.confirmedAt = data.confirmedAt || null;
    
    // VERIFICATION SYSTEM
    this.crVerificationStatus = data.crVerificationStatus || 'pending'; // 'pending', 'verified', 'rejected'
    this.crVerifiedAt = data.crVerifiedAt || null;
    this.crVerificationNotes = data.crVerificationNotes || null;
    this.isVerified = data.isVerified || false;
    
    // PROFILE MANAGEMENT
    this.profileCompletionStep = data.profileCompletionStep || 1; // 1-6 steps
    this.isProfileComplete = data.isProfileComplete || false;
    this.profileCompletionPercentage = data.profileCompletionPercentage || 0;
    
    // CUSTOM PLANS & ADMIN CONTACT
    this.customPlanRequested = data.customPlanRequested || false;
    this.customPlanDetails = data.customPlanDetails || null;
    this.adminContactRequested = data.adminContactRequested || false;
    this.adminNotes = data.adminNotes || null;
    
    // SYSTEM FIELDS
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isSuspended = data.isSuspended || false;
    this.suspensionReason = data.suspensionReason || null;
    this.lastLoginAt = data.lastLoginAt || null;
    
    // PERFORMANCE METRICS
    this.totalJobsPosted = data.totalJobsPosted || 0;
    this.activeJobs = data.activeJobs || 0;
    this.totalHires = data.totalHires || 0;
    this.successfulMatches = data.successfulMatches || 0;
    this.averageRating = data.averageRating || 0;
    this.totalReviews = data.totalReviews || 0;
    
    // METADATA
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
  
  /**
   * Calculate trial end date (14 days from start)
   */
  calculateTrialEndDate() {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);
    return endDate.toISOString();
  }
  
  /**
   * Get plan limits based on subscription
   */
  getPlanLimits() {
    const limits = {
      trial: { locations: 1, instantMatches: 10, interviews: 5, jobPostings: 3 },
      starter: { locations: 1, instantMatches: 20, interviews: 50, jobPostings: 10 },
      professional: { locations: 3, instantMatches: 50, interviews: 100, jobPostings: 25 },
      custom: { locations: 99, instantMatches: 999, interviews: 999, jobPostings: 99 }
    };
    return limits[this.subscriptionPlan] || limits.trial;
  }

  /**
   * Create new company profile with 14-day trial
   */
  static async create(userId, companyData) {
    try {
      const company = new Company({
        userId: userId,
        trialStartDate: new Date().toISOString(),
        ...companyData
      });

      // Calculate trial days remaining
      await company.updateTrialStatus();

      const result = await databaseService.create(COLLECTIONS.COMPANIES, company.toJSON());
      return new Company({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating company profile:', error);
      throw error;
    }
  }

  /**
   * Real-time trial countdown calculation
   */
  calculateRemainingDays() {
    const now = new Date();
    const trialStart = new Date(this.trialStartDate);
    const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - daysPassed);
  }

  /**
   * Get real-time trial status with display format
   */
  getTrialStatus() {
    const remainingDays = this.calculateRemainingDays();
    return {
      daysRemaining: remainingDays,
      totalDays: 14,
      daysPassed: 14 - remainingDays,
      expired: remainingDays === 0,
      displayText: `${remainingDays}/14 days`
    };
  }

  /**
   * Update trial status and days remaining
   */
  async updateTrialStatus() {
    try {
      const now = new Date();
      const trialStart = new Date(this.trialStartDate);
      const trialEnd = new Date(this.trialEndDate);
      
      const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 14 - daysPassed);
      
      const updateData = {
        trialDaysRemaining: daysRemaining,
        trialExpired: daysRemaining === 0,
        updatedAt: new Date().toISOString()
      };

      // If trial expired, suspend access unless they have active subscription
      if (daysRemaining === 0 && this.subscriptionStatus === 'trial') {
        updateData.subscriptionStatus = 'expired';
        updateData.isSuspended = true;
        updateData.suspensionReason = 'Trial period expired';
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating trial status:', error);
      throw error;
    }
  }

  /**
   * PAYMENT METHODS MANAGEMENT
   */
  async addPaymentMethod(paymentMethodData) {
    try {
      const newPaymentMethod = {
        id: Date.now().toString(),
        ...paymentMethodData,
        addedAt: new Date().toISOString(),
        isVerified: false
      };

      const updatedMethods = [...this.paymentMethods, newPaymentMethod];
      
      const updateData = {
        paymentMethods: updatedMethods,
        updatedAt: new Date().toISOString()
      };

      // Set as default if it's the first payment method
      if (this.paymentMethods.length === 0) {
        updateData.defaultPaymentMethod = newPaymentMethod.id;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Process subscription purchase
   */
  async purchaseSubscription(planType, paymentMethodId, billingCycle = 'monthly') {
    try {
      const planPrices = {
        starter: { monthly: 99, yearly: 1188 }, // 99 OMR starter bundle
        professional: { monthly: 199, yearly: 2388 } // 199 OMR professional bundle
      };

      if (!planPrices[planType]) {
        throw new Error('Invalid subscription plan');
      }

      const price = planPrices[planType][billingCycle];
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

      const transaction = {
        id: `txn_${Date.now()}`,
        type: 'subscription_purchase',
        planType,
        amount: price,
        currency: 'OMR',
        paymentMethodId,
        billingCycle,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      const updateData = {
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        billingCycle,
        nextBillingDate: nextBilling.toISOString(),
        paymentHistory: [...this.paymentHistory, transaction],
        planLimits: this.getPlanLimits(),
        trialExpired: true,
        isSuspended: false,
        suspensionReason: null,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error processing subscription purchase:', error);
      throw error;
    }
  }

  /**
   * Process pay-as-you-go payment
   */
  async processPAYGPayment(matches, interviewPackage, paymentMethodId) {
    try {
      let totalAmount = matches * 5; // 5 OMR per match

      // Add interview package cost
      const interviewPrices = {
        '10interviews': 50,
        '20interviews': 80,
        '50interviews': 250
      };

      if (interviewPackage && interviewPrices[interviewPackage]) {
        totalAmount += interviewPrices[interviewPackage];
      }

      const transaction = {
        id: `txn_${Date.now()}`,
        type: 'payg_payment',
        matches,
        interviewPackage,
        amount: totalAmount,
        currency: 'OMR',
        paymentMethodId,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      // Add credits to usage stats
      const updatedUsageStats = {
        ...this.usageStats,
        instantMatches: this.usageStats.instantMatches + matches
      };

      if (interviewPackage) {
        const interviewCounts = {
          '10interviews': 10,
          '20interviews': 20,
          '50interviews': 50
        };
        updatedUsageStats.interviews += interviewCounts[interviewPackage] || 0;
      }

      const updateData = {
        paymentHistory: [...this.paymentHistory, transaction],
        usageStats: updatedUsageStats,
        creditBalance: this.creditBalance + totalAmount,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error processing PAYG payment:', error);
      throw error;
    }
  }

  /**
   * ADMIN METHODS: CR Verification
   */
  async verifyCR(adminNotes = null) {
    try {
      const updateData = {
        crVerificationStatus: 'verified',
        crVerifiedAt: new Date().toISOString(),
        crVerificationNotes: adminNotes,
        isVerified: true,
        pendingCredits: 25500, // Add credits after CR validation
        creditBalance: this.creditBalance + 25500,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error verifying CR:', error);
      throw error;
    }
  }

  /**
   * Request custom plan
   */
  async requestCustomPlan(planDetails) {
    try {
      const updateData = {
        customPlanRequested: true,
        customPlanDetails: {
          ...planDetails,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        },
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error requesting custom plan:', error);
      throw error;
    }
  }

  /**
   * Contact admin for support
   */
  async contactAdmin(message) {
    try {
      const updateData = {
        adminContactRequested: true,
        adminNotes: message,
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error contacting admin:', error);
      throw error;
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(email) {
    try {
      const teamMember = {
        email,
        invitedAt: new Date().toISOString(),
        status: 'pending'
      };

      const updatedTeamMembers = [...this.teamMembers, teamMember];
      
      return await this.update({
        teamMembers: updatedTeamMembers,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Add brand/entity
   */
  async addBrand(brandData) {
    try {
      const brand = {
        id: Date.now().toString(),
        ...brandData,
        addedAt: new Date().toISOString()
      };

      const updatedBrands = [...this.brands, brand];
      
      const updateData = {
        brands: updatedBrands,
        updatedAt: new Date().toISOString()
      };

      // Set as primary if it's the first brand
      if (this.brands.length === 0) {
        updateData.primaryBrand = brand.id;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error adding brand:', error);
      throw error;
    }
  }

  /**
   * Add business location
   */
  async addLocation(locationData) {
    try {
      // Check if company can add more locations
      if (this.locations.length >= this.maxLocations) {
        throw new Error('Location limit reached for current plan');
      }

      const location = {
        id: Date.now().toString(),
        ...locationData,
        addedAt: new Date().toISOString()
      };

      const updatedLocations = [...this.locations, location];
      
      return await this.update({
        locations: updatedLocations,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding location:', error);
      throw error;
    }
  }

  /**
   * Get subscription status for display
   */
  getSubscriptionStatus() {
    if (this.trialExpired && this.subscriptionStatus === 'expired') {
      return 'trial_expired';
    }
    if (this.subscriptionStatus === 'trial' && this.trialDaysRemaining > 0) {
      return 'trial_active';
    }
    return this.subscriptionStatus;
  }

  /**
   * Check if company can perform action based on plan limits
   */
  canPerformAction(action) {
    const limits = this.planLimits;
    const usage = this.usageStats;

    switch (action) {
      case 'add_location':
        return this.locations.length < this.maxLocations;
      case 'instant_match':
        return usage.instantMatches < limits.instantMatches;
      case 'interview':
        return usage.interviews < limits.interviews;
      case 'job_posting':
        return usage.jobPostings < limits.jobPostings;
      default:
        return false;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  calculateCompletionPercentage() {
    const steps = [
      { step: 1, completed: this.companyName && this.crNumber && this.adminDetails.fullName },
      { step: 2, completed: this.brands.length > 0 },
      { step: 3, completed: this.locations.length > 0 },
      { step: 4, completed: true }, // Plan step is always completed
      { step: 5, completed: this.termsAccepted },
      { step: 6, completed: this.profileConfirmed }
    ];

    const completedSteps = steps.filter(s => s.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
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
      
      // Company Information & Admin
      companyName: this.companyName,
      crNumber: this.crNumber,
      adminDetails: this.adminDetails,
      
      // Business Details
      brands: this.brands,
      primaryBrand: this.primaryBrand,
      locations: this.locations,
      teamMembers: this.teamMembers,
      maxLocations: this.maxLocations,
      
      // Subscription & Payment
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      trialStartDate: this.trialStartDate,
      trialEndDate: this.trialEndDate,
      trialDaysRemaining: this.trialDaysRemaining,
      trialExpired: this.trialExpired,
      paymentMethods: this.paymentMethods,
      defaultPaymentMethod: this.defaultPaymentMethod,
      paymentHistory: this.paymentHistory,
      nextBillingDate: this.nextBillingDate,
      billingCycle: this.billingCycle,
      
      // Banking & Wallet
      bankDetails: this.bankDetails,
      withdrawalSettings: this.withdrawalSettings,
      creditBalance: this.creditBalance,
      walletHistory: this.walletHistory,
      pendingCredits: this.pendingCredits,
      
      // Usage & Limits
      usageStats: this.usageStats,
      planLimits: this.planLimits,
      
      // Terms & Profile
      termsAccepted: this.termsAccepted,
      termsAcceptedAt: this.termsAcceptedAt,
      termsVersion: this.termsVersion,
      profileConfirmed: this.profileConfirmed,
      confirmedAt: this.confirmedAt,
      
      // Verification
      crVerificationStatus: this.crVerificationStatus,
      crVerifiedAt: this.crVerifiedAt,
      crVerificationNotes: this.crVerificationNotes,
      isVerified: this.isVerified,
      
      // Profile Management
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      profileCompletionPercentage: this.profileCompletionPercentage,
      
      // Custom Plans & Admin
      customPlanRequested: this.customPlanRequested,
      customPlanDetails: this.customPlanDetails,
      adminContactRequested: this.adminContactRequested,
      adminNotes: this.adminNotes,
      
      // System Fields
      isActive: this.isActive,
      isSuspended: this.isSuspended,
      suspensionReason: this.suspensionReason,
      lastLoginAt: this.lastLoginAt,
      
      // Performance Metrics
      totalJobsPosted: this.totalJobsPosted,
      activeJobs: this.activeJobs,
      totalHires: this.totalHires,
      successfulMatches: this.successfulMatches,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      
      // Metadata
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Basic company info
      companyName: this.companyName,
      brands: this.brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        logo: brand.logo,
        industry: brand.industry
      })),
      primaryBrand: this.primaryBrand,
      
      // Subscription info
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.getSubscriptionStatus(),
      trialDaysRemaining: this.trialDaysRemaining,
      trialExpired: this.trialExpired,
      
      // Verification status
      isVerified: this.isVerified,
      crVerificationStatus: this.crVerificationStatus,
      
      // Profile completion
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      profileCompletionPercentage: this.calculateCompletionPercentage(),
      
      // Performance metrics
      totalJobsPosted: this.totalJobsPosted,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      
      // System status
      isActive: this.isActive,
      isSuspended: this.isSuspended,
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to detailed JSON for admin/management
   */
  toDetailedJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Complete company information
      companyName: this.companyName,
      crNumber: this.crNumber,
      adminDetails: this.adminDetails,
      brands: this.brands,
      locations: this.locations,
      teamMembers: this.teamMembers,
      
      // Complete subscription details
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      trialStartDate: this.trialStartDate,
      trialEndDate: this.trialEndDate,
      trialDaysRemaining: this.trialDaysRemaining,
      trialExpired: this.trialExpired,
      paymentMethods: this.paymentMethods,
      paymentHistory: this.paymentHistory.slice(-10), // Last 10 transactions
      nextBillingDate: this.nextBillingDate,
      
      // Financial details
      creditBalance: this.creditBalance,
      pendingCredits: this.pendingCredits,
      usageStats: this.usageStats,
      planLimits: this.planLimits,
      
      // Verification details
      crVerificationStatus: this.crVerificationStatus,
      crVerifiedAt: this.crVerifiedAt,
      crVerificationNotes: this.crVerificationNotes,
      isVerified: this.isVerified,
      
      // Profile status
      profileCompletionStep: this.profileCompletionStep,
      profileCompletionPercentage: this.calculateCompletionPercentage(),
      termsAccepted: this.termsAccepted,
      profileConfirmed: this.profileConfirmed,
      
      // Admin requests
      customPlanRequested: this.customPlanRequested,
      adminContactRequested: this.adminContactRequested,
      adminNotes: this.adminNotes,
      
      // System information
      isActive: this.isActive,
      isSuspended: this.isSuspended,
      suspensionReason: this.suspensionReason,
      lastLoginAt: this.lastLoginAt,
      
      // All metrics
      totalJobsPosted: this.totalJobsPosted,
      activeJobs: this.activeJobs,
      totalHires: this.totalHires,
      successfulMatches: this.successfulMatches,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Company;