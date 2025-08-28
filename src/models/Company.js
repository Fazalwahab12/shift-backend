const { databaseService, COLLECTIONS } = require('../config/database');

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
    
    this.adminDetails = data.adminDetails || {
      fullName: null, 
      role: null,
      phone: null, 
      email: null, 
      position: null,
      
    };
    
    this.companyNumber = data.companyNumber || null; 
    this.industry = data.industry || null; 
    this.roles = data.roles || []; 
    this.registrationDate = data.registrationDate || new Date().toISOString(); 
    this.numberOfBands = data.numberOfBands || 1; 
    this.numberOfBranches = data.numberOfBranches || 1;
    this.lastActiveDate = data.lastActiveDate || null;
    this.numberOfJobPosts = data.numberOfJobPosts || 0; 
    this.totalInstantHires = data.totalInstantHires || 0;
    this.totalInterviews = data.totalInterviews || 0;
    this.spentOnHiring = data.spentOnHiring || 0; 
    this.usedFreeTrial = data.usedFreeTrial || false; 
    this.previousPlansPurchases = data.previousPlansPurchases || [];
    
    this.companyAnalytics = data.companyAnalytics || {
     
      totalJobPosts: this.numberOfJobPosts || 0,
      totalInstantHires: this.totalInstantHires || 0,
      totalInterviews: this.totalInterviews || 0,
      totalSpentOnHiring: this.spentOnHiring || 0, // OMR
      hasUsedFreeTrial: this.usedFreeTrial || false,
      previousPlanPurchases: this.previousPlansPurchases || [],
      lastActiveDate: this.lastActiveDate || null,
      registrationDate: this.registrationDate || new Date().toISOString(),
      
      // Enhanced performance metrics
      performanceMetrics: {
        hireSuccessRate: 0,
        averageTimeToHire: 0,
        interviewToHireRatio: 0,
        candidateQualityScore: 0,
        costPerHire: 0,
        timeToFill: 0,
        retentionRate: 0
      },
      
      // Business structure metrics
      businessStructure: {
        numberOfBands: this.numberOfBands || 1,
        numberOfBranches: this.numberOfBranches || 1,
        totalBusinessEntities: this.numberOfBands || 1,
        operationalScale: 'local'
      },
      
      // Hiring efficiency metrics
      hiringEfficiency: {
        jobsPostedThisMonth: 0,
        interviewsConductedThisMonth: 0,
        hiresThisMonth: 0,
        averageResponseTime: 0,
        candidateSatisfactionScore: 0
      }
    };
    
    // Industry Classification 
    this.industryDetails = data.industryDetails || {
      primaryIndustry: this.industry || null, 
      secondaryIndustries: [],
      industrySize: null,
      businessType: null,
      specializations: [],
      certifications: [],
      roles: this.roles || [], 
      industryCategory: null,
      subIndustry: null
    };
    
    // Company Structure & Scale 
    this.organizationStructure = data.organizationStructure || {
      numberOfBands: this.numberOfBands || 1, 
      numberOfBranches: this.numberOfBranches || 1, 
      totalEmployees: null,
      departmentCount: 0,
      hierarchyLevels: 1,
      operationalScale: 'local',
      businessEntities: this.numberOfBands || 1,
      totalLocations: this.numberOfBranches || 1
    };
    
    // STEP 2: Business Entity / Brand Details
    this.brands = data.brands || [];
    this.primaryBrand = data.primaryBrand || null;
    
    // Enhanced Brand Portfolio Management
    this.brandPortfolio = data.brandPortfolio || {
      totalBrands: 0,
      activeBrands: 0,
      brandCategories: [],
      brandPerformance: {},
      marketPresence: {
        localMarkets: [],
        regionalMarkets: [],
        internationalMarkets: []
      },
      brandAssets: {
        logos: {},
        trademarks: [],
        copyrights: [],
        patents: []
      }
    };
    
    // STEP 3: Business Location & Team
    this.locations = data.locations || [];
    this.teamMembers = data.teamMembers || [];
    this.maxLocations = data.maxLocations || 1;
    
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
    
    // 14-DAY TRIAL SYSTEM
    this.trialStartDate = data.trialStartDate || new Date().toISOString();
    this.trialEndDate = data.trialEndDate || this.calculateTrialEndDate();
    this.trialDaysRemaining = data.trialDaysRemaining || 14;
    this.trialExpired = data.trialExpired || false;
    
    // ENHANCED PAYMENT INTEGRATION 
    this.paymentMethods = data.paymentMethods || [];
    this.defaultPaymentMethod = data.defaultPaymentMethod || null;
    
    // Payment History 
    this.paymentHistory = data.paymentHistory || []; 
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
    
    // OMAN BANK API INTEGRATION
    this.bankDetails = data.bankDetails || {
      bankName: null,
      accountNumber: null,
      iban: null,
      swiftCode: null,
      isVerified: false
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
    
    // Advanced Usage Analytics
    this.analyticsData = data.analyticsData || {
      hiringFunnel: {
        jobPostings: 0,
        applications: 0,
        screenings: 0,
        interviews: 0,
        offers: 0,
        hires: 0
      },
      timeToHire: {
        average: 0,
        median: 0,
        fastest: null,
        slowest: null
      },
      costAnalysis: {
        averageCostPerHire: 0,
        totalHiringCost: 0,
        costPerChannel: {},
        budgetUtilization: 0
      },
      candidateQuality: {
        averageScore: 0,
        retentionRate: 0,
        performanceRating: 0
      }
    };
    
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
    this.isVerified = data.isVerified || false;
    
    // PROFILE MANAGEMENT
    this.profileCompletionStep = data.profileCompletionStep || 1;
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
    
    // Comprehensive Performance Dashboard
    this.performanceDashboard = data.performanceDashboard || {
      kpis: {
        monthlyHires: 0,
        quarterlyHires: 0,
        yearlyHires: 0,
        hiringVelocity: 0,
        candidateQualityIndex: 0,
        employerBrandScore: 0
      },
      trends: {
        hiringTrend: 'stable',
        seasonalPatterns: {},
        industryComparison: {},
        competitorAnalysis: {}
      },
      predictions: {
        nextMonthHiring: 0,
        budgetForecasting: 0,
        trendPredictions: {},
        recommendations: []
      },
      benchmarks: {
        industryAverage: {},
        topPerformers: {},
        improvementAreas: [],
        strengthAreas: []
      }
    };
    
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
      
      // Update company analytics
      this.companyAnalytics.totalSpentOnHiring += transaction.amount;
      this.companyAnalytics.lastActiveDate = new Date().toISOString();
      
      // Update usage based on payment type
      await this.updateUsageFromPayment(transaction);
      
      await this.update({
        paymentHistory: this.paymentHistory,
        companyAnalytics: this.companyAnalytics
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
      industry: this.industry || this.industryDetails?.primaryIndustry,
      roles: Array.isArray(this.roles) ? this.roles.join(', ') : this.roles,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands,
      numberOfBranches: this.numberOfBranches,
      lastActiveDate: this.lastActiveDate || this.companyAnalytics?.lastActiveDate,
      numberOfJobPosts: this.numberOfJobPosts || this.totalJobsPosted,
      totalInstantHires: this.totalInstantHires || this.successfulMatches,
      totalInterviews: this.totalInterviews || this.companyAnalytics?.totalInterviews,
      spentOnHiring: this.spentOnHiring || this.companyAnalytics?.totalSpentOnHiring,
      usedFreeTrial: this.usedFreeTrial || this.companyAnalytics?.hasUsedFreeTrial,
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
      numberOfBands: parseInt(csvData.numberOfBands || csvData['No. of Bands / Business Entities']) || 1,
      numberOfBranches: parseInt(csvData.numberOfBranches || csvData['No. of Branches']) || 1,
      lastActiveDate: csvData.lastActiveDate || csvData['Last Active Date'],
      numberOfJobPosts: parseInt(csvData.numberOfJobPosts || csvData['Number of Job Posts']) || 0,
      totalInstantHires: parseInt(csvData.totalInstantHires || csvData['Total Instant Hires']) || 0,
      totalInterviews: parseInt(csvData.totalInterviews || csvData['Total Interviews']) || 0,
      spentOnHiring: parseFloat(csvData.spentOnHiring || csvData['Spent on Hiring']) || 0,
      usedFreeTrial: csvData.usedFreeTrial === 'true' || csvData['Used Free Trial?'] === 'true',
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
      numberOfBands: this.numberOfBands,
      numberOfBranches: this.numberOfBranches,
      totalBusinessEntities: this.numberOfBands,
      
      // Activity metrics
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      daysSinceRegistration: this.registrationDate ? Math.floor((new Date() - new Date(this.registrationDate)) / (1000 * 60 * 60 * 24)) : 0,
      daysSinceLastActive: this.lastActiveDate ? Math.floor((new Date() - new Date(this.lastActiveDate)) / (1000 * 60 * 60 * 24)) : 0,
      
      // Hiring metrics
      totalJobPosts: this.numberOfJobPosts,
      totalInstantHires: this.totalInstantHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.spentOnHiring,
      
      // Subscription info
      usedFreeTrial: this.usedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      currentSubscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.getSubscriptionStatus(),
      
      // Performance metrics
      hireSuccessRate: this.totalJobPosts > 0 ? (this.totalInstantHires / this.totalJobPosts) * 100 : 0,
      averageCostPerHire: this.totalInstantHires > 0 ? this.spentOnHiring / this.totalInstantHires : 0,
      interviewToHireRatio: this.totalInstantHires > 0 ? this.totalInterviews / this.totalInstantHires : 0
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
      'industryDetails.primaryIndustry'
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
      adminDetails: this.adminDetails,
      
      // CSV-specific fields
      industry: this.industry,
      roles: this.roles,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands,
      numberOfBranches: this.numberOfBranches,
      lastActiveDate: this.lastActiveDate,
      numberOfJobPosts: this.numberOfJobPosts,
      totalInstantHires: this.totalInstantHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.spentOnHiring,
      usedFreeTrial: this.usedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      // Enhanced Analytics & Structure
      companyAnalytics: this.companyAnalytics,
      industryDetails: this.industryDetails,
      organizationStructure: this.organizationStructure,
      
      // Business Details
      brands: this.brands,
      primaryBrand: this.primaryBrand,
      brandPortfolio: this.brandPortfolio,
      locations: this.locations,
      teamMembers: this.teamMembers,
      maxLocations: this.maxLocations,
      
      // Subscription & Payment with Enhanced Pricing
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      pricingDetails: this.pricingDetails,
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
      
      // Usage & Limits with Analytics
      usageStats: this.usageStats,
      planLimits: this.planLimits,
      analyticsData: this.analyticsData,
      
      // Performance Dashboard & Health Score
      performanceDashboard: this.performanceDashboard,
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
      
      // Admin information
      adminDetails: {
        fullName: this.adminDetails?.fullName,
        phone: this.adminDetails?.phone,
        email: this.adminDetails?.email,
        role: this.adminDetails?.role
      },
      
      // Business structure
      numberOfBands: this.numberOfBands,
      numberOfBranches: this.numberOfBranches,
      
      // Activity metrics
      registrationDate: this.registrationDate,
      lastActiveDate: this.lastActiveDate,
      
      // Hiring metrics
      numberOfJobPosts: this.numberOfJobPosts,
      totalInstantHires: this.totalInstantHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.spentOnHiring,
      
      // Subscription info
      usedFreeTrial: this.usedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      // Brands and branding
      brands: this.brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        logo: brand.logo,
        industry: brand.industry
      })),
      primaryBrand: this.primaryBrand,
      
      // Industry & Organization Info
      industryDetails: {
        primaryIndustry: this.industryDetails.primaryIndustry,
        businessType: this.industryDetails.businessType,
        industrySize: this.industryDetails.industrySize
      },
      organizationStructure: {
        numberOfBands: this.organizationStructure.numberOfBands,
        numberOfBranches: this.organizationStructure.numberOfBranches,
        operationalScale: this.organizationStructure.operationalScale
      },
      
      // Subscription info with pricing details
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.getSubscriptionStatus(),
      trialDaysRemaining: this.trialDaysRemaining,
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
      
      // Performance Dashboard (Public metrics)
      performanceMetrics: {
        totalJobsPosted: this.totalJobsPosted,
        averageRating: this.averageRating,
        totalReviews: this.totalReviews,
        hiringVelocity: this.performanceDashboard.kpis.hiringVelocity,
        employerBrandScore: this.performanceDashboard.kpis.employerBrandScore
      },
      
      // Health Score (Public view)
      healthScore: {
        overall: this.healthScore,
        categories: {
          hiringEfficiency: 0, // Placeholder, needs actual implementation
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
      isSuspended: this.isSuspended,
      
      // Company Analytics (Public safe)
      companyAnalytics: {
        registrationDate: this.companyAnalytics.registrationDate,
        hasUsedFreeTrial: this.companyAnalytics.hasUsedFreeTrial,
        performanceMetrics: {
          hireSuccessRate: this.companyAnalytics.performanceMetrics.hireSuccessRate,
          candidateQualityScore: this.companyAnalytics.performanceMetrics.candidateQualityScore
        }
      },
      
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
      adminDetails: this.adminDetails,
      
      // CSV-specific fields
      industry: this.industry,
      roles: this.roles,
      registrationDate: this.registrationDate,
      numberOfBands: this.numberOfBands,
      numberOfBranches: this.numberOfBranches,
      lastActiveDate: this.lastActiveDate,
      numberOfJobPosts: this.numberOfJobPosts,
      totalInstantHires: this.totalInstantHires,
      totalInterviews: this.totalInterviews,
      spentOnHiring: this.spentOnHiring,
      usedFreeTrial: this.usedFreeTrial,
      previousPlansPurchases: this.previousPlansPurchases,
      
      // Business structure
      brands: this.brands,
      locations: this.locations,
      teamMembers: this.teamMembers,
      
      // Enhanced Company Analytics
      companyAnalytics: this.companyAnalytics,
      industryDetails: this.industryDetails,
      organizationStructure: this.organizationStructure,
      brandPortfolio: this.brandPortfolio,
      
      // Complete subscription details with pricing model
      subscriptionPlan: this.subscriptionPlan,
      subscriptionStatus: this.subscriptionStatus,
      pricingDetails: this.pricingDetails,
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
      analyticsData: this.analyticsData,
      
      // Performance Dashboard
      performanceDashboard: this.performanceDashboard,
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
      
      // Real-time trial status
      trialStatus: this.getTrialStatus(),
      
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Company;