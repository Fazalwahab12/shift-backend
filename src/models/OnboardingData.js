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
    this.hiringNeeds = data.hiringNeeds || null; // For companies
    this.typicalHiringRoles = data.typicalHiringRoles || []; // For companies
    
    // Additional preferences
    this.workLocationPreference = data.workLocationPreference || [];
    this.salaryExpectations = data.salaryExpectations || {};
    this.preferredSocialMedia = data.preferredSocialMedia || [];
    
    // Removed completion tracking - onboarding goes directly to profile creation
    
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
   * Add social media preference
   */
  async addSocialMediaPreference(socialMedia) {
    try {
      if (!this.preferredSocialMedia.includes(socialMedia)) {
        const updatedSocialMedia = [...this.preferredSocialMedia, socialMedia];
        return await this.update({ preferredSocialMedia: updatedSocialMedia });
      }
      return this;
    } catch (error) {
      console.error('Error adding social media preference:', error);
      throw error;
    }
  }

  /**
   * Remove social media preference
   */
  async removeSocialMediaPreference(socialMedia) {
    try {
      const updatedSocialMedia = this.preferredSocialMedia.filter(media => media !== socialMedia);
      return await this.update({ preferredSocialMedia: updatedSocialMedia });
    } catch (error) {
      console.error('Error removing social media preference:', error);
      throw error;
    }
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
      hiringNeeds: this.hiringNeeds,
      typicalHiringRoles: this.typicalHiringRoles,
      workLocationPreference: this.workLocationPreference,
      salaryExpectations: this.salaryExpectations,
      preferredSocialMedia: this.preferredSocialMedia
    };
  }

  /**
   * Convert to public JSON (safe for API responses) - only essential fields
   */
  toPublicJSON() {
    const result = {
      id: this.id,
      userId: this.userId,
      userType: this.userType,
      selectedIndustries: this.selectedIndustries,
      selectedRoles: this.selectedRoles,
      preferredSocialMedia: this.preferredSocialMedia
    };

    // Only add company-specific fields if userType is company
    if (this.userType === 'company') {
      result.hiringNeeds = this.hiringNeeds;
      result.typicalHiringRoles = this.typicalHiringRoles;
    }

    return result;
  }
}

module.exports = OnboardingData;