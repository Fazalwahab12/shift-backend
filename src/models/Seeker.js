const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Job Seeker Profile Model
 */
class Seeker {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    
    // Personal Information (Step 1)
    this.firstName = data.firstName || null;
    this.lastName = data.lastName || null;
    this.email = data.email || null;
    this.dateOfBirth = data.dateOfBirth || null;
    this.gender = data.gender || null; // 'male', 'female', 'other'
    this.nationality = data.nationality || 'Omani';
    this.profilePhoto = data.profilePhoto || null;
    
    // Location Information (Step 2)
    this.address = data.address || {};
    this.wilayat = data.wilayat || null; // Oman administrative division
    this.governorate = data.governorate || null;
    this.preferredWorkLocation = data.preferredWorkLocation || [];
    this.transportationAvailable = data.transportationAvailable || false;
    
    // Professional Information (Step 3)
    this.experienceLevel = data.experienceLevel || null; // 'entry', 'intermediate', 'senior'
    this.industries = data.industries || []; // Array of industry preferences
    this.roles = data.roles || []; // Array of role preferences
    this.skills = data.skills || [];
    this.languages = data.languages || []; // Array of {language, proficiency}
    
    // Education (Step 4)
    this.education = data.education || []; // Array of education records
    this.certifications = data.certifications || [];
    
    // Work Preferences (Step 5)
    this.employmentType = data.employmentType || []; // 'full-time', 'part-time', 'contract', 'shift'
    this.availabilityShifts = data.availabilityShifts || {}; // {morning: true, afternoon: false, night: true}
    this.availableDays = data.availableDays || {}; // {monday: true, tuesday: false, ...}
    this.expectedSalary = data.expectedSalary || {};
    this.immediateAvailability = data.immediateAvailability || false;
    this.availableStartDate = data.availableStartDate || null;
    
    // CV and Documents
    this.cvFile = data.cvFile || null;
    this.documents = data.documents || []; // Array of document URLs
    
