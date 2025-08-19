const admin = require('firebase-admin');
const path = require('path');

class FirebaseConfig {
  constructor() {
    this.db = null;
    this.auth = null;
    this.storage = null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    try {
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        // For production, use service account key file
        // For development, you can use the Firebase emulator or service account
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : require('../../config/firebase-service-account.json'); // Place your service account file here

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://your-project-id-default-rtdb.firebaseio.com/',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'your-project-id.appspot.com'
        });

        console.log('🔥 Firebase Admin SDK initialized successfully');
      }

      // Initialize services
      this.db = admin.firestore();
      this.auth = admin.auth();
      this.storage = admin.storage();

      // Configure Firestore settings
      this.db.settings({
        ignoreUndefinedProperties: true
      });

      return {
        db: this.db,
        auth: this.auth,
        storage: this.storage,
        admin
      };
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase: ' + error.message);
    }
  }

  /**
   * Get Firestore database instance
   */
  getDb() {
    if (!this.db) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    if (!this.auth) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  /**
   * Get Firebase Storage instance
   */
  getStorage() {
    if (!this.storage) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Get array union helper
   */
  arrayUnion(...elements) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  /**
   * Get array remove helper
   */
  arrayRemove(...elements) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  /**
   * Get increment helper
   */
  increment(value = 1) {
    return admin.firestore.FieldValue.increment(value);
  }
}

// Create singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;