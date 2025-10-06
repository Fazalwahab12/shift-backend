const { databaseService, COLLECTIONS } = require('../config/database');
const notificationController = require('../controllers/notificationController');

/**
 * Company Profile Model - Professional Implementation
 * 
 */
class Company {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;

    this.companyName = data.companyName || null;
    this.crNumber = data.crNumber || null;
    this.companyType = data.companyType || null;
    this.geographicalPresence = data.geographicalPresence || null;

    this.adminDetails = data.adminDetails || {
      fullName: data.contactPerson || data.adminName || null,
      role: data.contactRole || data.adminRole || null,
      phone: data.contactPhone || data.adminPhone || null,
      email: data.contactEmail || data.adminEmail || null,
      position: data.contactRole || data.adminRole || null,
    };

    this.companyNumber = data.companyNumber || null;
    this.industry = data.industry || null;
    this.registrationDate = data.registrationDate || new Date().toISOString();
    this.numberOfBands = data.numberOfBands || null;
    this.numberOfBranches = data.numberOfBranches || null;
    this.lastActiveDate = data.lastActiveDate || null;

    // Consolidate hiring metrics - use single source of truth
    this.totalJobsPosted = data.totalJobsPosted || data.numberOfJobPosts || 0;
    this.totalHires = data.totalHires || data.totalInstantHires || data.successfulMatches || 0;
    this.totalInterviews = data.totalInterviews || 0;
    this.totalSpentOnHiring = data.totalSpentOnHiring || data.spentOnHiring || 0;
    this.hasUsedFreeTrial = data.hasUsedFreeTrial || data.usedFreeTrial || false;
    this.previousPlansPurchases = data.previousPlansPurchases || [];
    
    

    
    // STEP 2: Business Entity / Brand Details
    this.brands = data.brands || [];
    this.primaryBrand = data.primaryBrand || null;
    
    
    // STEP 3: Business Location & Team
    this.locations = data.locations || [];
    this.teamMembers = data.teamMembers || [];
    this.maxLocations = data.maxLocations || null;
    
    // STEP 4: ENHANCED SUBSCRIPTION & PAYMENT SYSTEM 
    this.subscriptionPlan = data.subscriptionPlan || 'trial';
    this.subscriptionStatus = data.subscriptionStatus || 'trial';
    
    // Enhanced Pricing Model 
    this.pricingDetails = data.pricingDetails || {
      // Free Trial (14 Days On Us!)
      freeTrial: {
        duration: 14, // days
        features: {
          instantMatches: 'unlimited',
          interviews: 'unlimited',
          locations: 1,
          fullAccess: true,
          support: 'email'
        },
        activated: false,
        startDate: null,
        endDate: null,
        description: "Get full access to all features for one location — absolutely free."
      },
      
      // Pay As You Go (Only pay when you need to hire)
      payAsYouGo: {
        available: true,
        description: "Only pay when you need to hire.",
        pricing: {
          instantMatch: 5, // OMR per match
          interviewPackages: [
            {
              name: 'Small Package',
              interviews: 10,
              price: 50, // OMR
              validity: 4,
              validityUnit: 'weeks',
              savings: 0
            },
            {
              name: 'Medium Package',
              interviews: 20,
              price: 80, // OMR
              validity: 4,
              validityUnit: 'weeks',
              savings: 20
            },
            {
              name: 'Large Package',
              interviews: 50,
              price: 250, // OMR
              validity: 6,
              validityUnit: 'weeks',
              savings: 100
            }
          ]
        },
        usage: {
          currentMatches: 0,
          currentInterviews: 0,
          totalSpent: 0
        }
      },
      
      // Subscription Plans
      subscriptionPlans: [
        {
          id: 'starter',
          name: 'Starter Bundle',
          price: 99, // OMR
          originalPrice: 198,
          savings: 50, // percentage
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
          popular: false
        },
        {
          id: 'pro',
          name: 'Pro Bundle',
          price: 200, // OMR
          originalPrice: 500,
          savings: 60, // percentage
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
          popular: true
        }
      ],
      
      // Custom Plans
      customPlans: {
        available: true,
        description: "Contact us if you have multiple locations or need a tailored plan that fits your hiring needs.",
        features: [
          'Multiple locations',
          'Unlimited instant matches',
          'Unlimited interviews',
          'Custom integrations',
          'Dedicated support',
          'Advanced analytics'
        ]
      }
    };
    
    // 14-DAY TRIAL SYSTEM - consolidate trial date fields
    this.trialStartDate = data.trialStartDate || data.trialStartAt || new Date().toISOString();
    this.trialEndDate = data.trialEndDate || this.calculateTrialEndDate();
    this.trialExpired = data.trialExpired || false;
    
    // ENHANCED PAYMENT INTEGRATION 
    this.paymentMethods = data.paymentMethods || [];
    this.defaultPaymentMethod = data.defaultPaymentMethod || null;
    
    // Payment History 
    this.paymentHistory = data.paymentHistory || []; 
    this.pendingPayments = data.pendingPayments || [];
    this.nextBillingDate = data.nextBillingDate || null;
    this.billingCycle = data.billingCycle || 'monthly';
    
    // Payment Transaction Structure 
    this.paymentTransactionStructure = {
      transactionId: null, // Unique transaction ID
      payerName: null, // Company name
      payerId: null, // Company ID
      paymentType: null, // 'PAYG', 'Add on', 'Starter Plan', 'Custom Plan'
      amount: 0, // OMR
      paymentDate: null,
      validity: null, // Validity period
      lpoNumber: null, // LPO Number
      lpoIssuedDate: null, // LPO Issued Date
      paymentStatus: null, // 'pending', 'completed', 'failed', 'refunded'
      transactionReference: null // External reference
    };
    
    this.withdrawalSettings = data.withdrawalSettings || {
      method: 'bank',
      minAmount: 50,
      autoWithdraw: false
    };
    
