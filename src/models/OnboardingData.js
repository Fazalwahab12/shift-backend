const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Onboarding Data Model for storing user preferences during onboarding
 */
class OnboardingData {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    this.userType = data.userType || null; // 'seeker' or 'company'
    
    // Industry and Role Preferences
    this.selectedIndustries = data.selectedIndustries || [];
    this.selectedRoles = data.selectedRoles || [];
    this.experienceLevel = data.experienceLevel || null; // For seekers
    this.hiringNeeds = data.hiringNeeds || null; // For companies
    this.typicalHiringRoles = data.typicalHiringRoles || []; // For companies
    
    // How did you hear about us
    this.referralSource = data.referralSource || null;
    this.referralDetails = data.referralDetails || null;
    
    // Additional preferences
    this.workLocationPreference = data.workLocationPreference || [];
    this.shiftPreferences = data.shiftPreferences || [];
    this.salaryExpectations = data.salaryExpectations || {};
    
    // Completion status
    this.isCompleted = data.isCompleted || false;
    this.completedSteps = data.completedSteps || [];
    
    // Metadata
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Create new onboarding data
   */
  static async create(userId, userType, onboardingData) {
    try {
      const data = new OnboardingData({
        userId: userId,
        userType: userType,
        ...onboardingData
      });

      const result = await databaseService.create(COLLECTIONS.ONBOARDING_DATA, data.toJSON());
      return new OnboardingData({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating onboarding data:', error);
      throw error;
    }
  }

  /**
   * Find onboarding data by user ID
   */
  static async findByUserId(userId) {
    try {
      const data = await databaseService.query(COLLECTIONS.ONBOARDING_DATA, [
        { field: 'userId', operator: '==', value: userId }
      ]);

      return data.length > 0 ? new OnboardingData(data[0]) : null;
    } catch (error) {
      console.error('Error finding onboarding data by user ID:', error);
      throw error;
    }
  }

  /**
   * Update onboarding data
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update onboarding data without ID');
      }

      const updatedData = await databaseService.update(COLLECTIONS.ONBOARDING_DATA, this.id, updateData);
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating onboarding data:', error);
      throw error;
    }
  }

  /**
   * Add industry preference
   */
  async addIndustry(industry) {
    try {
      if (!this.selectedIndustries.includes(industry)) {
        const updatedIndustries = [...this.selectedIndustries, industry];
        return await this.update({ selectedIndustries: updatedIndustries });
      }
      return this;
    } catch (error) {
      console.error('Error adding industry:', error);
      throw error;
    }
  }

  /**
   * Remove industry preference
   */
  async removeIndustry(industry) {
    try {
      const updatedIndustries = this.selectedIndustries.filter(ind => ind !== industry);
      return await this.update({ selectedIndustries: updatedIndustries });
    } catch (error) {
      console.error('Error removing industry:', error);
      throw error;
    }
  }

  /**
   * Add role preference
   */
  async addRole(role) {
    try {
      if (!this.selectedRoles.includes(role)) {
        const updatedRoles = [...this.selectedRoles, role];
        return await this.update({ selectedRoles: updatedRoles });
      }
      return this;
    } catch (error) {
      console.error('Error adding role:', error);
      throw error;
    }
  }

  /**
   * Remove role preference
   */
  async removeRole(role) {
    try {
      const updatedRoles = this.selectedRoles.filter(r => r !== role);
      return await this.update({ selectedRoles: updatedRoles });
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }

  /**
   * Mark step as completed
   */
  async completeStep(stepName) {
    try {
      if (!this.completedSteps.includes(stepName)) {
        const updatedSteps = [...this.completedSteps, stepName];
        const isCompleted = this.checkIfAllStepsCompleted(updatedSteps);
        
        return await this.update({ 
          completedSteps: updatedSteps,
          isCompleted: isCompleted
        });
      }
      return this;
    } catch (error) {
      console.error('Error completing step:', error);
      throw error;
    }
  }

  /**
   * Check if all required steps are completed
   */
  checkIfAllStepsCompleted(steps = this.completedSteps) {
    const requiredSteps = this.userType === 'seeker' 
      ? ['industry_selection', 'role_selection', 'experience_level', 'referral_source']
      : ['industry_selection', 'hiring_needs', 'referral_source'];
    
    return requiredSteps.every(step => steps.includes(step));
  }

  /**
   * Get onboarding statistics
   */
  static async getStats(userType = null) {
    try {
      const filters = [];
      if (userType) {
        filters.push({ field: 'userType', operator: '==', value: userType });
      }

      const allData = await databaseService.query(COLLECTIONS.ONBOARDING_DATA, filters);
      const completedData = await databaseService.query(COLLECTIONS.ONBOARDING_DATA, [
        ...filters,
        { field: 'isCompleted', operator: '==', value: true }
      ]);

      return {
        totalOnboarding: allData.length,
        completedOnboarding: completedData.length,
        completionRate: allData.length > 0 ? (completedData.length / allData.length * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error getting onboarding stats:', error);
      throw error;
    }
  }

  /**
   * Get popular industries
   */
  static async getPopularIndustries(userType = null, limit = 10) {
    try {
      const filters = [];
      if (userType) {
        filters.push({ field: 'userType', operator: '==', value: userType });
      }

      const data = await databaseService.query(COLLECTIONS.ONBOARDING_DATA, filters);
      
      // Count industry occurrences
      const industryCounts = {};
      data.forEach(item => {
        if (item.selectedIndustries) {
          item.selectedIndustries.forEach(industry => {
            industryCounts[industry] = (industryCounts[industry] || 0) + 1;
          });
        }
      });

      // Sort by count and return top industries
      return Object.entries(industryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([industry, count]) => ({ industry, count }));
    } catch (error) {
      console.error('Error getting popular industries:', error);
      throw error;
    }
  }

  /**
   * Get popular roles
   */
  static async getPopularRoles(userType = null, limit = 10) {
    try {
      const filters = [];
      if (userType) {
        filters.push({ field: 'userType', operator: '==', value: userType });
      }

      const data = await databaseService.query(COLLECTIONS.ONBOARDING_DATA, filters);
      
      // Count role occurrences
      const roleCounts = {};
      data.forEach(item => {
        if (item.selectedRoles) {
          item.selectedRoles.forEach(role => {
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          });
        }
      });

      // Sort by count and return top roles
      return Object.entries(roleCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([role, count]) => ({ role, count }));
    } catch (error) {
      console.error('Error getting popular roles:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      userId: this.userId,
      userType: this.userType,
      selectedIndustries: this.selectedIndustries,
      selectedRoles: this.selectedRoles,
      experienceLevel: this.experienceLevel,
      hiringNeeds: this.hiringNeeds,
      typicalHiringRoles: this.typicalHiringRoles,
      referralSource: this.referralSource,
      referralDetails: this.referralDetails,
      workLocationPreference: this.workLocationPreference,
      shiftPreferences: this.shiftPreferences,
      salaryExpectations: this.salaryExpectations,
      isCompleted: this.isCompleted,
      completedSteps: this.completedSteps
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      userType: this.userType,
      selectedIndustries: this.selectedIndustries,
      selectedRoles: this.selectedRoles,
      experienceLevel: this.experienceLevel,
      hiringNeeds: this.hiringNeeds,
      typicalHiringRoles: this.typicalHiringRoles,
      referralSource: this.referralSource,
      referralDetails: this.referralDetails,
      workLocationPreference: this.workLocationPreference,
      shiftPreferences: this.shiftPreferences,
      isCompleted: this.isCompleted,
      completedSteps: this.completedSteps,
      completionPercentage: Math.round((this.completedSteps.length / (this.userType === 'seeker' ? 4 : 3)) * 100),
      createdAt: this.createdAt
    };
  }
}

module.exports = OnboardingData;