    // Profile Status
    this.profileCompletionStep = data.profileCompletionStep || 1;
    this.isProfileComplete = data.isProfileComplete || false;
    this.isVerified = data.isVerified || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    
    // Metadata
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  /**
   * Create new seeker profile
   */
  static async create(userId, seekerData) {
    try {
      const seeker = new Seeker({
        userId: userId,
        ...seekerData
      });

      const result = await databaseService.create(COLLECTIONS.SEEKERS, seeker.toJSON());
      return new Seeker({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating seeker profile:', error);
      throw error;
    }
  }

  /**
   * Create seeker profile from onboarding data
   */
  static async createFromOnboarding(userId, seekerData, onboardingData) {
    try {
      // Inherit data from onboarding
      const profileData = {
        userId: userId,
        experienceLevel: onboardingData.experienceLevel,
        industries: onboardingData.selectedIndustries,
        roles: onboardingData.selectedRoles,
        ...seekerData
      };

      const seeker = new Seeker(profileData);
      const result = await databaseService.create(COLLECTIONS.SEEKERS, seeker.toJSON());
      return new Seeker({ id: result.id, ...result });
    } catch (error) {
      console.error('Error creating seeker profile from onboarding:', error);
      throw error;
    }
  }

  /**
   * Find seeker by user ID
   */
  static async findByUserId(userId) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'userId', operator: '==', value: userId }
      ]);

      return seekers.length > 0 ? new Seeker(seekers[0]) : null;
    } catch (error) {
      console.error('Error finding seeker by user ID:', error);
      throw error;
    }
  }

  /**
   * Find seeker by ID
   */
  static async findById(seekerId) {
    try {
      const seekerData = await databaseService.getById(COLLECTIONS.SEEKERS, seekerId);
      return seekerData ? new Seeker(seekerData) : null;
    } catch (error) {
      console.error('Error finding seeker by ID:', error);
      throw error;
    }
  }

  /**
   * Update seeker profile
   */
  async update(updateData) {
    try {
      if (!this.id) {
        throw new Error('Cannot update seeker without ID');
      }

      const updatedSeeker = await databaseService.update(COLLECTIONS.SEEKERS, this.id, updateData);
      Object.assign(this, updatedSeeker);
      return this;
    } catch (error) {
      console.error('Error updating seeker:', error);
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

      // Mark profile as complete if step 5 is reached
      if (step >= 5) {
        updateData.isProfileComplete = true;
      }

      return await this.update(updateData);
    } catch (error) {
      console.error('Error updating profile step:', error);
      throw error;
    }
  }

  /**
   * Search seekers by criteria
   */
  static async search(searchCriteria = {}) {
    try {
      const filters = [];
      
      // Add search filters
      if (searchCriteria.industries && searchCriteria.industries.length > 0) {
        filters.push({ field: 'industries', operator: 'array-contains-any', value: searchCriteria.industries });
      }
      
      if (searchCriteria.roles && searchCriteria.roles.length > 0) {
        filters.push({ field: 'roles', operator: 'array-contains-any', value: searchCriteria.roles });
      }
      
      if (searchCriteria.experienceLevel) {
        filters.push({ field: 'experienceLevel', operator: '==', value: searchCriteria.experienceLevel });
      }
      
      if (searchCriteria.governorate) {
        filters.push({ field: 'governorate', operator: '==', value: searchCriteria.governorate });
      }

      // Only show active and complete profiles
      filters.push({ field: 'isActive', operator: '==', value: true });
      filters.push({ field: 'isProfileComplete', operator: '==', value: true });

      const seekers = await databaseService.query(
        COLLECTIONS.SEEKERS,
        filters,
        { field: 'updatedAt', direction: 'desc' },
        searchCriteria.limit || 50
      );

      return seekers.map(seekerData => new Seeker(seekerData));
    } catch (error) {
      console.error('Error searching seekers:', error);
      throw error;
    }
  }

  /**
   * Get seekers by location
   */
  static async getByLocation(governorate, limit = 20) {
    try {
      const seekers = await databaseService.query(COLLECTIONS.SEEKERS, [
        { field: 'governorate', operator: '==', value: governorate },
        { field: 'isActive', operator: '==', value: true },
        { field: 'isProfileComplete', operator: '==', value: true }
      ], 
      { field: 'updatedAt', direction: 'desc' },
      limit);

      return seekers.map(seekerData => new Seeker(seekerData));
    } catch (error) {
      console.error('Error getting seekers by location:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  getProfileCompletionPercentage() {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'dateOfBirth', 'gender',
      'governorate', 'experienceLevel', 'industries', 'roles'
    ];
    
    let completedFields = 0;
    requiredFields.forEach(field => {
      if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : true)) {
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
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      nationality: this.nationality,
      profilePhoto: this.profilePhoto,
      address: this.address,
      wilayat: this.wilayat,
      governorate: this.governorate,
      preferredWorkLocation: this.preferredWorkLocation,
      transportationAvailable: this.transportationAvailable,
      experienceLevel: this.experienceLevel,
      industries: this.industries,
      roles: this.roles,
      skills: this.skills,
      languages: this.languages,
      education: this.education,
      certifications: this.certifications,
      employmentType: this.employmentType,
      availabilityShifts: this.availabilityShifts,
      availableDays: this.availableDays,
      expectedSalary: this.expectedSalary,
      immediateAvailability: this.immediateAvailability,
      availableStartDate: this.availableStartDate,
      cvFile: this.cvFile,
      documents: this.documents,
      profileCompletionStep: this.profileCompletionStep,
      isProfileComplete: this.isProfileComplete,
      isVerified: this.isVerified,
      isActive: this.isActive
    };
  }

  /**
   * Convert to public JSON (safe for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePhoto: this.profilePhoto,
      governorate: this.governorate,
      experienceLevel: this.experienceLevel,
      industries: this.industries,
      roles: this.roles,
      skills: this.skills,
      languages: this.languages,
      employmentType: this.employmentType,
      availabilityShifts: this.availabilityShifts,
      isVerified: this.isVerified,
      profileCompletionPercentage: this.getProfileCompletionPercentage(),
      createdAt: this.createdAt
    };
  }
}

module.exports = Seeker;