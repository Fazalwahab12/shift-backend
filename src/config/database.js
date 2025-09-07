const firebaseConfig = require('./firebase');

/**
 * Database Collections Configuration
 */
const COLLECTIONS = {
  USERS: 'users',
  SEEKERS: 'seekers', 
  COMPANIES: 'companies',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  JOB_APPLICATIONS: 'job_applications',
  APPLICATION_HISTORY: 'application_history',
  INTERVIEWS: 'interviews',
  INSTANT_HIRES: 'instant_hires',
  CHATS: 'chats',
  MESSAGES: 'messages',
  PHONE_REGISTRATIONS: 'phone_registrations',
  ONBOARDING_DATA: 'onboarding_data',
  INDUSTRIES: 'industries',
  ROLES: 'roles',
  NOTIFICATIONS: 'notifications',
  EMAIL_HISTORY: 'email_history',
  SAVED_JOBS: 'savedJobs',
  SAVED_SEEKERS: 'savedSeekers',
  BRAND_FOLLOWS: 'brand_follows'
};

/**
 * Database Service Class
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      const firebase = await firebaseConfig.initialize();
      this.db = firebase.db;
      this.isInitialized = true;
      
      // Set Firebase globally so other services can access Storage
      global.firebase = firebase;
      
      console.log('📊 Database service initialized successfully');
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get collection reference
   */
  collection(collectionName) {
    return this.getDb().collection(collectionName);
  }

  /**
   * Create document with auto-generated ID
   */
  async create(collectionName, data) {
    try {
      const docRef = await this.collection(collectionName).add({
        ...data,
        createdAt: firebaseConfig.getServerTimestamp(),
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      
      return {
        ...data,
        id: docRef.id
      };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create document with custom ID
   */
  async createWithId(collectionName, docId, data) {
    try {
      await this.collection(collectionName).doc(docId).set({
        ...data,
        createdAt: firebaseConfig.getServerTimestamp(),
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      
      return {
        id: docId,
        ...data
      };
    } catch (error) {
      console.error(`Error creating document with ID in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getById(collectionName, docId) {
    try {
      const doc = await this.collection(collectionName).doc(docId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async update(collectionName, docId, data) {
    try {
      await this.collection(collectionName).doc(docId).update({
        ...data,
        updatedAt: firebaseConfig.getServerTimestamp()
      });
      
      return await this.getById(collectionName, docId);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(collectionName, docId) {
    try {
      await this.collection(collectionName).doc(docId).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Query documents with filters
   */
  async query(collectionName, filters = [], orderBy = null, limit = null) {
    try {
      console.log(`🔍 DB Query - Collection: ${collectionName}, Filters:`, filters);
      
      let query = this.collection(collectionName);
      
      // Apply filters
      filters.forEach(filter => {
        console.log(`🔍 Applying filter: ${filter.field} ${filter.operator} ${filter.value}`);
        query = query.where(filter.field, filter.operator, filter.value);
      });
      
      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
      }
      
      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      console.log(`🔍 DB Query Result: Found ${snapshot.docs.length} documents`);
      
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id  // Ensure document ID always takes precedence
        };
      });
      
      // Show first result for debugging
      if (results.length > 0 && collectionName === 'jobs') {
        console.log(`🔍 First job result:`, {
          id: results[0].id,
          jobId: results[0].jobId,
          companyId: results[0].companyId,
          userId: results[0].userId,
          isActive: results[0].isActive,
          jobStatus: results[0].jobStatus
        });
      }
      
      // Show first result for job applications debugging
      if (results.length > 0 && collectionName === 'job_applications') {
        console.log(`🔍 First job application result:`, {
          id: results[0].id,
          applicationId: results[0].applicationId,
          jobId: results[0].jobId,
          seekerId: results[0].seekerId,
          status: results[0].status
        });
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error querying ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async exists(collectionName, docId) {
    try {
      const doc = await this.collection(collectionName).doc(docId).get();
      return doc.exists;
    } catch (error) {
      console.error(`Error checking document existence in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get collection size
   */
  async getCollectionSize(collectionName) {
    try {
      const snapshot = await this.collection(collectionName).get();
      return snapshot.size;
    } catch (error) {
      console.error(`Error getting collection size for ${collectionName}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = {
  databaseService,
  COLLECTIONS,
  firebaseConfig
};