    // CREDIT & WALLET SYSTEM
    this.creditBalance = data.creditBalance || 0; // OMR balance
    this.walletHistory = data.walletHistory || []; // Credit transactions
    this.pendingCredits = data.pendingCredits || 0; // Credits after CR validation
    
    // BLOCKING SYSTEM
    this.blockedSeekers = data.blockedSeekers || []; // Array of blocked seeker IDs with reasons
    this.blockingEnabled = data.blockingEnabled !== false; // Allow companies to block seekers
    
    // USAGE & LIMITS (Enhanced Analytics)
    this.usageStats = data.usageStats || {
      instantMatches: 0,
      interviews: 0,
      jobPostings: 0,
      monthlyReset: new Date().toISOString(),
      dailyUsage: {},
      weeklyTrends: [],
      monthlyTrends: [],
      peakUsageHours: [],
      conversionRates: {
        matchToInterview: 0,
        interviewToHire: 0,
        overallConversion: 0
      }
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
    this.crVerificationStatus = data.crVerificationStatus || 'pending';
    this.crVerifiedAt = data.crVerifiedAt || null;
    this.crVerificationNotes = data.crVerificationNotes || null;
    this.isVerified = data.isVerified || true;
    
    // PROFILE MANAGEMENT
    this.profileCompletionStep = data.profileCompletionStep || 1;
    this.isProfileComplete = data.isProfileComplete || false;
    this.profileCompletionPercentage = data.profileCompletionPercentage || 0;
    
    // CUSTOM PLANS & ADMIN CONTACT
    this.customPlanRequested = data.customPlanRequested || false;
    this.customPlanDetails = data.customPlanDetails || null;
    
    // SYSTEM FIELDS
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastLoginAt = data.lastLoginAt || null;
    
    // PERFORMANCE METRICS - removed duplicates, use consolidated fields above
    this.activeJobs = data.activeJobs || 0;
    this.totalReviews = data.totalReviews || 0;
    
    
    // HEALTH SCORE (Overall company performance rating)
    this.healthScore = data.healthScore || 0; // 0-100
    
    // Timestamps
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
  
  /**
   * Add payment transaction to history
   */
  async addPaymentTransaction(transactionData) {
    try {
      const transaction = {
        transactionId: transactionData.transactionId || this.generateTransactionId(),
        payerName: this.companyName,
        payerId: this.id,
        paymentType: transactionData.paymentType, // 'PAYG', 'Add on', 'Starter Plan', 'Custom Plan'
        amount: transactionData.amount,
        paymentDate: transactionData.paymentDate || new Date().toISOString(),
        validity: transactionData.validity,
        lpoNumber: transactionData.lpoNumber || null,
        lpoIssuedDate: transactionData.lpoIssuedDate || null,
        paymentStatus: transactionData.paymentStatus || 'completed',
        transactionReference: transactionData.transactionReference || null,
        createdAt: new Date().toISOString()
      };

      this.paymentHistory.push(transaction);
      
      // Update spending total
      this.totalSpentOnHiring += transaction.amount;
      this.lastActiveDate = new Date().toISOString();
      
      // Update usage based on payment type
      await this.updateUsageFromPayment(transaction);
      
      await this.update({
        paymentHistory: this.paymentHistory,
        totalSpentOnHiring: this.totalSpentOnHiring,
        lastActiveDate: this.lastActiveDate
      });

      return transaction;
    } catch (error) {
      console.error('Error adding payment transaction:', error);
      throw error;
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TXN-${timestamp}-${random}`;
  }

  /**
   * Update usage based on payment type
   */
  async updateUsageFromPayment(transaction) {
    switch (transaction.paymentType) {
      case 'PAYG':
        // Pay as you go - instant matches
        this.usageStats.instantMatches += Math.floor(transaction.amount / 5); // 5 OMR per match
        break;
      case 'Add on':
        // Interview packages
        const interviewPackage = this.pricingDetails.payAsYouGo.pricing.interviewPackages.find(p => p.price === transaction.amount);
        if (interviewPackage) {
          this.usageStats.interviews += interviewPackage.interviews;
        }
        break;
      case 'Starter Plan':
        // Starter bundle
        this.subscriptionPlan = 'starter';
        this.planLimits = this.getPlanLimits();
        this.nextBillingDate = new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)).toISOString(); // 6 months
        break;
      case 'Pro Bundle':
        // Pro bundle
        this.subscriptionPlan = 'pro';
        this.planLimits = this.getPlanLimits();
        this.nextBillingDate = new Date(Date.now() + (12 * 30 * 24 * 60 * 60 * 1000)).toISOString(); // 12 months
        break;
      case 'Custom Plan':
        // Custom plan
        this.subscriptionPlan = 'custom';
        this.planLimits = this.getPlanLimits();
        break;
    }
  }

  /**
   * Get payment history with filtering
   */
  getPaymentHistory(filters = {}) {
    let history = [...this.paymentHistory];

    // Filter by payment type
    if (filters.paymentType) {
      history = history.filter(t => t.paymentType === filters.paymentType);
    }

    // Filter by date range
    if (filters.startDate) {
      history = history.filter(t => new Date(t.paymentDate) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      history = history.filter(t => new Date(t.paymentDate) <= new Date(filters.endDate));
    }

    // Filter by status
    if (filters.status) {
      history = history.filter(t => t.paymentStatus === filters.status);
    }

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    return history;
  }

  /**
   * Get payment statistics
   */
  getPaymentStats() {
    const totalSpent = this.paymentHistory.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = this.paymentHistory.length;
    
    const statsByType = this.paymentHistory.reduce((acc, t) => {
      if (!acc[t.paymentType]) {
        acc[t.paymentType] = { count: 0, amount: 0 };
      }
      acc[t.paymentType].count++;
      acc[t.paymentType].amount += t.amount;
      return acc;
    }, {});

    return {
      totalSpent,
      totalTransactions,
      averageTransactionAmount: totalTransactions > 0 ? totalSpent / totalTransactions : 0,
      statsByType,
      lastPaymentDate: this.paymentHistory.length > 0 ? this.paymentHistory[0].paymentDate : null
    };
  }

  /**
   * Get CSV-compatible company data
   */
  getCSVData() {
    return {
      companyNumber: this.companyNumber || this.id,
      companyName: this.companyName,
      companyCR: this.crNumber,
      admin: this.adminDetails?.fullName,
      adminPhoneNumber: this.adminDetails?.phone,
      adminEmail: this.adminDetails?.email,
      industry: this.industry,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands || 0,
      numberOfBranches: this.numberOfBranches || 0,
      lastActiveDate: this.lastActiveDate,
      totalJobsPosted: this.totalJobsPosted,
      totalHires: this.totalHires,
      totalInterviews: this.totalInterviews,
      totalSpentOnHiring: this.totalSpentOnHiring,
      hasUsedFreeTrial: this.hasUsedFreeTrial,
      previousPlansPurchases: Array.isArray(this.previousPlansPurchases) ? this.previousPlansPurchases.join(', ') : this.previousPlansPurchases
    };
  }

  /**
   * Update company data from CSV
   */
  async updateFromCSV(csvData) {
    const updateData = {
      companyNumber: csvData.companyNumber || csvData['No.'],
      companyName: csvData.companyName || csvData['Company Name'],
      crNumber: csvData.companyCR || csvData['Company CR'],
      industry: csvData.industry || csvData['Industry'],
      roles: csvData.roles || csvData['Roles'],
      registrationDate: csvData.registrationDate || csvData['Registration Date'],
      numberOfBands: csvData.numberOfBands || csvData['No. of Bands / Business Entities'] ? parseInt(csvData.numberOfBands || csvData['No. of Bands / Business Entities']) : null,
      numberOfBranches: csvData.numberOfBranches || csvData['No. of Branches'] ? parseInt(csvData.numberOfBranches || csvData['No. of Branches']) : null,
      lastActiveDate: csvData.lastActiveDate || csvData['Last Active Date'],
      totalJobsPosted: parseInt(csvData.totalJobsPosted || csvData.numberOfJobPosts || csvData['Number of Job Posts']) || 0,
      totalHires: parseInt(csvData.totalHires || csvData.totalInstantHires || csvData['Total Instant Hires']) || 0,
      totalInterviews: parseInt(csvData.totalInterviews || csvData['Total Interviews']) || 0,
      totalSpentOnHiring: parseFloat(csvData.totalSpentOnHiring || csvData.spentOnHiring || csvData['Spent on Hiring']) || 0,
      hasUsedFreeTrial: csvData.hasUsedFreeTrial === 'true' || csvData.usedFreeTrial === 'true' || csvData['Used Free Trial?'] === 'true',
      previousPlansPurchases: csvData.previousPlansPurchases || csvData['Previous Plans Purchases']
    };

    // Update admin details if provided
    if (csvData.admin || csvData['Admin']) {
      updateData.adminDetails = {
        ...this.adminDetails,
        fullName: csvData.admin || csvData['Admin'],
        phone: csvData.adminPhoneNumber || csvData['Admin Phone Number'],
        email: csvData.adminEmail || csvData['Admin Email']
      };
    }

    return await this.update(updateData);
  }

  /**
   * Get company statistics for reporting
   */
  getCompanyStats() {
    return {
      // Basic company info
      companyNumber: this.companyNumber,
      companyName: this.companyName,
      crNumber: this.crNumber,
      industry: this.industry,
      
      // Admin information
      admin: this.adminDetails?.fullName,
      adminPhone: this.adminDetails?.phone,
      adminEmail: this.adminDetails?.email,
      
      // Business structure
      numberOfBands: this.numberOfBands || 0,
      numberOfBranches: this.numberOfBranches || 0,
      totalBusinessEntities: this.numberOfBands || 0,
      
      // Activity metrics
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      daysSinceRegistration: this.registrationDate ? Math.floor((new Date() - new Date(this.registrationDate)) / (1000 * 60 * 60 * 24)) : 0,
      daysSinceLastActive: this.lastActiveDate ? Math.floor((new Date() - new Date(this.lastActiveDate)) / (1000 * 60 * 60 * 24)) : 0,
      
      // Hiring metrics - use consolidated fields
      totalJobPosts: this.totalJobsPosted,
      totalInstantHires: this.totalHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.totalSpentOnHiring,
      
      // Subscription info
      usedFreeTrial: this.hasUsedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      currentSubscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.getSubscriptionStatus(),
      
      // Performance metrics
      hireSuccessRate: this.totalJobsPosted > 0 ? (this.totalHires / this.totalJobsPosted) * 100 : 0,
      averageCostPerHire: this.totalHires > 0 ? this.totalSpentOnHiring / this.totalHires : 0,
      interviewToHireRatio: this.totalHires > 0 ? this.totalInterviews / this.totalHires : 0
    };
  }

  /**
   * Get current pricing plans
   */
  getCurrentPricingPlans() {
    return {
      freeTrial: this.pricingDetails.freeTrial,
      payAsYouGo: this.pricingDetails.payAsYouGo,
      subscriptionPlans: this.pricingDetails.subscriptionPlans,
      customPlans: this.pricingDetails.customPlans
    };
  }

  /**
   * Get recommended plan based on usage
   */
  getRecommendedPlan() {
    const monthlyMatches = this.usageStats.instantMatches;
    const monthlyInterviews = this.usageStats.interviews;
    
    if (monthlyMatches <= 5 && monthlyInterviews <= 5) {
      return {
        recommended: 'payAsYouGo',
        reason: 'Low usage - Pay as you go is most cost-effective',
        estimatedMonthlyCost: (monthlyMatches * 5) + (monthlyInterviews * 5)
      };
    } else if (monthlyMatches <= 20 && monthlyInterviews <= 20) {
      return {
        recommended: 'starter',
        reason: 'Moderate usage - Starter bundle offers best value',
        estimatedMonthlyCost: 99 / 6, // 99 OMR for 6 months
        savings: '50% compared to pay-as-you-go'
      };
    } else {
      return {
        recommended: 'pro',
        reason: 'High usage - Pro bundle offers maximum savings',
        estimatedMonthlyCost: 200 / 12, // 200 OMR for 12 months
        savings: '60% compared to pay-as-you-go'
      };
    }
  }

  /**
   * Calculate trial end date
   */
  calculateTrialEndDate() {
    const trialStart = new Date(this.trialStartDate);
    const trialEnd = new Date(trialStart.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
    return trialEnd.toISOString();
  }

  /**
   * Get plan limits based on current subscription
   */
  getPlanLimits() {
    switch (this.subscriptionPlan) {
      case 'trial':
        return {
          instantMatches: 'unlimited',
          interviews: 'unlimited',
        locations: 1,
        jobPostings: 'unlimited',
          teamMembers: 1,
          analytics: 'basic',
        support: 'email'
        };
      case 'starter':
        return {
        instantMatches: 20,
        interviews: 20,
        locations: 1,
          jobPostings: 'unlimited',
          teamMembers: 3,
          analytics: 'basic',
          support: 'email'
        };
      case 'pro':
        return {
        instantMatches: 50,
        interviews: 50,
          locations: 1,
          jobPostings: 'unlimited',
          teamMembers: 10,
          analytics: 'advanced',
        support: 'priority'
        };
      case 'custom':
        return {
        instantMatches: 'unlimited',
        interviews: 'unlimited',
          locations: 'unlimited',
        jobPostings: 'unlimited',
          teamMembers: 'unlimited',
          analytics: 'enterprise',
        support: 'dedicated'
        };
      default:
        return {
          instantMatches: 0,
          interviews: 0,
          locations: 1,
          jobPostings: 0,
          teamMembers: 1,
          analytics: 'none',
          support: 'none'
        };
    }
  }

  /**
   * Get trial status
   */
  getTrialStatus() {
    const now = new Date();
    const trialEnd = new Date(this.trialEndDate);
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    
    return {
      isActive: !this.trialExpired && daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      startDate: this.trialStartDate,
      endDate: this.trialEndDate,
      expired: this.trialExpired || daysRemaining <= 0
    };
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus() {
    if (this.subscriptionPlan === 'trial') {
      const trialStatus = this.getTrialStatus();
      return trialStatus.isActive ? 'trial' : 'expired';
    }
    
    if (this.subscriptionPlan === 'payAsYouGo') {
      return 'active';
    }
    
    if (this.nextBillingDate) {
      const now = new Date();
      const billingDate = new Date(this.nextBillingDate);
      return billingDate > now ? 'active' : 'expired';
    }
    
    return 'inactive';
  }

  /**
   * Check if company can perform action based on plan limits
   */
  canPerformAction(action) {
    const limits = this.getPlanLimits();
    
    switch (action) {
      case 'instant_match':
        if (limits.instantMatches === 'unlimited') return true;
        return this.usageStats.instantMatches < limits.instantMatches;
      
      case 'interview':
        if (limits.interviews === 'unlimited') return true;
        return this.usageStats.interviews < limits.interviews;
      
      case 'add_location':
        if (limits.locations === 'unlimited') return true;
        return this.locations.length < limits.locations;
      
      case 'add_team_member':
        if (limits.teamMembers === 'unlimited') return true;
        return this.teamMembers.length < limits.teamMembers;
      
      case 'job_posting':
        if (limits.jobPostings === 'unlimited') return true;
        return this.totalJobsPosted < limits.jobPostings;
      
      default:
        return true;
    }
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletionPercentage() {
    const requiredFields = [
      'companyName',
      'crNumber',
      'adminDetails.fullName',
      'adminDetails.email',
      'adminDetails.phone',
      'industry'
    ];
    
    let completedFields = 0;
    requiredFields.forEach(field => {
      const value = this.getNestedValue(field);
      if (value && value.toString().trim() !== '') {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  /**
   * Get nested object value
   */
  getNestedValue(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this);
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

      const result = await databaseService.create(COLLECTIONS.COMPANIES, company.toJSON());
      const createdCompany = new Company({ id: result.id, ...result });

      // Calculate trial days remaining after creation
      await createdCompany.updateTrialStatus();

      return createdCompany;
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

    // Set both dates to start of day for accurate day calculation
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = new Date(trialStart.getFullYear(), trialStart.getMonth(), trialStart.getDate());

    const daysPassed = Math.floor((nowDay - startDay) / (1000 * 60 * 60 * 24));

    // On same day (daysPassed = 0), should show 14 days remaining
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

      // Set both dates to start of day for accurate day calculation
      const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDay = new Date(trialStart.getFullYear(), trialStart.getMonth(), trialStart.getDate());

      const daysPassed = Math.floor((nowDay - startDay) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 14 - daysPassed);

      const updateData = {
        trialExpired: daysRemaining === 0,
        updatedAt: new Date().toISOString()
      };

      // If trial expired, update subscription status unless they have active subscription
      if (daysRemaining === 0 && this.subscriptionStatus === 'trial') {
        updateData.subscriptionStatus = 'expired';
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
   * Create Thawani checkout session for payment
   */
  async createThawaniCheckoutSession(paymentData) {
    try {
      const thawaniConfig = {
        apiKey: process.env.THAWANI_SECRET_KEY,
        baseUrl: process.env.THAWANI_BASE_URL || 'https://uatcheckout.thawani.om/api/v1'
      };

      console.log('Thawani Config Check:', {
        hasApiKey: !!thawaniConfig.apiKey,
        apiKeyLength: thawaniConfig.apiKey?.length,
        baseUrl: thawaniConfig.baseUrl
      });

      if (!thawaniConfig.apiKey) {
        throw new Error('Thawani API key not configured. Please set THAWANI_SECRET in environment variables.');
      }

      const sessionData = {
        client_reference_id: `${this.id}_${Date.now()}`,
        mode: 'payment',
        products: [
          {
            name: paymentData.planName || 'Shift App Plan',
            quantity: 1,
            unit_amount: Math.round(paymentData.amount * 1000) // Thawani expects amount in baisa (1000 baisa = 1 OMR)
          }
        ],
        success_url: paymentData.success_url || `${process.env.BACKEND_URL || 'https://62ff4cd87704.ngrok-free.app'}/api/payment/success-redirect?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: paymentData.cancel_url || `${process.env.BACKEND_URL || 'https://62ff4cd87704.ngrok-free.app'}/api/payment/cancel-redirect`,
        metadata: {
          'Customer name': this.companyName,
          'order id': `${this.id}_${Date.now()}`,
          company_id: this.id,
          company_name: this.companyName,
          plan_type: paymentData.planType,
          plan_name: paymentData.planName,
          amount_omr: paymentData.amount,
          user_id: this.userId,
          session_id_placeholder: 'will_be_replaced_after_creation'
        }
      };

      console.log('Thawani API Request:', {
        url: `${thawaniConfig.baseUrl}/checkout/session`,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'thawani-secret-key': thawaniConfig.apiKey
        },
        body: sessionData
      });

      const response = await fetch(`${thawaniConfig.baseUrl}/checkout/session`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'thawani-api-key': thawaniConfig.apiKey
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Thawani API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Handle specific error cases
        if (response.status === 403) {
          if (errorText.includes('Cloudflare')) {
            throw new Error('Thawani API access blocked. Please verify API key and IP whitelist with Thawani support.');
          } else {
            throw new Error('Thawani API authentication failed. Please verify API key and account status.');
          }
        }
        
        throw new Error(`Thawani API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('Thawani API Response:', result);

      if (result.success && result.data) {
        // Save pending payment to database
        const pendingPayment = {
          sessionId: result.data.session_id,
          clientReferenceId: result.data.client_reference_id,
          planType: paymentData.planType,
          planName: paymentData.planName,
          amount: paymentData.amount,
          currency: 'OMR',
          status: 'pending',
          thawaniSessionData: result.data,
          createdAt: new Date().toISOString()
        };

        // Add to pending payments array
        if (!this.pendingPayments) {
          this.pendingPayments = [];
        }
        this.pendingPayments.push(pendingPayment);

        await this.update({ pendingPayments: this.pendingPayments });

        const publishableKey = process.env.THAWANI_PUBLISHABLE || process.env.THAWANI_PUBLISHABLE_KEY;
        const checkoutUrl = publishableKey
          ? `${thawaniConfig.baseUrl.replace('/api/v1', '')}/pay/${result.data.session_id}?key=${publishableKey}`
          : `${thawaniConfig.baseUrl.replace('/api/v1', '')}/pay/${result.data.session_id}`;

        return {
          success: true,
          sessionId: result.data.session_id,
          checkoutUrl: checkoutUrl,
          pendingPayment
        };
      } else {
        throw new Error(result.description || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating Thawani checkout session:', error);
      throw error;
    }
  }

  /**
   * Process successful payment from Thawani webhook
   */
  async processSuccessfulPayment(sessionId, paymentData) {
    try {
      // Find the pending payment
      const pendingPayment = this.pendingPayments?.find(p => p.sessionId === sessionId);
      if (!pendingPayment) {
        throw new Error('Pending payment not found');
      }

      // Create completed transaction
      const transaction = {
        id: `txn_${Date.now()}`,
        type: pendingPayment.planType,
        planName: pendingPayment.planName,
        amount: pendingPayment.amount,
        currency: 'OMR',
        thawaniSessionId: sessionId,
        status: 'completed',
        paymentDate: new Date().toISOString(),
        metadata: paymentData
      };

      // Update company based on plan type
      let updateData = {
        paymentHistory: [...this.paymentHistory, transaction],
        updatedAt: new Date().toISOString()
      };

      switch (pendingPayment.planType) {
        case 'pay_as_you_go':
          // Add credits for pay as you go
          updateData.usageStats = {
            ...this.usageStats,
            instantMatches: this.usageStats.instantMatches + Math.floor(pendingPayment.amount / 5)
          };
          break;

        case 'subscription_starter':
          // Activate starter subscription
          updateData.subscriptionPlan = 'starter';
          updateData.subscriptionStatus = 'active';
          updateData.nextBillingDate = new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)).toISOString(); // 6 months
          updateData.planLimits = this.getPlanLimits();
          break;

        case 'subscription_pro':
          // Activate pro subscription
          updateData.subscriptionPlan = 'pro';
          updateData.subscriptionStatus = 'active';
          updateData.nextBillingDate = new Date(Date.now() + (12 * 30 * 24 * 60 * 60 * 1000)).toISOString(); // 12 months
          updateData.planLimits = this.getPlanLimits();
          break;
      }

      // Remove from pending payments
      const updatedPendingPayments = this.pendingPayments.filter(p => p.sessionId !== sessionId);
      updateData.pendingPayments = updatedPendingPayments;

      await this.update(updateData);

      // Send payment successful notification
      try {
        const paymentData = {
          companyId: this.id,
          companyEmail: this.companyEmail,
          companyName: this.companyName,
          amount: transaction.amount.toString(),
          currency: transaction.currency,
          planName: transaction.planName,
          adminEmails: [this.companyEmail]
        };
        
        await notificationController.sendPaymentSuccessful(paymentData);
        console.log('✅ Payment successful notification sent');
      } catch (notificationError) {
        console.error('⚠️  Failed to send payment notification:', notificationError);
      }

      return {
        success: true,
        transaction,
        updatedPlan: updateData.subscriptionPlan || 'pay_as_you_go'
      };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  /**
   * Check if plan has expired and needs upgrade
   */
  checkPlanExpiration() {
    const now = new Date();
    
    if (this.subscriptionPlan === 'trial') {
      const trialEnd = new Date(this.trialEndDate);
      return {
        expired: trialEnd < now,
        daysRemaining: Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))),
        needsUpgrade: trialEnd < now
      };
    }

    if (this.subscriptionPlan === 'pay_as_you_go') {
      // Check if they have credits remaining
      const hasCredits = this.usageStats.instantMatches > 0 || this.usageStats.interviews > 0;
      return {
        expired: !hasCredits,
        daysRemaining: 0,
        needsUpgrade: !hasCredits
      };
    }

    if (this.nextBillingDate) {
      const billingDate = new Date(this.nextBillingDate);
      const daysUntilBilling = Math.ceil((billingDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        expired: billingDate < now,
        daysRemaining: Math.max(0, daysUntilBilling),
        needsUpgrade: billingDate < now
      };
    }

    return {
      expired: false,
      daysRemaining: 0,
      needsUpgrade: false
    };
  }

  /**
   * ADMIN METHODS: CR Verification
   */
  async verifyCR() {
    try {
      const updateData = {
        crVerificationStatus: 'verified',
        crVerifiedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString()
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error contacting admin:', error);
      throw error;
    }
  }

  /**
   * Block a job seeker
   */
  async blockSeeker(seekerId, reason = 'No reason provided', blockedBy = null) {
    try {
      // Check if seeker is already blocked
      const existingBlock = this.blockedSeekers.find(block => 
        block.seekerId === seekerId && block.isActive
      );
      if (existingBlock) {
        throw new Error('Seeker is already blocked');
      }

      const blockEntry = {
        seekerId: seekerId,
        reason: reason,
        blockedAt: new Date().toISOString(),
        blockedBy: blockedBy, // Admin/HR person who blocked
        isActive: true
      };

      this.blockedSeekers.push(blockEntry);

      await this.update({
        blockedSeekers: this.blockedSeekers,
        updatedAt: new Date().toISOString()
      });

      // Update seeker's record
      try {
        const Seeker = require('./Seeker');
        const seeker = await Seeker.findById(seekerId);
        if (seeker) {
          await seeker.recordBlockedByCompany(
            this.id, 
            this.companyName, 
            reason, 
            blockEntry.blockedAt
          );
        }
      } catch (seekerError) {
        console.error('Error updating seeker blocked record:', seekerError);
        // Don't throw - company block was successful
      }

      console.log(`🚫 Seeker ${seekerId} blocked by company ${this.id} - Reason: ${reason}`);
      return this;
    } catch (error) {
      console.error('Error blocking seeker:', error);
      throw error;
    }
  }

  /**
   * Unblock a job seeker
   */
  async unblockSeeker(seekerId, unblockReason = 'Block removed', unblockedBy = null) {
    try {
      const blockIndex = this.blockedSeekers.findIndex(block => 
        block.seekerId === seekerId && block.isActive
      );

      if (blockIndex === -1) {
        throw new Error('Seeker is not blocked or block not found');
      }

      const unblockedAt = new Date().toISOString();

      // Mark as inactive rather than removing (for audit trail)
      this.blockedSeekers[blockIndex].isActive = false;
      this.blockedSeekers[blockIndex].unblockedAt = unblockedAt;
      this.blockedSeekers[blockIndex].unblockReason = unblockReason;
      this.blockedSeekers[blockIndex].unblockedBy = unblockedBy;

      await this.update({
        blockedSeekers: this.blockedSeekers,
        updatedAt: new Date().toISOString()
      });

      // Update seeker's record
      try {
        const Seeker = require('./Seeker');
        const seeker = await Seeker.findById(seekerId);
        if (seeker) {
          await seeker.recordUnblockedByCompany(
            this.id, 
            unblockReason, 
            unblockedAt
          );
        }
      } catch (seekerError) {
        console.error('Error updating seeker unblock record:', seekerError);
        // Don't throw - company unblock was successful
      }

      console.log(`✅ Seeker ${seekerId} unblocked by company ${this.id}`);
      return this;
    } catch (error) {
      console.error('Error unblocking seeker:', error);
      throw error;
    }
  }

  /**
   * Check if a seeker is blocked
   */
  isSeekerBlocked(seekerId) {
    return this.blockedSeekers.some(block => 
      block.seekerId === seekerId && block.isActive
    );
  }

  /**
   * Get blocked seekers list
   */
  getBlockedSeekers(activeOnly = true) {
    if (activeOnly) {
      return this.blockedSeekers.filter(block => block.isActive);
    }
    return this.blockedSeekers;
  }

  /**
   * Get block details for a specific seeker
   */
  getBlockDetails(seekerId) {
    return this.blockedSeekers.find(block => 
      block.seekerId === seekerId && block.isActive
    );
  }

  /**
   * Get blocking statistics
   */
  getBlockingStats() {
    const activeBlocks = this.blockedSeekers.filter(block => block.isActive);
    const totalBlocks = this.blockedSeekers.length;
    const removedBlocks = this.blockedSeekers.filter(block => !block.isActive);

    // Group by reason
    const reasonStats = {};
    activeBlocks.forEach(block => {
      const reason = block.reason || 'No reason provided';
      reasonStats[reason] = (reasonStats[reason] || 0) + 1;
    });

    return {
      totalActiveBlocks: activeBlocks.length,
      totalHistoricalBlocks: totalBlocks,
      removedBlocks: removedBlocks.length,
      reasonBreakdown: reasonStats,
      blockingEnabled: this.blockingEnabled
    };
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
        numberOfBands: updatedBrands.length, // Auto-update count
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
      const maxLoc = this.maxLocations || 1;
      if (this.locations.length >= maxLoc) {
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
        numberOfBranches: updatedLocations.length, // Auto-update count
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding location:', error);
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
        trialStartDate: new Date().toISOString(), // Set trial start date
        primaryIndustry: onboardingData.selectedIndustries[0] || null,
        secondaryIndustries: onboardingData.selectedIndustries.slice(1) || [],
        typicalHiringRoles: onboardingData.typicalHiringRoles || onboardingData.selectedRoles,
        hiringFrequency: onboardingData.hiringNeeds || 'as-needed',
        ...companyData
      };

      const company = new Company(profileData);
      const result = await databaseService.create(COLLECTIONS.COMPANIES, company.toJSON());
      const createdCompany = new Company({ id: result.id, ...result });

      // Calculate trial days remaining after creation
      await createdCompany.updateTrialStatus();

      return createdCompany;
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
        { field: 'crNumber', operator: '==', value: crNumber }
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

      // Map contact fields to adminDetails if they're provided
      const processedUpdateData = { ...updateData };

      if (updateData.contactPerson || updateData.contactEmail || updateData.contactPhone || updateData.contactRole ||
          updateData.adminName || updateData.adminEmail || updateData.adminPhone || updateData.adminRole) {
        processedUpdateData.adminDetails = {
          ...this.adminDetails,
          fullName: updateData.contactPerson || updateData.adminName || this.adminDetails?.fullName,
          email: updateData.contactEmail || updateData.adminEmail || this.adminDetails?.email,
          phone: updateData.contactPhone || updateData.adminPhone || this.adminDetails?.phone,
          role: updateData.contactRole || updateData.adminRole || this.adminDetails?.role,
          position: updateData.contactRole || updateData.adminRole || this.adminDetails?.position
        };
      }

      // Auto-sync counts when brands or locations are updated
      if (updateData.brands && Array.isArray(updateData.brands)) {
        processedUpdateData.numberOfBands = updateData.brands.length;
      }
      if (updateData.locations && Array.isArray(updateData.locations)) {
        processedUpdateData.numberOfBranches = updateData.locations.length;
      }

      const updatedCompany = await databaseService.update(COLLECTIONS.COMPANIES, this.id, processedUpdateData);
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
   * Get all companies (for brand recommendations)
   */
  static async getAll(limit = 100) {
    try {
      // Get all companies without filters for brand recommendations
      const companies = await databaseService.query(
        COLLECTIONS.COMPANIES,
        [], // No filters - get all companies
        { field: 'updatedAt', direction: 'desc' },
        limit
      );

      return companies.map(companyData => new Company(companyData));
    } catch (error) {
      console.error('Error getting all companies:', error);
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
   * Increment job count for specific brand
   */
  async incrementBrandJobCount(brandLocationId, isActive = true) {
    try {
      // Find the location and its associated brand
      const location = this.locations.find(loc => loc.id === brandLocationId);
      if (!location || !location.brand) {
        console.log('Location or brand not found for brandLocationId:', brandLocationId);
        return await this.incrementJobCount(); // Fallback to company-level increment
      }

      // Find the brand in the brands array
      const brandIndex = this.brands.findIndex(brand => brand.name === location.brand);
      if (brandIndex === -1) {
        console.log('Brand not found in brands array:', location.brand);
        return await this.incrementJobCount(); // Fallback to company-level increment
      }

      // Update the brand's job counts
      const updatedBrands = [...this.brands];
      updatedBrands[brandIndex] = {
        ...updatedBrands[brandIndex],
        totalJobs: (updatedBrands[brandIndex].totalJobs || 0) + 1,
        activeJobs: isActive ? (updatedBrands[brandIndex].activeJobs || 0) + 1 : (updatedBrands[brandIndex].activeJobs || 0)
      };

      // Update both brand-level and company-level counters
      return await this.update({
        brands: updatedBrands,
        totalJobsPosted: this.totalJobsPosted + 1,
        activeJobs: isActive ? this.activeJobs + 1 : this.activeJobs
      });
    } catch (error) {
      console.error('Error incrementing brand job count:', error);
      throw error;
    }
  }

  /**
   * Decrement active job count for specific brand (when job is closed/filled)
   */
  async decrementBrandActiveJobCount(brandLocationId) {
    try {
      // Find the location and its associated brand
      const location = this.locations.find(loc => loc.id === brandLocationId);
      if (!location || !location.brand) {
        console.log('Location or brand not found for brandLocationId:', brandLocationId);
        return await this.update({ activeJobs: Math.max(0, this.activeJobs - 1) });
      }

      // Find the brand in the brands array
      const brandIndex = this.brands.findIndex(brand => brand.name === location.brand);
      if (brandIndex === -1) {
        console.log('Brand not found in brands array:', location.brand);
        return await this.update({ activeJobs: Math.max(0, this.activeJobs - 1) });
      }

      // Update the brand's active job count
      const updatedBrands = [...this.brands];
      updatedBrands[brandIndex] = {
        ...updatedBrands[brandIndex],
        activeJobs: Math.max(0, (updatedBrands[brandIndex].activeJobs || 0) - 1)
      };

      // Update both brand-level and company-level counters
      return await this.update({
        brands: updatedBrands,
        activeJobs: Math.max(0, this.activeJobs - 1)
      });
    } catch (error) {
      console.error('Error decrementing brand active job count:', error);
      throw error;
    }
  }

  /**
   * Update company rating
   */
  async updateRating(newRating) {
    try {
      const totalReviews = this.totalReviews + 1;

      return await this.update({
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
      'companyName', 'crNumber', 'primaryIndustry',
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
   * Convert to JSON for database storage (Complete with all enhancements)
   */
  toJSON() {
    return {
      userId: this.userId,
      
      // Company Information & Admin (CSV-compatible)
      companyName: this.companyName,
      crNumber: this.crNumber,
      companyNumber: this.companyNumber,
      companyType: this.companyType,
      geographicalPresence: this.geographicalPresence,
      adminDetails: this.adminDetails,
      
      // Consolidated fields
      industry: this.industry,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands || 0,
      numberOfBranches: this.numberOfBranches || 0,
      lastActiveDate: this.lastActiveDate,
      totalJobsPosted: this.totalJobsPosted,
      totalHires: this.totalHires,
      totalInterviews: this.totalInterviews,
      totalSpentOnHiring: this.totalSpentOnHiring,
      hasUsedFreeTrial: this.hasUsedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      
      // Business Details
      brands: this.brands,
      primaryBrand: this.primaryBrand,
      locations: this.locations,
      teamMembers: this.teamMembers,
      maxLocations: this.maxLocations || 1,
      
      // Subscription & Payment with Enhanced Pricing
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      pricingDetails: this.pricingDetails,
      trialStartDate: this.trialStartDate,
      trialEndDate: this.trialEndDate,
      trialExpired: this.trialExpired,
      paymentMethods: this.paymentMethods,
      defaultPaymentMethod: this.defaultPaymentMethod,
      paymentHistory: this.paymentHistory,
      pendingPayments: this.pendingPayments,
      nextBillingDate: this.nextBillingDate,
      billingCycle: this.billingCycle,
      
      // Banking & Wallet
      withdrawalSettings: this.withdrawalSettings,
      creditBalance: this.creditBalance,
      walletHistory: this.walletHistory,
      pendingCredits: this.pendingCredits,
      
      // Blocking System
      blockedSeekers: this.blockedSeekers,
      blockingEnabled: this.blockingEnabled,
      
      // Usage & Limits with Analytics
      usageStats: this.usageStats,
      planLimits: this.planLimits,
      
      // Performance Dashboard & Health Score
      healthScore: this.healthScore,
      
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
      
      // System Fields
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      
      // Performance Metrics - use consolidated fields
      totalJobsPosted: this.totalJobsPosted,
      activeJobs: this.activeJobs,
      totalHires: this.totalHires,
      totalReviews: this.totalReviews,
      
      // Metadata
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to public JSON (safe for API responses with comprehensive data)
   */
  toPublicJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Basic company info (CSV-compatible)
      companyName: this.companyName,
      companyNumber: this.companyNumber,
      crNumber: this.crNumber,
      companyType: this.companyType,
      geographicalPresence: this.geographicalPresence,
      
      // Admin information
      adminDetails: {
        fullName: this.adminDetails?.fullName,
        phone: this.adminDetails?.phone,
        email: this.adminDetails?.email,
        role: this.adminDetails?.role
      },
      
      // Contact fields for API compatibility
      contactPerson: this.adminDetails?.fullName,
      contactPhone: this.adminDetails?.phone,
      contactEmail: this.adminDetails?.email,
      contactRole: this.adminDetails?.role,
      
      // Business structure
      numberOfBands: this.numberOfBands || 0,
      numberOfBranches: this.numberOfBranches || 0,
      
      // Activity metrics
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      
      // Hiring metrics
      numberOfJobPosts: this.numberOfJobPosts,
      totalInstantHires: this.totalInstantHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.spentOnHiring,
      
      // Subscription info
      usedFreeTrial: this.hasUsedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      // Brands and branding
      brands: this.brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        logo: brand.logo,
        industry: brand.industry,
        role: brand.role,
        skills: brand.skills,
        totalJobs: brand.totalJobs || 0,
        activeJobs: brand.activeJobs || 0,
        addedAt: brand.addedAt
      })),
      primaryBrand: this.primaryBrand,
      
      // Business locations and team
      locations: this.locations,
      teamMembers: this.teamMembers,
      maxLocations: this.maxLocations || 1,
      
      // Industry & Organization Info
      
      // Subscription info with pricing details
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.getSubscriptionStatus(),
      trialExpired: this.trialExpired,
      trialStatus: this.getTrialStatus(),
      planLimits: this.getPlanLimits(),
      
      // Usage Statistics (Safe subset)
      usageStats: {
        instantMatches: this.usageStats.instantMatches,
        interviews: this.usageStats.interviews,
        jobPostings: this.usageStats.jobPostings,
        conversionRates: this.usageStats.conversionRates
      },
      
      
      // Health Score (Public view)
      healthScore: {
        overall: this.healthScore,
        categories: {
          candidateExperience: 0 // Placeholder, needs actual implementation
        }
      },
      
      // Verification status
      isVerified: this.isVerified,
      crVerificationStatus: this.crVerificationStatus,
      
      // Profile completion
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      profileCompletionPercentage: this.calculateCompletionPercentage(),
      
      // System status
      isActive: this.isActive,
      
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to detailed JSON for admin/management (Comprehensive)
   */
  toDetailedJSON() {
    return {
      id: this.id,
      userId: this.userId,
      
      // Complete company information (CSV-compatible)
      companyName: this.companyName,
      companyNumber: this.companyNumber,
      crNumber: this.crNumber,
      companyType: this.companyType,
      geographicalPresence: this.geographicalPresence,
      adminDetails: this.adminDetails,
      
      // Consolidated fields
      industry: this.industry,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands || 0,
      numberOfBranches: this.numberOfBranches || 0,
      lastActiveDate: this.lastActiveDate,
      totalJobsPosted: this.totalJobsPosted,
      totalHires: this.totalHires,
      totalInterviews: this.totalInterviews,
      totalSpentOnHiring: this.totalSpentOnHiring,
      hasUsedFreeTrial: this.hasUsedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      // Business structure
      brands: this.brands,
      locations: this.locations,
      teamMembers: this.teamMembers,
      
      
      // Complete subscription details with pricing model
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      pricingDetails: this.pricingDetails,
      trialStartAt: this.trialStartAt,
      trialEndDate: this.trialEndDate,
      trialExpired: this.trialExpired,
      paymentMethods: this.paymentMethods,
      paymentHistory: this.paymentHistory.slice(-10), // Last 10 transactions
      nextBillingDate: this.nextBillingDate,
      
      // Financial details
      creditBalance: this.creditBalance,
      pendingCredits: this.pendingCredits,
      usageStats: this.usageStats,
      planLimits: this.planLimits,
      
      // Performance Dashboard
      healthScore: this.healthScore,
      
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
      
      // System information
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      
      // All metrics
      totalJobsPosted: this.totalJobsPosted,
      activeJobs: this.activeJobs,
      totalHires: this.totalHires,
      successfulMatches: this.successfulMatches,
      totalReviews: this.totalReviews,
      
      // Real-time trial status
      trialStatus: this.getTrialStatus(),
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Company;