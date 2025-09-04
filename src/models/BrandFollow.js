const { databaseService, COLLECTIONS } = require('../config/database');

/**
 * Brand Follow Model
 * Handles seeker's brand following functionality
 */
class BrandFollow {
  constructor(data = {}) {
    this.id = data.id || null;
    
    // Core follow data
    this.seekerId = data.seekerId || null;
    this.brandId = data.brandId || null;
    this.companyId = data.companyId || null;
    this.brandName = data.brandName || null;
    this.companyName = data.companyName || null;
    
    // Timestamps
    this.followedAt = data.followedAt || new Date().toISOString();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Create a new brand follow record
   */
  static async create(followData) {
    try {
      // Validate required fields
      if (!followData.seekerId || !followData.brandId) {
        throw new Error('Seeker ID and Brand ID are required');
      }

      // Check if already following
      const existingFollow = await BrandFollow.findBySeekerandBrand(
        followData.seekerId, 
        followData.brandId
      );

      if (existingFollow) {
        throw new Error('Already following this brand');
      }

      // Create new follow record
      const brandFollow = new BrandFollow(followData);
      const followId = await databaseService.create(COLLECTIONS.BRAND_FOLLOWS, brandFollow.toJSON());
      brandFollow.id = followId;

      console.log(`✅ Brand follow created: Seeker ${followData.seekerId} followed brand ${followData.brandId}`);
      return brandFollow;

    } catch (error) {
      console.error('Error creating brand follow:', error);
      throw error;
    }
  }

  /**
   * Find follow record by seeker and brand
   */
  static async findBySeekerandBrand(seekerId, brandId) {
    try {
      const filters = [
        { field: 'seekerId', operator: '==', value: seekerId },
        { field: 'brandId', operator: '==', value: brandId }
      ];

      const follows = await databaseService.query(
        COLLECTIONS.BRAND_FOLLOWS,
        filters,
        null,
        1
      );

      return follows.length > 0 ? new BrandFollow(follows[0]) : null;
    } catch (error) {
      console.error('Error finding brand follow:', error);
      throw error;
    }
  }

  /**
   * Get all brands followed by a seeker
   */
  static async findBySeekerId(seekerId, options = {}) {
    try {
      const filters = [
        { field: 'seekerId', operator: '==', value: seekerId }
      ];

      const follows = await databaseService.query(
        COLLECTIONS.BRAND_FOLLOWS,
        filters,
        { field: 'followedAt', direction: 'desc' },
        options.limit || 50,
        options.offset || 0
      );

      return follows.map(follow => new BrandFollow(follow));
    } catch (error) {
      console.error('Error getting followed brands:', error);
      throw error;
    }
  }

  /**
   * Get all seekers following a brand
   */
  static async findByBrandId(brandId, options = {}) {
    try {
      const filters = [
        { field: 'brandId', operator: '==', value: brandId }
      ];

      const follows = await databaseService.query(
        COLLECTIONS.BRAND_FOLLOWS,
        filters,
        { field: 'followedAt', direction: 'desc' },
        options.limit || 50,
        options.offset || 0
      );

      return follows.map(follow => new BrandFollow(follow));
    } catch (error) {
      console.error('Error getting brand followers:', error);
      throw error;
    }
  }

  /**
   * Unfollow a brand
   */
  static async unfollow(seekerId, brandId) {
    try {
      const existingFollow = await BrandFollow.findBySeekerandBrand(seekerId, brandId);
      
      if (!existingFollow) {
        throw new Error('Not following this brand');
      }

      await databaseService.delete(COLLECTIONS.BRAND_FOLLOWS, existingFollow.id);
      console.log(`✅ Brand unfollowed: Seeker ${seekerId} unfollowed brand ${brandId}`);
      
      return true;
    } catch (error) {
      console.error('Error unfollowing brand:', error);
      throw error;
    }
  }

  /**
   * Get follow count for a brand
   */
  static async getFollowCount(brandId) {
    try {
      const filters = [
        { field: 'brandId', operator: '==', value: brandId }
      ];

      const follows = await databaseService.query(
        COLLECTIONS.BRAND_FOLLOWS,
        filters
      );

      return follows.length;
    } catch (error) {
      console.error('Error getting follow count:', error);
      return 0;
    }
  }

  /**
   * Check if seeker is following a brand
   */
  static async isFollowing(seekerId, brandId) {
    try {
      const follow = await BrandFollow.findBySeekerandBrand(seekerId, brandId);
      return !!follow;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get follow statistics for a seeker
   */
  static async getSeekerFollowStats(seekerId) {
    try {
      const filters = [
        { field: 'seekerId', operator: '==', value: seekerId }
      ];

      const follows = await databaseService.query(COLLECTIONS.BRAND_FOLLOWS, filters);
      
      return {
        totalFollowing: follows.length,
        recentFollows: follows.filter(follow => {
          const followDate = new Date(follow.followedAt);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return followDate > sevenDaysAgo;
        }).length
      };
    } catch (error) {
      console.error('Error getting seeker follow stats:', error);
      return { totalFollowing: 0, recentFollows: 0 };
    }
  }

  /**
   * Update follow record
   */
  async update(updateData) {
    try {
      const updatedData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await databaseService.update(COLLECTIONS.BRAND_FOLLOWS, this.id, updatedData);
      
      // Update local instance
      Object.assign(this, updatedData);
      
      console.log(`✅ Brand follow updated: ${this.id}`);
      return this;
    } catch (error) {
      console.error('Error updating brand follow:', error);
      throw error;
    }
  }

  /**
   * Delete follow record
   */
  async delete() {
    try {
      await databaseService.delete(COLLECTIONS.BRAND_FOLLOWS, this.id);
      console.log(`✅ Brand follow deleted: ${this.id}`);
      return true;
    } catch (error) {
      console.error('Error deleting brand follow:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON for database storage
   */
  toJSON() {
    return {
      seekerId: this.seekerId,
      brandId: this.brandId,
      companyId: this.companyId,
      brandName: this.brandName,
      companyName: this.companyName,
      followedAt: this.followedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to public JSON (for API responses)
   */
  toPublicJSON() {
    return {
      id: this.id,
      brandId: this.brandId,
      brandName: this.brandName,
      companyId: this.companyId,
      companyName: this.companyName,
      followedAt: this.followedAt,
      isActive: true
    };
  }
}

module.exports = BrandFollow;