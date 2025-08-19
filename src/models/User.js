const { databaseService, COLLECTIONS } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * User Model for phone registration and basic user management
 */
class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.phoneNumber = data.phoneNumber || null;
    this.countryCode = data.countryCode || '+968'; // Default to Oman
    this.userType = data.userType || null; // 'seeker' or 'company'
    this.isPhoneVerified = data.isPhoneVerified || false;
    this.onboardingCompleted = data.onboardingCompleted || false;
    this.profileCompleted = data.profileCompleted || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
    this.lastLoginAt = data.lastLoginAt || null;
  }

  /**
   * Create new user with phone number
   */
  static async createWithPhone(phoneData) {
    try {
      // Clean the country code - remove any leading/trailing spaces
      const cleanCountryCode = (phoneData.countryCode || '+968').trim();
      
      const userData = new User({
        phoneNumber: phoneData.phoneNumber,
        countryCode: cleanCountryCode,
        userType: phoneData.userType,
        isPhoneVerified: false // Initially false, will be verified via OTP
      });

      const result = await databaseService.create(COLLECTIONS.USERS, userData.toJSON());
      return new User({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating user with phone:', error);
      throw error;
    }
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phoneNumber, countryCode = '+968') {
    try {
      // Clean the country code - remove any leading/trailing spaces
      const cleanCountryCode = countryCode.trim();
      
      console.log('🔍 User.findByPhone called with:', { phoneNumber, countryCode: cleanCountryCode });
      
      const users = await databaseService.query(COLLECTIONS.USERS, [
        { field: 'phoneNumber', operator: '==', value: phoneNumber },
        { field: 'countryCode', operator: '==', value: cleanCountryCode }
      ]);

      console.log('🔍 Query result:', { 
        usersFound: users.length,
        users: users.map(u => ({ id: u.id, phoneNumber: u.phoneNumber, countryCode: u.countryCode }))
      });

      return users.length > 0 ? new User(users[0]) : null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    try {
      const userData = await databaseService.getById(COLLECTIONS.USERS, userId);
      return userData ? new User(userData) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user data
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update user without ID');
      }

      const updatedUser = await databaseService.update(COLLECTIONS.USERS, this.id, updateData);
      Object.assign(this, updatedUser);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding() {
    return await this.update({ 
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Mark profile as completed
   */
  async completeProfile() {
    return await this.update({ 
      profileCompleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin() {
    return await this.update({ 
      lastLoginAt: new Date().toISOString()
    });
  }

  /**
   * Deactivate user account
   */
  async deactivate() {
    return await this.update({ 
      isActive: false,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Check if user exists by phone
   */
  static async phoneExists(phoneNumber, countryCode = '+968') {
    try {
      // Clean the country code - remove any leading/trailing spaces
      const cleanCountryCode = countryCode.trim();
      const user = await User.findByPhone(phoneNumber, cleanCountryCode);
      return user !== null;
    } catch (error) {
      console.error('Error checking phone existence:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAll(page = 1, limit = 50, userType = null) {
    try {
      const filters = [];
      if (userType) {
        filters.push({ field: 'userType', operator: '==', value: userType });
      }

      // Remove orderBy to avoid index requirement
      const users = await databaseService.query(
        COLLECTIONS.USERS, 
        filters,
        null, // No ordering to avoid composite index requirement
        limit
      );

      return users.map(userData => new User(userData));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics without requiring complex indexes
   */
  static async getStats(userType = null) {
    try {
      // Get all users (without ordering to avoid index issues)
      const allUsers = await User.getAll(1, 1000, userType);
      
      const verifiedUsers = allUsers.filter(user => user.isPhoneVerified);
      const onboardedUsers = allUsers.filter(user => user.onboardingCompleted);
      const completedProfiles = allUsers.filter(user => user.profileCompleted);

      const stats = {
        total: allUsers.length,
        verified: verifiedUsers.length,
        onboarded: onboardedUsers.length,
        profilesCompleted: completedProfiles.length,
        verificationRate: allUsers.length > 0 ? ((verifiedUsers.length / allUsers.length) * 100).toFixed(2) : 0,
        onboardingRate: allUsers.length > 0 ? ((onboardedUsers.length / allUsers.length) * 100).toFixed(2) : 0,
        completionRate: allUsers.length > 0 ? ((completedProfiles.length / allUsers.length) * 100).toFixed(2) : 0
      };

      if (userType) {
        stats.userType = userType;
        stats.filterApplied = `Filtered by userType: ${userType}`;
      }

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      phoneNumber: this.phoneNumber,
      countryCode: this.countryCode,
      userType: this.userType,
      isPhoneVerified: this.isPhoneVerified,
      onboardingCompleted: this.onboardingCompleted,
      profileCompleted: this.profileCompleted,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt
    };
  }

  /**
   * Convert to public JSON (without sensitive data)
   */
  toPublicJSON() {
    return {
      id: this.id,
      phoneNumber: this.phoneNumber ? this.phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : null, // Mask phone number
      countryCode: this.countryCode,
      userType: this.userType,
      onboardingCompleted: this.onboardingCompleted,
      profileCompleted: this.profileCompleted,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

module.exports = User;