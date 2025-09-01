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
  CHATS: 'chats',
  MESSAGES: 'messages',
  PHONE_REGISTRATIONS: 'phone_registrations',
  ONBOARDING_DATA: 'onboarding_data',
  INDUSTRIES: 'industries',
  ROLES: 'roles',
  NOTIFICATIONS: 'notifications'
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
      let query = this.collection(collectionName);
      
      // Apply filters
      filters.forEach(filter => {
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
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
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